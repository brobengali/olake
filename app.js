/**
 * OLake Docs Assistant – Production Client Engine
 * Mirrors the OLake.io marketing & Docusaurus documentation UI/UX.
 * Dual-engine: Calls backend /api/chat when available; falls back to embedded
 * OLake knowledge retrieval + direct Gemini LLM if key is configured.
 */

'use strict';

// ============================================================================
// CONFIG & STORAGE KEYS
// ============================================================================
const CONFIG = {
  API_CHAT: '/api/chat',
  API_HEALTH: '/api/health',
  STORAGE_THEME: 'olake_ui_theme',
  STORAGE_RECENT: 'olake_ui_recent_chats',
  STORAGE_API_KEY: 'olake_gemini_api_key',
  MAX_HISTORY: 10,
};

// ============================================================================
// EMBEDDED OLAKE KNOWLEDGE BASE
// ============================================================================
const EMBEDDED_KB = [
  {
    title: 'OLake Go Overview & Architecture',
    url: 'https://olake.io/docs/',
    repo: 'datazip-inc/olake',
    keywords: ['olake', 'go', 'overview', 'architecture', 'iceberg', 'data lakehouse', 'extract', 'load', 'el', 'parquet', 's3'],
    content: `OLake Go is an ultra-fast, open-source EL (Extract–Load) engine written in Go designed to replicate operational databases directly into Apache Iceberg tables on object storage like Amazon S3 or MinIO.
Key architectural highlights:
- High throughput: Up to 500x faster than traditional EL tools by using native database protocols and parallel writer threads.
- Direct Iceberg & Parquet writes: Directly commits Iceberg v2 metadata and writes columnar Parquet data files.
- Resumable & Stateful: Tracks incremental checkpoints and CDC log offsets to guarantee exactly-once or at-least-once replication without duplicating data.
- Resource efficient: Native Go binary with minimal memory footprint compared to JVM-based alternatives.`
  },
  {
    title: 'Docker Compose Setup & OLake Web UI',
    url: 'https://olake.io/docs/install/olake-ui/',
    repo: 'datazip-inc/olake-ui',
    keywords: ['docker', 'compose', 'setup', 'install', 'ui', 'web', 'quickstart', 'run'],
    content: `To run OLake with both the Go engine and the Web UI using Docker Compose:
\`\`\`yaml
version: '3.8'
services:
  olake-ui:
    image: datazip/olake-ui:latest
    ports:
      - "3000:3000"
    environment:
      - OLAKE_BACKEND_URL=http://olake-server:8000
    depends_on:
      - olake-server
  olake-server:
    image: datazip/olake:latest
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - /var/run/docker.sock:/var/run/docker.sock
\`\`\`
Run the stack with:
\`\`\`bash
git clone https://github.com/datazip-inc/olake.git
cd olake
docker compose up -d
\`\`\`
Access the OLake UI in your browser at http://localhost:3000 to configure pipelines visually.`
  },
  {
    title: 'PostgreSQL CDC & Full Sync Configuration',
    url: 'https://olake.io/docs/connectors/postgres/',
    repo: 'datazip-inc/olake',
    keywords: ['postgres', 'postgresql', 'cdc', 'wal', 'replication', 'pgoutput', 'logical replication', 'slot', 'publication'],
    content: `OLake replicates PostgreSQL using pgoutput logical decoding:
1. Prerequisites:
- Set \`wal_level = logical\` in postgresql.conf.
- Set \`max_replication_slots = 10\` and \`max_wal_senders = 10\`.
2. Database Permissions:
\`\`\`sql
CREATE ROLE olake_user WITH REPLICATION LOGIN PASSWORD 'secret';
GRANT USAGE ON SCHEMA public TO olake_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO olake_user;
CREATE PUBLICATION olake_pub FOR ALL TABLES;
\`\`\`
3. Pipeline Modes:
- Full Refresh: Bulk snapshot reading using multiple threads.
- CDC: Consumes WAL stream via replication slot with sub-second commit latency.`
  },
  {
    title: 'MySQL Binlog CDC Source Configuration',
    url: 'https://olake.io/docs/connectors/mysql/',
    repo: 'datazip-inc/olake',
    keywords: ['mysql', 'binlog', 'cdc', 'row', 'gtid', 'source', 'replication'],
    content: `OLake captures real-time changes from MySQL using Row-Based Binary Logging (binlog):
1. Enable binlogs in my.cnf:
\`\`\`ini
[mysqld]
server-id = 223344
log_bin = mysql-bin
binlog_format = ROW
binlog_row_image = FULL
gtid_mode = ON
enforce_gtid_consistency = ON
\`\`\`
2. User privileges:
\`\`\`sql
CREATE USER 'olake_user'@'%' IDENTIFIED BY 'password';
GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'olake_user'@'%';
FLUSH PRIVILEGES;
\`\`\``
  },
  {
    title: 'MongoDB Change Streams Source Configuration',
    url: 'https://olake.io/docs/connectors/mongodb/',
    repo: 'datazip-inc/olake',
    keywords: ['mongo', 'mongodb', 'change streams', 'oplog', 'replica set', 'documents'],
    content: `OLake supports MongoDB replication from Replica Sets or Atlas clusters:
- Ingestion mechanism: Initial parallel collection scan followed by real-time change stream monitoring.
- Document mapping: Automatically unwraps nested BSON documents into structured Iceberg schemas with JSON serialization for polymorphic fields.
- Requirements: MongoDB version 4.4+ with replica set enabled (\`rs.initiate()\`).`
  },
  {
    title: 'Apache Kafka Source & Stream Properties',
    url: 'https://olake.io/docs/connectors/kafka/',
    repo: 'datazip-inc/olake',
    keywords: ['kafka', 'topics', 'streaming', 'consumer group', 'schema registry', 'avro', 'json'],
    content: `Replicate real-time Kafka topics into Iceberg tables:
- Supported formats: JSON, Schema Registry Avro, and Protobuf.
- Partition handling: Parallel consumer goroutines mapped to Kafka partitions.
- Offset tracking: Offsets committed transactionally with Iceberg snapshot manifests to guarantee exactly-once table ingestion.`
  },
  {
    title: 'Apache Iceberg Catalogs & S3 Storage',
    url: 'https://olake.io/docs/understanding/compatibility-catalogs/',
    repo: 'datazip-inc/olake',
    keywords: ['catalog', 'catalogs', 'iceberg', 'aws glue', 'glue', 'hive', 'nessie', 'rest catalog', 's3', 'minio'],
    content: `OLake supports all major Apache Iceberg catalog types:
1. AWS Glue Data Catalog:
\`\`\`json
{
  "catalog_type": "glue",
  "warehouse": "s3://my-lakehouse-bucket/warehouse/",
  "region": "us-east-1",
  "access_key_id": "...",
  "secret_access_key": "..."
}
\`\`\`
2. Apache Hive Metastore:
\`\`\`json
{
  "catalog_type": "hive",
  "uri": "thrift://hive-metastore:9083",
  "warehouse": "s3://my-lakehouse-bucket/warehouse/"
}
\`\`\`
3. Project Nessie & Iceberg REST Catalog:
\`\`\`json
{
  "catalog_type": "rest",
  "uri": "http://nessie:19120/iceberg",
  "warehouse": "s3://my-lakehouse-bucket/warehouse/"
}
\`\`\``
  },
  {
    title: 'OLake Fusion: Iceberg Table Maintenance & Compaction',
    url: 'https://olake.io/docs/fusion/getting-started/overview/',
    repo: 'datazip-inc/olake-fusion',
    keywords: ['fusion', 'maintenance', 'compaction', 'small files', 'snapshot expiry', 'orphan files', 'rewrite data files'],
    content: `OLake Fusion is the automated lakehouse maintenance companion for Apache Iceberg tables:
- Small file compaction: As CDC streams write small batches, Fusion executes intelligent bin-packing rewrite jobs into target file sizes (e.g. 128MB or 256MB).
- Snapshot Expiry: Automatically prunes old snapshots past the retention window (e.g., 7 days) to reduce metadata overhead.
- Orphan File Deletion: Identifies unreferenced data files in S3 and safely deletes them to prevent cloud storage leakage.
- Zero query disruption: All maintenance operations commit as atomic Iceberg transactions without locking active readers.`
  },
  {
    title: 'Kubernetes Deployment using Helm',
    url: 'https://olake.io/docs/install/kubernetes/',
    repo: 'datazip-inc/olake-helm',
    keywords: ['kubernetes', 'helm', 'k8s', 'deploy', 'helm chart', 'values', 'production'],
    content: `Deploy OLake on Kubernetes using the official Helm chart:
\`\`\`bash
helm repo add olake https://charts.olake.io
helm repo update
helm install olake-cluster olake/olake \\
  --namespace olake --create-namespace \\
  --set ui.enabled=true \\
  --set persistence.size=20Gi
\`\`\`
Configure custom values in \`values.yaml\` to specify cloud IAM roles for AWS (IRSA) or GCP (Workload Identity) to authenticate S3/GCS without static keys.`
  },
  {
    title: 'Troubleshooting & Common Failure Solutions',
    url: 'https://olake.io/docs/understanding/terminologies/general/',
    repo: 'datazip-inc/olake',
    keywords: ['troubleshoot', 'troubleshooting', 'error', 'failure', 'replication slot', 'wal', 'lag', 'reconnect', 'timeout'],
    content: `Common troubleshooting steps in OLake:
1. Postgres WAL Slot Growth / Disk Full:
- Check if OLake is running: \`SELECT * FROM pg_replication_slots WHERE slot_name = 'olake_slot';\`
- If the sync is halted, drop or restart the slot before disk space runs out.
2. S3 / Catalog Connection Timeout:
- Verify AWS IAM policy contains \`s3:GetObject\`, \`s3:PutObject\`, and \`glue:GetTable\`.
3. Schema Evolution Mismatches:
- OLake supports automatic column addition. For column renames or type conversions, ensure Iceberg schema compatibility settings are set to \`allow_flexible_types\`.`
  }
];

// ============================================================================
// APPLICATION STATE
// ============================================================================
const state = {
  theme: 'dark',
  messages: [],
  isLoading: false,
  onlineBackend: false,
  recentChats: [],
  apiKey: localStorage.getItem(CONFIG.STORAGE_API_KEY) || '',
};

// ============================================================================
// DOM REFERENCES
// ============================================================================
const dom = {
  sidebar: document.getElementById('olake-sidebar'),
  sidebarToggle: document.getElementById('sidebar-toggle'),
  sidebarBackdrop: document.getElementById('sidebar-backdrop'),
  themeToggle: document.getElementById('theme-toggle'),
  settingsToggle: document.getElementById('settings-toggle'),
  settingsDrawer: document.getElementById('settings-drawer'),
  drawerClose: document.getElementById('drawer-close'),
  drawerBackdrop: document.getElementById('drawer-backdrop'),
  settingsApiKey: document.getElementById('settings-api-key'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  newChatBtn: document.getElementById('new-chat-btn'),
  clearChatBtn: document.getElementById('clear-chat-btn'),
  topicFilter: document.getElementById('topic-filter'),
  treeItemBtns: document.querySelectorAll('.tree-item-btn'),
  welcomeScreen: document.getElementById('welcome-screen'),
  messagesList: document.getElementById('messages-list'),
  streamContainer: document.getElementById('stream-container'),
  userInput: document.getElementById('user-input'),
  sendBtn: document.getElementById('send-btn'),
  charCount: document.getElementById('char-count'),
  suggestionCards: document.querySelectorAll('.olake-card'),
  heroStatusText: document.getElementById('hero-status-text'),
  heroStatusPill: document.getElementById('hero-status-pill'),
  toastContainer: document.getElementById('toast-container'),
  recentList: document.getElementById('recent-list'),
};

// ============================================================================
// INITIALIZATION
// ============================================================================
function init() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('embed') === 'true' || urlParams.get('embed') === '1') {
    document.body.classList.add('embed-mode');
  }
  initTheme();
  initAnimatedBackground();
  bindEvents();
  renderRecentChats();
  if (state.apiKey && dom.settingsApiKey) {
    dom.settingsApiKey.value = state.apiKey;
  }
  checkBackendHealth();
}

// ============================================================================
// THEME MANAGEMENT
// ============================================================================
function initTheme() {
  const saved = localStorage.getItem(CONFIG.STORAGE_THEME) || 'dark';
  setTheme(saved);
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(CONFIG.STORAGE_THEME, theme);
}

function toggleTheme() {
  setTheme(state.theme === 'dark' ? 'light' : 'dark');
}

function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    try {
      return AbortSignal.timeout(ms);
    } catch (_) {
      // Fallback if environment throws
    }
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================
async function checkBackendHealth() {
  // If previewing from a static dev server (e.g. port 3000) or file://, check http://localhost:8080 first
  // to avoid triggering an expected 404 on the static preview server.
  const isDevNonBackend = window.location.protocol === 'file:' || (window.location.port && window.location.port !== '8080');
  const endpoints = isDevNonBackend
    ? ['http://localhost:8080/api/health', CONFIG.API_HEALTH]
    : [CONFIG.API_HEALTH];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { signal: timeoutSignal(2500) });
      if (res.ok) {
        const data = await res.json();
        state.onlineBackend = Boolean(data.ok);
        if (ep.startsWith('http://localhost:8080')) {
          CONFIG.API_HEALTH = 'http://localhost:8080/api/health';
          CONFIG.API_CHAT = 'http://localhost:8080/api/chat';
        }
        updateEngineStatus(true);
        return;
      }
    } catch (_) {
      // Endpoint unreachable, continue to fallback
    }
  }

  state.onlineBackend = false;
  updateEngineStatus(false);
}

function updateEngineStatus(isBackendOnline) {
  if (dom.heroStatusText) {
    dom.heroStatusText.textContent = isBackendOnline
      ? 'Knowledge base loaded · Ready to answer questions'
      : (state.apiKey ? 'Knowledge base active · Direct Gemini Grounding' : 'Local knowledge base loaded · Ready to answer questions');
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================
function bindEvents() {
  // Theme toggle
  dom.themeToggle?.addEventListener('click', toggleTheme);

  // Mobile sidebar open/close
  dom.sidebarToggle?.addEventListener('click', openSidebar);
  dom.sidebarBackdrop?.addEventListener('click', closeSidebar);

  // Settings drawer
  dom.settingsToggle?.addEventListener('click', openSettings);
  dom.drawerClose?.addEventListener('click', closeSettings);
  dom.drawerBackdrop?.addEventListener('click', closeSettings);
  dom.saveSettingsBtn?.addEventListener('click', saveSettings);

  // New Chat & Clear Chat
  dom.newChatBtn?.addEventListener('click', resetChat);
  dom.clearChatBtn?.addEventListener('click', () => {
    if (state.messages.length > 0) {
      resetChat();
      showToast('Conversation cleared', 'info');
    }
  });

  // Topic filter input in sidebar
  dom.topicFilter?.addEventListener('input', handleTopicFilter);

  // Tree item buttons in sidebar
  dom.treeItemBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.question;
      if (q) {
        closeSidebar();
        submitMessage(q);
      }
    });
  });

  // Suggestion cards in hero
  dom.suggestionCards.forEach(card => {
    card.addEventListener('click', () => {
      const q = card.dataset.question;
      if (q) submitMessage(q);
    });
  });

  // Input textarea auto-resize & submit on Enter
  dom.userInput?.addEventListener('input', handleUserInput);
  dom.userInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const val = dom.userInput.value.trim();
      if (val && !state.isLoading) submitMessage(val);
    }
  });

  // Send button click
  dom.sendBtn?.addEventListener('click', () => {
    const val = dom.userInput?.value.trim();
    if (val && !state.isLoading) submitMessage(val);
  });
}

function openSidebar() {
  dom.sidebar?.classList.add('open');
  dom.sidebarBackdrop?.classList.add('active');
  dom.sidebarToggle?.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  dom.sidebar?.classList.remove('open');
  dom.sidebarBackdrop?.classList.remove('active');
  dom.sidebarToggle?.setAttribute('aria-expanded', 'false');
}

function openSettings() {
  dom.settingsDrawer?.classList.add('open');
  dom.drawerBackdrop?.classList.add('active');
  dom.settingsDrawer?.setAttribute('aria-hidden', 'false');
}

function closeSettings() {
  dom.settingsDrawer?.classList.remove('open');
  dom.drawerBackdrop?.classList.remove('active');
  dom.settingsDrawer?.setAttribute('aria-hidden', 'true');
}

function saveSettings() {
  const key = dom.settingsApiKey?.value.trim() || '';
  state.apiKey = key;
  if (key) {
    localStorage.setItem(CONFIG.STORAGE_API_KEY, key);
    showToast('Preferences saved! Gemini mode active', 'success');
  } else {
    localStorage.removeItem(CONFIG.STORAGE_API_KEY);
    showToast('Preferences updated (Default engine)', 'info');
  }
  closeSettings();
  checkBackendHealth();
}

function handleTopicFilter(e) {
  const query = e.target.value.toLowerCase().trim();
  const categories = document.querySelectorAll('.tree-category');
  categories.forEach(cat => {
    let hasMatch = false;
    const items = cat.querySelectorAll('.tree-items li');
    items.forEach(li => {
      const text = li.textContent.toLowerCase();
      if (!query || text.includes(query)) {
        li.style.display = '';
        hasMatch = true;
      } else {
        li.style.display = 'none';
      }
    });
    cat.style.display = hasMatch ? '' : 'none';
  });
}

function handleUserInput() {
  if (!dom.userInput) return;
  const len = dom.userInput.value.length;
  if (dom.charCount) dom.charCount.textContent = `${len}/4000`;
  if (dom.sendBtn) dom.sendBtn.disabled = len === 0 || state.isLoading;

  // Auto grow
  dom.userInput.style.height = 'auto';
  dom.userInput.style.height = Math.min(dom.userInput.scrollHeight, 160) + 'px';
}

// ============================================================================
// CHAT FLOW
// ============================================================================
function resetChat() {
  state.messages = [];
  if (dom.messagesList) dom.messagesList.innerHTML = '';
  if (dom.welcomeScreen) dom.welcomeScreen.style.display = 'flex';
  if (dom.userInput) {
    dom.userInput.value = '';
    dom.userInput.style.height = 'auto';
  }
  if (dom.charCount) dom.charCount.textContent = '0/4000';
  if (dom.sendBtn) dom.sendBtn.disabled = true;
}

async function submitMessage(text) {
  if (state.isLoading) return;

  // Hide hero welcome
  if (dom.welcomeScreen) dom.welcomeScreen.style.display = 'none';

  // Add User Message
  appendUserMessage(text);
  saveToRecent(text);

  // Clear input
  if (dom.userInput) {
    dom.userInput.value = '';
    dom.userInput.style.height = 'auto';
  }
  if (dom.charCount) dom.charCount.textContent = '0/4000';
  if (dom.sendBtn) dom.sendBtn.disabled = true;

  state.isLoading = true;
  const typingEl = showTypingBubble();

  try {
    const result = await generateAnswer(text);
    typingEl.remove();
    appendAssistantMessage(result.answer, result.sources);
  } catch (err) {
    typingEl.remove();
    appendAssistantMessage(
      `### Notice\nI encountered an error while processing your request: *${escapeHtml(err.message)}*. Please try rephrasing your question.`,
      [{ title: 'OLake Official Documentation', url: 'https://olake.io/docs' }]
    );
  } finally {
    state.isLoading = false;
    if (dom.userInput) {
      dom.sendBtn.disabled = dom.userInput.value.trim().length === 0;
    }
    scrollToBottom();
  }
}

// ============================================================================
// ANSWER GENERATION (DUAL ENGINE)
// ============================================================================
async function generateAnswer(userQuery) {
  // Strategy 1: If Backend /api/chat is reachable, use it
  if (state.onlineBackend) {
    try {
      const history = state.messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-CONFIG.MAX_HISTORY)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(CONFIG.API_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userQuery, history }),
        signal: timeoutSignal(30000),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          answer: data.answer || '',
          sources: (data.sources || []).map(s => ({
            title: s.title || s.heading || s.url,
            url: s.url,
          })),
        };
      } else {
        const errorText = await res.text();
        console.warn(`Backend /api/chat returned status ${res.status}:`, errorText);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('Backend /api/chat timed out after 30 seconds');
      } else {
        console.warn('Backend /api/chat failed, falling back to client knowledge engine:', err);
      }
    }
  }

  // Strategy 2: If user provided a Gemini API Key in settings, call Gemini with grounded context
  if (state.apiKey) {
    try {
      return await callDirectGemini(userQuery, state.apiKey);
    } catch (err) {
      console.warn('Direct Gemini call failed, falling back to extractive engine:', err);
    }
  }

  // Strategy 3: Client-side intelligent semantic search across EMBEDDED_KB
  return queryClientKnowledge(userQuery);
}

// Client-Side Knowledge Engine
function queryClientKnowledge(query) {
  const qLower = query.toLowerCase();
  const qTokens = qLower.split(/[^a-z0-9_-]+/).filter(t => t.length > 2);

  // Score passages
  const scored = EMBEDDED_KB.map(item => {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const contentLower = item.content.toLowerCase();

    // Keyword matches
    item.keywords.forEach(kw => {
      if (qLower.includes(kw)) score += 8;
    });

    // Token occurrences
    qTokens.forEach(token => {
      if (titleLower.includes(token)) score += 6;
      if (contentLower.includes(token)) score += 2;
    });

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const bestHits = scored.filter(s => s.score > 4);

  if (bestHits.length === 0) {
    return {
      answer: `I don't have enough verified information in the OLake documentation to answer this question accurately.

For assistance with specialized configs or custom setups, please check the official documentation or join the community:
- [OLake Documentation](https://olake.io/docs)
- [OLake GitHub](https://github.com/datazip-inc/olake)
- [OLake Community Slack](https://olake.io/slack/)`,
      sources: [
        { title: 'OLake Official Documentation', url: 'https://olake.io/docs' },
        { title: 'OLake GitHub Repository', url: 'https://github.com/datazip-inc/olake' },
      ],
    };
  }

  // Build grounded response
  const top = bestHits[0].item;
  const secondary = bestHits.length > 1 ? bestHits[1].item : null;

  let answer = `### ${top.title}\n\n${top.content}\n`;
  if (secondary && bestHits[1].score > 8) {
    answer += `\n---\n\n### Related: ${secondary.title}\n\n${secondary.content}\n`;
  }

  const sources = [
    { title: top.title, url: top.url },
    ...(secondary ? [{ title: secondary.title, url: secondary.url }] : []),
  ];

  return { answer, sources };
}

// Direct Gemini API call with grounded system prompt
async function callDirectGemini(query, apiKey) {
  const topHits = EMBEDDED_KB.slice(0, 4)
    .map(k => `Document: ${k.title} (${k.url})\nContent:\n${k.content}`)
    .join('\n\n');

  const systemInstruction = `You are the official OLake AI Documentation Assistant.
Your mission is to answer user questions about OLake Go data replication, CDC sync modes, Iceberg catalogs, OLake Fusion table maintenance, and Kubernetes Helm deployment.
Rules:
1. Always base your answer strictly on the provided OLake documentation context.
2. Structure your response clearly with headings, bullet points, and code blocks with language indicators.
3. If the documentation context does not have enough information to answer, state clearly that you don't know and provide the official links.
4. Conclude with citations to official docs.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: `Context:\n${topHits}\n\nQuestion: ${query}` }
          ]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return {
    answer: text,
    sources: [
      { title: 'OLake Official Documentation', url: 'https://olake.io/docs' },
      { title: 'OLake Go Repository', url: 'https://github.com/datazip-inc/olake' },
    ]
  };
}

// ============================================================================
// MESSAGE RENDERING (MARKDOWN, CODE BLOCKS, CALLOUTS)
// ============================================================================
function appendUserMessage(text) {
  state.messages.push({ role: 'user', content: text });
  const row = document.createElement('div');
  row.className = 'message-item user';
  row.innerHTML = `
    <div class="message-avatar" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
    <div class="message-bubble">${escapeHtml(text)}</div>
  `;
  dom.messagesList?.appendChild(row);
  scrollToBottom();
}

function appendAssistantMessage(rawText, sources = []) {
  state.messages.push({ role: 'assistant', content: rawText, sources });
  const row = document.createElement('div');
  row.className = 'message-item assistant';

  const htmlContent = renderMarkdown(rawText);

  let sourcesHtml = '';
  if (sources && sources.length > 0) {
    sourcesHtml = `
      <div class="sources-card">
        <div class="sources-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          Verified Sources
        </div>
        <div class="sources-pills-row">
          ${sources.map(s => `
            <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="source-pill">
              <span>📄</span>
              <span>${escapeHtml(s.title || s.url)}</span>
              <span>↗</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }

  row.innerHTML = `
    <div class="message-avatar" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 42 42" fill="none">
        <path fill="currentColor" d="M41.785 0H0v22.548c17.383-1.832 41.72-2.29 29.8 4.123-8.074 4.343-2.538 5.945 2.308 7.348 3.154.913 6.016 1.741 4.645 3.186-2.791 2.942 2.742 4.112 5.032 4.459z"/>
      </svg>
    </div>
    <div class="message-bubble">
      ${htmlContent}
      ${sourcesHtml}
      <div class="message-actions">
        <button type="button" class="action-chip copy-msg-btn" title="Copy response">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        </button>
        <span class="action-chip" style="cursor: default; opacity: 0.7;">Grounded in OLake Docs</span>
      </div>
    </div>
  `;

  // Attach copy listeners
  const copyBtn = row.querySelector('.copy-msg-btn');
  copyBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(rawText).then(() => {
      copyBtn.innerHTML = `<span>✓ Copied</span>`;
      setTimeout(() => {
        copyBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        `;
      }, 2000);
    });
  });

  // Attach code copy buttons
  row.querySelectorAll('.code-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.closest('.code-block-wrapper')?.querySelector('code')?.innerText || '';
      navigator.clipboard.writeText(code).then(() => {
        btn.innerHTML = '<span>✓ Copied</span>';
        setTimeout(() => { btn.innerHTML = '<span>Copy</span>'; }, 2000);
      });
    });
  });

  dom.messagesList?.appendChild(row);
  scrollToBottom();
}

function showTypingBubble() {
  const row = document.createElement('div');
  row.className = 'message-item assistant typing-indicator-item';
  row.innerHTML = `
    <div class="message-avatar" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 42 42" fill="none">
        <path fill="currentColor" d="M41.785 0H0v22.548c17.383-1.832 41.72-2.29 29.8 4.123-8.074 4.343-2.538 5.945 2.308 7.348 3.154.913 6.016 1.741 4.645 3.186-2.791 2.942 2.742 4.112 5.032 4.459z"/>
      </svg>
    </div>
    <div class="message-bubble">
      <div class="typing-bubble">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  dom.messagesList?.appendChild(row);
  scrollToBottom();
  return row;
}

function scrollToBottom() {
  if (dom.streamContainer) {
    dom.streamContainer.scrollTop = dom.streamContainer.scrollHeight;
  }
}

// ============================================================================
// MARKDOWN PARSER
// ============================================================================
function renderMarkdown(md) {
  if (!md) return '';

  let html = md;

  // Escape HTML tags to prevent XSS
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Code blocks: ```lang ... ```
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const l = lang || 'text';
    return `
      <div class="code-block-wrapper">
        <div class="code-header">
          <span>${l}</span>
          <button type="button" class="code-copy-btn">Copy</button>
        </div>
        <pre><code class="language-${l}">${code.trim()}</code></pre>
      </div>
    `;
  });

  // Docusaurus callout / admonition blocks: :::note, :::tip, :::warning
  html = html.replace(/:::(tip|note|warning)\s*([^\n]*)\n([\s\S]*?):::/g, (match, type, title, text) => {
    const displayTitle = title.trim() || type.toUpperCase();
    return `
      <div class="olake-callout ${type}">
        <div class="callout-title">
          <span>${type === 'tip' ? '💡' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
          <span>${displayTitle}</span>
        </div>
        <div>${text.trim()}</div>
      </div>
    `;
  });

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr style="border:none; border-top:1px solid var(--olake-line); margin: 16px 0;" />');

  // Inline formatting
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Markdown links [text](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bullet Lists
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gis, '<ul>$1</ul>');

  // Paragraph breaks
  html = html.split('\n\n').map(p => {
    if (p.startsWith('<div') || p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<pre') || p.startsWith('<hr')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// RECENT CONVERSATIONS
// ============================================================================
function saveToRecent(text) {
  const snippet = text.length > 46 ? text.slice(0, 46) + '…' : text;
  state.recentChats = [snippet, ...state.recentChats.filter(s => s !== snippet)].slice(0, 8);
  try {
    localStorage.setItem(CONFIG.STORAGE_RECENT, JSON.stringify(state.recentChats));
  } catch (e) { /* ignore */ }
  renderRecentChats();
}

function renderRecentChats() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_RECENT);
    if (raw) state.recentChats = JSON.parse(raw);
  } catch (e) { /* ignore */ }

  if (!dom.recentList) return;

  if (state.recentChats.length === 0) {
    dom.recentList.innerHTML = '<li class="tree-item-empty">No previous chats</li>';
    return;
  }

  dom.recentList.innerHTML = '';
  state.recentChats.forEach(item => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'tree-item-btn';
    btn.innerHTML = `<span class="tree-icon">💬</span><span class="tree-label">${escapeHtml(item)}</span>`;
    btn.addEventListener('click', () => {
      closeSidebar();
      submitMessage(item.replace('…', ''));
    });
    li.appendChild(btn);
    dom.recentList.appendChild(li);
  });
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================
function showToast(message, type = 'info') {
  if (!dom.toastContainer) return;
  const icons = { success: '✓', info: 'ℹ', warning: '⚠', error: '✕' };
  const toast = document.createElement('div');
  toast.className = `olake-toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${escapeHtml(message)}</span>`;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ============================================================================
// AMBIENT BACKGROUND PARTICLES
// ============================================================================
function initAnimatedBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W = (canvas.width = window.innerWidth);
  let H = (canvas.height = window.innerHeight);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = (Math.random() - 0.5) * 0.25;
      this.r = Math.random() * 1.5 + 0.5;
      this.alpha = Math.random() * 0.35 + 0.05;
      this.color = Math.random() > 0.4 ? '#193ae6' : '#38bdf8';
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.alpha;
      ctx.fill();
    }
  }

  const count = Math.min(Math.floor((W * H) / 20000), 55);
  const particles = Array.from({ length: count }, () => new Particle());

  function animate() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }

  animate();
  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });
}

// ============================================================================
// BOOTSTRAP
// ============================================================================
document.addEventListener('DOMContentLoaded', init);
