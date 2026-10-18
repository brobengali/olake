from pathlib import Path
import sys

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
for p in (ROOT, ROOT / "server"):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from server.main import app
from server.loader import RUNTIME_KNOWLEDGE_DIR, get_directory_hash
import server.loader as loader_module
import server.main as main_module

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["chunks"] > 5


def test_chat_helm():
    res = client.post("/api/chat", json={"message": "How do I install OLake with Helm?"})
    assert res.status_code == 200
    body = res.json()
    assert body["known"] is True
    assert body["sources"]
    assert any("olake.io" in s["url"] or "github.com" in s["url"] for s in body["sources"])
    assert "helm" in body["answer"].lower()


def test_chat_unknown():
    res = client.post("/api/chat", json={"message": "Who won the 1998 FIFA World Cup final?"})
    assert res.status_code == 200
    body = res.json()
    assert body["known"] is False
    assert "don't have enough" in body["answer"].lower() or "do not" in body["answer"].lower()


def test_rejects_empty():
    res = client.post("/api/chat", json={"message": "   "})
    assert res.status_code == 422 or res.status_code == 400


def test_static_assets_served():
    # Frontend and styles must never return 404
    r_index = client.get("/")
    assert r_index.status_code == 200
    assert "OLake Assistant" in r_index.text

    r_css = client.get("/style.css")
    assert r_css.status_code == 200
    assert "text/css" in r_css.headers.get("content-type", "")

    r_js = client.get("/app.js")
    assert r_js.status_code == 200
    assert "javascript" in r_js.headers.get("content-type", "")

    r_embed = client.get("/embed.js")
    assert r_embed.status_code == 200
    assert "javascript" in r_embed.headers.get("content-type", "")
    assert "__OLAKE_EMBED_LOADED__" in r_embed.text


def test_route_aliases():
    # /health and /api/health
    r1 = client.get("/health")
    assert r1.status_code == 200
    assert r1.json()["ok"] is True

    # /api/ask alias
    r2 = client.post("/api/ask", json={"question": "What is OLake Go?"})
    assert r2.status_code == 200
    assert "answer" in r2.json()



def test_sync_endpoint():
    res = client.post("/api/sync")
    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert "chunks" in body
    assert body["chunks"] > 0


def test_retriever_staleness_reload(monkeypatch, tmp_path):
    temp_runtime = tmp_path / "runtime_knowledge"
    temp_runtime.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr("loader.RUNTIME_KNOWLEDGE_DIR", temp_runtime)
    if "server.loader" in sys.modules:
        monkeypatch.setattr("server.loader.RUNTIME_KNOWLEDGE_DIR", temp_runtime)

    initial_chunks = len(main_module.retriever.chunks)
    new_doc = temp_runtime / "sample-feature.md"
    new_doc.write_text(
        "---\ntitle: Dynamic Deployed Feature\nurl: https://olake.io/docs/dynamic\n---\n# Dynamic Feature\nTesting runtime reload.",
        encoding="utf-8",
    )

    # Retriever staleness check should detect change and reload
    reloaded = main_module.retriever.check_and_reload_if_stale()
    assert reloaded is True
    assert len(main_module.retriever.chunks) > initial_chunks


def test_ask_endpoint_success():
    res = client.post("/ask", json={"question": "What is OLake Go?"})
    assert res.status_code == 200
    body = res.json()
    assert "answer" in body and body["answer"]
    assert "sources" in body and isinstance(body["sources"], list)
    assert len(body["sources"]) > 0
    # Confirm every source is a string URL
    assert all(isinstance(url, str) and url.startswith("http") for url in body["sources"])


def test_ask_endpoint_unknown():
    res = client.post("/ask", json={"question": "Who won the 1998 FIFA World Cup final?"})
    assert res.status_code == 200
    body = res.json()
    assert "sources" in body and isinstance(body["sources"], list)
    assert "don't have enough" in body["answer"].lower() or "do not" in body["answer"].lower()


def test_ask_endpoint_rejects_empty():
    res = client.post("/ask", json={"question": "   "})
    assert res.status_code in (400, 422)


