# OLake Docs Assistant ⚡

A high-performance, grounded AI assistant and embeddable chat companion for [OLake](https://github.com/datazip-inc/olake) — the open-source real-time CDC tool for syncing databases into Apache Iceberg and data lakes.

Designed for zero-hallucination developer support, providing instant answers, code examples, troubleshooting steps, and verifiable source citations.

---

## ✨ Features

- **🎯 Grounded Documentation Retrieval**: Uses a hybrid lexical & semantic retrieval engine across curated OLake documentation (Architecture, Sources, Catalogs, OLake Fusion, Kubernetes/Helm, CLI, and Troubleshooting).
- **💬 Multi-Turn Conversational Chat**: Remembers conversation context with smooth streaming or instant responses.
- **🔗 Verifiable Citations**: Every answer includes clickable citations to the exact source documentation files.
- **📦 Embeddable Chat Widget**: Drop `<script src=".../embed.js"></script>` into any documentation site or website to add a floating chat widget in seconds.
- **🔄 Auto-Syncing Knowledge Base**: Periodically polls upstream GitHub releases (`olake`, `olake-fusion`, `olake-helm`, `olake-ui`) to keep changelogs and versions up to date.
- **🛡️ Built-in Guardrails**: Includes query sanitization, off-topic detection, rate-limiting, and strict refusal policies.
- **⚡ Multiple LLM Providers**: Seamlessly switches between OpenRouter (GLM-4, DeepSeek, Gemini Flash Lite) and native Google Gemini 2.0 Flash.

---

## 🏗️ Architecture

```
olake/
├── server/
│   ├── main.py              # FastAPI endpoints (/api/chat, /api/ask, /api/health, /api/sync)
│   ├── retriever.py         # BM25 & keyword retrieval engine with source attribution
│   ├── generate.py          # LLM answer synthesis and prompt management
│   ├── loader.py            # Local knowledge loader & remote GitHub release syncer
│   └── knowledge/           # Curated markdown knowledge base
│       ├── overview.md      # OLake core concepts, CDC architecture, benchmarks
│       ├── catalogs.md      # AWS Glue, Apache Polaris, REST, Nessie, Hive
│       ├── sources.md       # PostgreSQL, MySQL, MongoDB, Kafka CDC setups
│       ├── fusion.md        # Compaction, deduplication & schema evolution
│       ├── kubernetes.md    # Helm charts & production deployments
│       ├── cli.md           # CLI commands, writers, and sync configuration
│       ├── troubleshooting.md # Common errors, WAL slots, memory tuning
│       └── releases-latest.md # Upstream release notes & changelogs
├── index.html               # Modern, responsive standalone web UI
├── style.css                # Dark-mode styling and UI animations
├── app.js                   # Frontend application logic
├── embed.js                 # Floating embeddable widget script
├── render.yaml              # 1-click deployment configuration for Render
├── Procfile                 # Process file for Railway / Heroku
├── requirements.txt         # Core dependencies
└── tests/                   # Automated API and retrieval test suite
```

---

## 🚀 Quickstart (Local Setup)

### 1. Prerequisites
- Python 3.10+
- Git

### 2. Clone and Setup Environment

```bash
git clone https://github.com/brobengali/olake.git
cd olake

# Create a virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Open `.env` and configure at least one API key:
```env
# OpenRouter (Recommended: supports z-ai/glm-4.7-flash, deepseek-v4.1, etc.)
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=z-ai/glm-4.7-flash

# OR Native Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash

# CORS & limits
CORS_ORIGINS=*
RATE_LIMIT_PER_MIN=30
AUTO_SYNC_HOURS=12
```

### 4. Run the Application

```bash
uvicorn server.main:app --reload --port 8000
```

- Open **[http://localhost:8000](http://localhost:8000)** in your browser to chat with the assistant!
- Health check status: **[http://localhost:8000/api/health](http://localhost:8000/api/health)**

---

## 🔌 API Reference

### 1. Multi-turn Chat (`POST /api/chat`)
Send message history for conversational Q&A:
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I configure Postgres CDC with AWS Glue catalog?",
    "history": []
  }'
```

**Response:**
```json
{
  "answer": "To configure PostgreSQL CDC with an AWS Glue catalog in OLake...",
  "sources": [
    { "title": "OLake Catalogs & Metadata", "url": "server/knowledge/catalogs.md" },
    { "title": "Supported Sources & CDC Setup", "url": "server/knowledge/sources.md" }
  ],
  "model": "z-ai/glm-4.7-flash",
  "took_ms": 420.5
}
```

### 2. Quick Single-turn Question (`POST /api/ask`)
```bash
curl -X POST http://localhost:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OLake Fusion?"}'
```

### 3. Health & Knowledge Base Status (`GET /api/health`)
```bash
curl http://localhost:8000/api/health
```

### 4. Knowledge Base Sync Webhook (`POST /api/sync`)
Triggers a refresh of upstream release notes from GitHub:
```bash
curl -X POST http://localhost:8000/api/sync \
  -H "Authorization: Bearer <SYNC_SECRET>"
```

---

## 🌐 Embeddable Documentation Widget

To embed this assistant as a floating chat bubble on your documentation site, add this single script tag right before `</body>`:

```html
<script 
  src="https://your-deployment-url.com/embed.js" 
  data-server="https://your-deployment-url.com" 
  data-title="OLake Assistant" 
  defer>
</script>
```

---

## ☁️ Deployment

### Deploy to Render

This repo contains a pre-configured `render.yaml` file.

1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New + $\rightarrow$ Web Service**.
2. Connect your GitHub repository (`brobengali/olake`).
3. Set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server.main:app --host 0.0.0.0 --port $PORT`
4. In **Environment Variables**, add `OPENROUTER_API_KEY` (or `GEMINI_API_KEY`) and `CORS_ORIGINS=*`.
5. Click **Create Web Service**.

### Deploy to Railway

1. Go to [Railway](https://railway.com/) and click **New Project $\rightarrow$ Deploy from GitHub repo**.
2. Select `brobengali/olake`. Railway automatically reads the `Procfile`.
3. In **Variables**, add `OPENROUTER_API_KEY` or `GEMINI_API_KEY`.
4. In **Settings $\rightarrow$ Networking**, click **Generate Domain**.

---

## 🧪 Testing

Run automated unit and integration tests:

```bash
# Run retriever tests
pytest tests/test_retriever.py -v

# Run full API and route tests
pytest tests/test_api.py -v
```

---

## 📄 License

This project is open-source under the [Apache 2.0 License](LICENSE).
