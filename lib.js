// Shared config + URL helper. Loaded by background.js (importScripts) and test.mjs.

const DEFAULTS = {
  enabled: true,
  provider: "ollama", // ollama | libretranslate | other
  baseUrl: "http://localhost:11434/v1",
  apiKey: "",
  model: "qwen2.5:7b",
  systemPrompt:
    "You translate live meeting captions into Vietnamese. Output ONLY the Vietnamese translation, no notes, no quotes, no original text. Keep proper nouns and technical terms as-is.",
  // The Teams DOM changes over time -> expose a knob so it can be fixed without a rebuild.
  captionSelector: '[data-tid="closed-caption-text"]',
  authorSelector: '[data-tid="author"], [class*="author"], [class*="Author"]',
};

// Accepts "http://host:11434", ".../v1", or a full ".../v1/chat/completions".
function chatUrl(baseUrl) {
  const u = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/.test(u)) return u;
  if (/\/v\d+$/.test(u)) return u + "/chat/completions";
  return u + "/v1/chat/completions";
}

// LibreTranslate: "http://localhost:5000" -> ".../translate".
function libreUrl(baseUrl) {
  const u = String(baseUrl || "").trim().replace(/\/+$/, "");
  return /\/translate$/.test(u) ? u : u + "/translate";
}
