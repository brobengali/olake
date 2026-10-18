from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
for p in (ROOT, ROOT / "server"):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from server.retriever import Retriever


def test_postgres_cdc_hits_docs():
    r = Retriever()
    hits = r.search("How does CDC work for PostgreSQL in OLake?")
    assert hits
    blob = " ".join(h.chunk.text.lower() + h.chunk.url for h in hits[:4])
    assert "postgres" in blob
    assert "pgoutput" in blob or "cdc" in blob
    assert r.confident(hits)


def test_helm_install_retrieves_chart_repo():
    r = Retriever()
    hits = r.search("How do I deploy OLake on Kubernetes using Helm?")
    assert any("olake-helm" in h.chunk.text or "helm repo add olake" in h.chunk.text for h in hits)


def test_unknown_query_is_not_confident():
    r = Retriever()
    hits = r.search("what is the capital of France and the weather on Mars")
    assert not r.confident(hits)
