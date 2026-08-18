const $ = (id) => document.getElementById(id);
const KEYS = Object.keys(DEFAULTS);
const val = (k, v) => (k === "enabled" ? ($(k).checked = v) : ($(k).value = v));
const get = (k) => (k === "enabled" ? $(k).checked : $(k).value);

// Per provider: prefilled URL + how to run the server. LibreTranslate ignores
// model/systemPrompt (it is a plain translation model, not an LLM) -> hide them.
const PROVIDERS = {
  ollama: {
    url: "http://localhost:11434/v1",
    note: "Run: <code>OLLAMA_ORIGINS='chrome-extension://*' ollama serve</code> · suggested model: <code>qwen2.5:3b</code>",
  },
  libretranslate: {
    url: "http://localhost:5000",
    note: "Run: <code>docker run -d -p 5000:5000 libretranslate/libretranslate --load-only en,vi</code> · much faster, but mangles office slang",
  },
  other: {
    url: "",
    note: "Any endpoint that speaks the OpenAI API: OpenAI, LM Studio, vLLM, OpenRouter, Groq...",
  },
};

function applyProvider(fillUrl) {
  const name = $("provider").value;
  const p = PROVIDERS[name] || PROVIDERS.other;
  $("note").innerHTML = p.note;
  $("llmOnly").hidden = name === "libretranslate";
  if (fillUrl && p.url) $("baseUrl").value = p.url;
}

$("provider").onchange = () => applyProvider(true);

chrome.storage.sync.get(DEFAULTS).then((cfg) => {
  KEYS.forEach((k) => val(k, cfg[k]));
  applyProvider(false); // keep the saved URL
});

// Host access is optional: the endpoint is whatever the user typed, so ask for
// that one origin on the click that needs it. Settings are written BEFORE the
// prompt -- Chrome closes this popup when the dialog opens, so nothing typed
// may be lost; reopening shows the (now granted) state.
function originOf(baseUrl) {
  try {
    return new URL(baseUrl).origin + "/*";
  } catch {
    return null;
  }
}

async function persist() {
  await chrome.storage.sync.set(Object.fromEntries(KEYS.map((k) => [k, get(k)])));
  const origin = originOf(get("baseUrl"));
  if (!origin) return "✗ Not a valid base URL";
  const perm = { origins: [origin] };
  if (await chrome.permissions.contains(perm)) return null;
  return (await chrome.permissions.request(perm)) ? null : "✗ Access to " + origin + " denied";
}

$("save").onclick = async () => {
  $("status").textContent = (await persist()) || "Saved ✓";
};

$("test").onclick = async () => {
  const denied = await persist();
  if (denied) return ($("status").textContent = denied);
  $("status").textContent = "Testing...";
  const r = await chrome.runtime.sendMessage({
    type: "translate",
    text: "Hello everyone, can you hear me?",
  });
  $("status").textContent = r?.error ? "✗ " + r.error : "✓ " + r.text;
};
