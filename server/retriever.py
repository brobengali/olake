from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass

from loader import Chunk, load_chunks, _tokenize, get_directory_hash

STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "what", "how",
    "does", "are", "is", "in", "to", "of", "a", "an", "on", "or", "do",
    "i", "my", "can", "you", "me", "please", "about",
}

UNKNOWN_THRESHOLD = 1.35


@dataclass
class Hit:
    chunk: Chunk
    score: float


class Retriever:
    def __init__(self, chunks: list[Chunk] | None = None) -> None:
        self._custom_chunks = chunks is not None
        self._hash: str = ""
        self._df: Counter[str] = Counter()
        self.chunks: list[Chunk] = []
        self.k1 = 1.4
        self.b = 0.75
        self.reload(chunks)

    def reload(self, chunks: list[Chunk] | None = None) -> int:
        self.chunks = chunks or load_chunks()
        self._hash = get_directory_hash() if not self._custom_chunks else "custom"
        self._df.clear()
        for chunk in self.chunks:
            self._df.update(set(chunk.tokens))
        self.n = len(self.chunks)
        self.avgdl = sum(len(c.tokens) for c in self.chunks) / max(self.n, 1)
        return self.n

    def check_and_reload_if_stale(self) -> bool:
        if self._custom_chunks:
            return False
        current = get_directory_hash()
        if current != self._hash:
            self.reload()
            return True
        return False

    def _idf(self, term: str) -> float:
        df = self._df.get(term, 0)
        return math.log(1 + (self.n - df + 0.5) / (df + 0.5))

    def search(self, query: str, k: int = 6) -> list[Hit]:
        self.check_and_reload_if_stale()
        terms = [t for t in _tokenize(query) if t not in STOPWORDS]
        if not terms:
            terms = _tokenize(query)
        if not terms:
            return []

        q_lower = query.lower()
        qtf = Counter(terms)
        is_overview_query = (
            any(phrase in q_lower for phrase in ["what is", "what does", "about olake", "explain olake", "overview", "introduction", "tell me about", "who made"])
            and "olake" in q_lower
        )
        scored: list[Hit] = []
        for chunk in self.chunks:
            tf = Counter(chunk.tokens)
            dl = len(chunk.tokens) or 1
            score = 0.0
            for term, qn in qtf.items():
                f = tf.get(term, 0)
                if not f:
                    continue
                denom = f + self.k1 * (1 - self.b + self.b * dl / self.avgdl)
                score += self._idf(term) * (f * (self.k1 + 1) / denom) * qn
            topic_blob = " ".join(chunk.topics) + " " + chunk.heading.lower()
            for term in set(terms):
                if term in topic_blob:
                    score += 0.35
            if is_overview_query:
                h_lower = (chunk.heading + " " + chunk.title).lower()
                if any(k in h_lower for k in ["what is olake", "overview", "getting started", "architecture"]):
                    score += 2.5
            if score > 0:
                scored.append(Hit(chunk=chunk, score=score))
        scored.sort(key=lambda h: h.score, reverse=True)
        return scored[:k]

    def confident(self, hits: list[Hit]) -> bool:
        if not hits:
            return False
        return hits[0].score >= UNKNOWN_THRESHOLD


_GENERIC_URL = re.compile(
    r"^https://(olake\.io/docs/?|github\.com/datazip-inc/olake)/?$"
)


def unique_sources(hits: list[Hit]) -> list[dict[str, str]]:
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for hit in hits:
        url = hit.chunk.url
        if url in seen:
            continue
        seen.add(url)
        out.append(
            {
                "title": hit.chunk.title,
                "url": url,
                "source": hit.chunk.source,
                "heading": hit.chunk.heading,
            }
        )
    return out
