from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

log = logging.getLogger("olake-assistant.loader")

KNOWLEDGE_DIR = Path(os.environ.get("KNOWLEDGE_DIR") or (Path(__file__).resolve().parent / "knowledge"))
RUNTIME_KNOWLEDGE_DIR = Path(os.environ.get("RUNTIME_KNOWLEDGE_DIR") or "/tmp/olake_knowledge")
FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
HEADING_SPLIT_RE = re.compile(r"\n(?=#{1,3} )")

# Official OLake Repositories to track for releases and deployed updates
OLAKE_REPOS = [
    {"repo": "datazip-inc/olake", "name": "OLake Go Core", "url": "https://github.com/datazip-inc/olake/releases"},
    {"repo": "datazip-inc/olake-fusion", "name": "OLake Fusion", "url": "https://github.com/datazip-inc/olake-fusion/releases"},
    {"repo": "datazip-inc/olake-helm", "name": "OLake Helm Chart", "url": "https://github.com/datazip-inc/olake-helm/releases"},
    {"repo": "datazip-inc/olake-ui", "name": "OLake Management UI", "url": "https://github.com/datazip-inc/olake-ui/releases"},
]


@dataclass
class Chunk:
    id: str
    title: str
    url: str
    source: str
    topics: list[str]
    heading: str
    text: str
    tokens: list[str] = field(default_factory=list)


def _parse_frontmatter(raw: str) -> tuple[dict[str, str], str]:
    match = FRONTMATTER_RE.match(raw)
    meta: dict[str, str] = {}
    body = raw
    if match:
        for line in match.group(1).splitlines():
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip()
        body = raw[match.end() :]
    return meta, body.strip()


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9_+#./-]{2,}", text.lower())


def _chunk_markdown(body: str, title: str) -> list[tuple[str, str]]:
    pieces = HEADING_SPLIT_RE.split("\n" + body)
    chunks: list[tuple[str, str]] = []
    preamble: list[str] = []
    for piece in pieces:
        piece = piece.strip()
        if not piece:
            continue
        if piece.startswith("#"):
            first_line, _, rest = piece.partition("\n")
            heading = first_line.lstrip("#").strip()
            text = f"{title}\n{heading}\n{rest.strip()}".strip()
            if len(text) > 80:
                chunks.append((heading, text))
        else:
            preamble.append(piece)
    if preamble:
        text = f"{title}\n" + "\n\n".join(preamble)
        chunks.insert(0, (title, text))
    if not chunks:
        chunks.append((title, f"{title}\n{body}"))
    return chunks


def get_directory_hash(directory: Path | None = None) -> str:
    """Computes a lightweight hash of all markdown files and their mtimes.

    Allows sub-millisecond staleness checks to auto-detect new or edited files.
    """
    root = directory or KNOWLEDGE_DIR
    roots = [root]
    if directory is None and RUNTIME_KNOWLEDGE_DIR.exists() and RUNTIME_KNOWLEDGE_DIR != root:
        roots.append(RUNTIME_KNOWLEDGE_DIR)

    state_sig = []
    for r in roots:
        if not r.exists():
            continue
        for path in sorted(r.glob("*.md")):
            try:
                stat = path.stat()
                state_sig.append(f"{path.name}:{stat.st_mtime}:{stat.st_size}")
            except OSError:
                continue
    return hashlib.md5(";".join(state_sig).encode()).hexdigest()


def load_chunks(directory: Path | None = None) -> list[Chunk]:
    """Loads and chunks all markdown files in the knowledge directory."""
    root = directory or KNOWLEDGE_DIR
    if not root.exists():
        root.mkdir(parents=True, exist_ok=True)

    roots = [root]
    if directory is None and RUNTIME_KNOWLEDGE_DIR.exists() and RUNTIME_KNOWLEDGE_DIR != root:
        roots.append(RUNTIME_KNOWLEDGE_DIR)

    chunks: list[Chunk] = []
    seen_files: set[str] = set()

    # Process reverse roots so runtime/newer overrides take priority if same file name
    all_files: list[Path] = []
    for r in reversed(roots):
        if not r.exists():
            continue
        for p in sorted(r.glob("*.md")):
            if p.name not in seen_files:
                seen_files.add(p.name)
                all_files.append(p)

    for path in all_files:
        try:
            raw = path.read_text(encoding="utf-8")
        except OSError as exc:
            log.warning("Could not read knowledge file %s: %s", path, exc)
            continue

        meta, body = _parse_frontmatter(raw)
        title = meta.get("title", path.stem)
        url = meta.get("url", "https://olake.io/docs")
        source = meta.get("source", "docs")
        topics = [t.strip() for t in meta.get("topics", "").strip("[]").split(",") if t.strip()]

        for heading, text in _chunk_markdown(body, title):
            digest = hashlib.sha1(f"{path.name}:{heading}:{text[:80]}".encode()).hexdigest()[:12]
            chunks.append(
                Chunk(
                    id=digest,
                    title=title,
                    url=url,
                    source=source,
                    topics=topics,
                    heading=heading,
                    text=text,
                    tokens=_tokenize(text),
                )
            )

    if not chunks:
        raise RuntimeError(f"No knowledge files found in {root}")
    return chunks


async def fetch_latest_release(repo: str, headers: dict[str, str]) -> dict[str, Any] | None:
    """Fetches the latest release metadata for a given GitHub repository."""
    url = f"https://api.github.com/repos/{repo}/releases/latest"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(url, headers=headers)
            if res.status_code == 200:
                return res.json()
            if res.status_code == 404:
                # No formal release, fallback to recent tags
                tags_res = await client.get(f"https://api.github.com/repos/{repo}/tags", headers=headers)
                if tags_res.status_code == 200 and tags_res.json():
                    tag = tags_res.json()[0]
                    return {"tag_name": tag.get("name", "v0.1.0"), "name": tag.get("name"), "body": "Latest tag deployment"}
    except Exception as exc:
        log.warning("Error fetching GitHub release for %s: %s", repo, exc)
    return None


async def sync_remote_knowledge(directory: Path | None = None) -> dict[str, Any]:
    """Automatically queries upstream OLake repos and updates the knowledge base on deployment.

    Runs safely without breaking if offline or rate-limited.
    """
    root = directory or KNOWLEDGE_DIR
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    headers = {"User-Agent": "OLake-Assistant-AutoUpdater/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    fetched: list[dict[str, str]] = []
    for item in OLAKE_REPOS:
        repo_slug = item["repo"]
        data = await fetch_latest_release(repo_slug, headers)
        if data:
            tag = data.get("tag_name") or data.get("name") or "latest"
            body = (data.get("body") or "").strip()
            published = data.get("published_at") or data.get("created_at") or "recent"
            fetched.append({
                "repo": repo_slug,
                "name": item["name"],
                "tag": tag,
                "url": data.get("html_url") or item["url"],
                "published": published,
                "body": body[:2500],  # Cap body size for balanced chunking
            })

    if not fetched:
        return {"updated": False, "reason": "No new releases fetched or rate limit reached"}

    # Format into dynamic markdown document
    lines = [
        "---",
        "title: Latest Deployed Releases & Upstream Updates",
        "url: https://github.com/datazip-inc/olake/releases",
        "source: github-releases",
        "topics: [release, update, versions, changelog, deploy, fixes, features]",
        "---",
        "",
        "# Deployed OLake Upstream Versions & Release Notes",
        f"Synchronized at: {datetime.now(timezone.utc).isoformat()}",
        "",
    ]

    for rel in fetched:
        lines.append(f"## {rel['name']} ({rel['tag']})")
        lines.append(f"- **Repository**: [{rel['repo']}](https://github.com/{rel['repo']})")
        lines.append(f"- **Version Tag**: `{rel['tag']}`")
        lines.append(f"- **Published Date**: {rel['published']}")
        lines.append(f"- **Release URL**: {rel['url']}")
        lines.append("")
        if rel["body"]:
            lines.append("### Changelog & Feature Highlights")
            lines.append(rel["body"])
        lines.append("\n---\n")

    content = "\n".join(lines)
    target_file = root / "releases-latest.md"
    try:
        target_file.write_text(content, encoding="utf-8")
        log.info("Successfully updated %s with %d repo releases", target_file, len(fetched))
        return {
            "updated": True,
            "file": str(target_file),
            "repos": [f"{r['repo']}@{r['tag']}" for r in fetched],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except OSError as exc:
        log.warning("Could not write to %s (%s). Attempting fallback to %s", target_file, exc, RUNTIME_KNOWLEDGE_DIR)
        try:
            RUNTIME_KNOWLEDGE_DIR.mkdir(parents=True, exist_ok=True)
            fallback_target = RUNTIME_KNOWLEDGE_DIR / "releases-latest.md"
            fallback_target.write_text(content, encoding="utf-8")
            log.info("Successfully updated fallback %s with %d repo releases", fallback_target, len(fetched))
            return {
                "updated": True,
                "file": str(fallback_target),
                "repos": [f"{r['repo']}@{r['tag']}" for r in fetched],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except OSError as fallback_exc:
            log.error("Failed to write dynamic release updates to fallback: %s", fallback_exc)
            return {"updated": False, "error": str(fallback_exc)}


class KnowledgeManager:
    """Orchestrates in-memory chunks, dynamic updates, and file staleness detection."""

    def __init__(self, directory: Path | None = None) -> None:
        self.directory = directory or KNOWLEDGE_DIR
        self._current_hash: str = ""
        self._last_synced: float = 0.0
        self.chunks: list[Chunk] = []
        self.reload()

    def reload(self) -> int:
        """Reloads chunks from disk and updates signature hash."""
        self.chunks = load_chunks(self.directory)
        self._current_hash = get_directory_hash(self.directory)
        self._last_synced = time.time()
        log.info("Loaded %d knowledge passages (hash: %s)", len(self.chunks), self._current_hash[:8])
        return len(self.chunks)

    def is_stale(self) -> bool:
        """Checks if files on disk have changed since last reload."""
        return get_directory_hash(self.directory) != self._current_hash

    async def auto_update_and_reload(self) -> dict[str, Any]:
        """Fetches remote updates from GitHub/docs and reloads chunks if changed."""
        res = await sync_remote_knowledge(self.directory)
        if res.get("updated") or self.is_stale():
            count = self.reload()
            res["chunks_total"] = count
        else:
            res["chunks_total"] = len(self.chunks)
        return res
