// SQL Quest — AI provider layer.
//
// The AI Tutor and the mock interviewer are optional, and they are NOT tied to
// a paid API. This module talks to either:
//
//   • a LOCAL model — anything that serves the OpenAI-compatible
//     /v1/chat/completions endpoint on your own machine: Ollama, LM Studio,
//     llama.cpp's server, Jan, vLLM, … No account, no key, works offline.
//   • the Anthropic API — with your own key (pay-as-you-go API credits; a
//     Claude.ai subscription does not include API access).
//
// Everything else in the app (grading, the wrong-answer explainer, hints, solo
// interviews) needs no model at all.
//
// Config lives in localStorage and is only ever sent to the endpoint you chose.

const AI = (function () {
  const STORE_KEY = 'sql_bootcamp_ai';
  const LEGACY_KEY = 'sql_bootcamp_api_key';

  const LOCAL_PRESETS = [
    { id: 'ollama',   name: 'Ollama',    url: 'http://localhost:11434/v1' },
    { id: 'lmstudio', name: 'LM Studio', url: 'http://localhost:1234/v1' },
    { id: 'llamacpp', name: 'llama.cpp', url: 'http://localhost:8080/v1' },
    { id: 'jan',      name: 'Jan',       url: 'http://localhost:1337/v1' }
  ];

  const DEFAULTS = {
    provider: 'local',                         // 'local' | 'anthropic'
    localUrl: LOCAL_PRESETS[0].url,
    localModel: '',
    localKey: '',                              // only for servers that want a bearer token
    anthropicKey: '',
    anthropicModel: 'claude-opus-4-8'
  };

  let cfg = null;

  function load() {
    if (cfg) return cfg;
    cfg = Object.assign({}, DEFAULTS);
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { saved = null; }
    if (saved && typeof saved === 'object') {
      Object.assign(cfg, saved);
    } else {
      // First run after upgrading: keep an existing Anthropic key working.
      let legacy = '';
      try { legacy = localStorage.getItem(LEGACY_KEY) || ''; } catch {}
      if (legacy) { cfg.anthropicKey = legacy; cfg.provider = 'anthropic'; }
    }
    return cfg;
  }

  function save(patch) {
    load();
    Object.assign(cfg, patch || {});
    cfg.localUrl = String(cfg.localUrl || '').trim().replace(/\/+$/, '');
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
      if (cfg.anthropicKey) localStorage.setItem(LEGACY_KEY, cfg.anthropicKey);
    } catch {}
    return cfg;
  }

  function config() { return Object.assign({}, load()); }

  function ready() {
    const c = load();
    if (c.provider === 'anthropic') return /^sk-ant-/.test(c.anthropicKey || '');
    return !!(c.localUrl && c.localModel);
  }

  function label() {
    const c = load();
    if (c.provider === 'anthropic') return `Anthropic · ${c.anthropicModel}`;
    return `Local · ${c.localModel || 'no model selected'}`;
  }

  // Human-readable explanation for a failed request.
  function explainFailure(err, c) {
    const msg = (err && err.message) || String(err);
    if (c.provider === 'local' && (err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(msg))) {
      return `Couldn't reach ${c.localUrl}. Either no model server is running there, or the browser blocked the request (CORS). ` +
             `Ollama: start it, and if it's still blocked set the environment variable OLLAMA_ORIGINS=* and restart Ollama. ` +
             `LM Studio: start the local server and turn on "Enable CORS" in its server settings.`;
    }
    if (err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(msg)) {
      return `Couldn't reach the Anthropic API — check your internet connection.`;
    }
    return msg;
  }

  async function readError(resp) {
    let detail = '';
    try {
      const body = await resp.json();
      detail = (body && body.error && (body.error.message || body.error)) || body.message || '';
      if (typeof detail !== 'string') detail = JSON.stringify(detail);
    } catch {}
    return new Error(`${resp.status} ${resp.statusText || ''}${detail ? ' — ' + detail : ''}`.trim());
  }

  // Reasoning models wrap their scratch work in <think>…</think>; hide it.
  function clean(text) {
    return String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*?<\/think>/i, '').trim();
  }

  // chat({ system, messages:[{role:'user'|'assistant', content}], maxTokens, temperature }) → string
  // Throws an Error whose message is safe to show to the user.
  async function chat(opts) {
    const c = load();
    const system = opts.system || '';
    const messages = (opts.messages || []).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }));
    const maxTokens = opts.maxTokens || 400;
    if (!ready()) throw new Error('No AI model is configured yet.');
    try {
      if (c.provider === 'anthropic') {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': c.anthropicKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({ model: c.anthropicModel, max_tokens: maxTokens, system, messages })
        });
        if (!resp.ok) throw await readError(resp);
        const data = await resp.json();
        const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
        if (!text) throw new Error('The model returned an empty reply.');
        return clean(text);
      }
      const headers = { 'Content-Type': 'application/json' };
      if (c.localKey) headers.Authorization = `Bearer ${c.localKey}`;
      const resp = await fetch(`${c.localUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: c.localModel,
          messages: (system ? [{ role: 'system', content: system }] : []).concat(messages),
          max_tokens: maxTokens,
          temperature: opts.temperature === undefined ? 0.4 : opts.temperature,
          stream: false
        })
      });
      if (!resp.ok) throw await readError(resp);
      const data = await resp.json();
      const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!text) throw new Error('The model returned an empty reply.');
      return clean(text);
    } catch (e) {
      throw new Error(explainFailure(e, c));
    }
  }

  // Ask a local server which models it has (GET /v1/models). → [id, …]
  async function listLocalModels(url) {
    const c = load();
    const base = String(url || c.localUrl || '').trim().replace(/\/+$/, '');
    try {
      const headers = {};
      if (c.localKey) headers.Authorization = `Bearer ${c.localKey}`;
      const resp = await fetch(`${base}/models`, { headers });
      if (!resp.ok) throw await readError(resp);
      const data = await resp.json();
      return ((data && data.data) || []).map(m => m.id).filter(Boolean);
    } catch (e) {
      throw new Error(explainFailure(e, Object.assign({}, c, { provider: 'local', localUrl: base })));
    }
  }

  return { config, save, ready, label, chat, listLocalModels, LOCAL_PRESETS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = AI;
