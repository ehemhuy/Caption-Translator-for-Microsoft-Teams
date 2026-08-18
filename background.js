importScripts("lib.js");

// Many gateways return 403 when they see "Origin: chrome-extension://<id>", and
// fetch() refuses to set that header -> only declarativeNetRequest can strip it.
// Scoped to the API host + tabIds [-1] (service worker requests) so we never
// touch requests made by the Teams page itself.
const RULE_ID = 1;

async function dropOriginFor(url) {
  const domain = new URL(url).hostname;
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [RULE_ID],
    addRules: [
      {
        id: RULE_ID,
        condition: {
          requestDomains: [domain],
          tabIds: [-1],
          resourceTypes: ["xmlhttprequest", "other"],
        },
        action: {
          type: "modifyHeaders",
          requestHeaders: [{ header: "origin", operation: "remove" }],
        },
      },
    ],
  });
}

async function post(url, body, headers = {}) {
  // Host access is optional and granted per endpoint from the options page.
  // Without this check the user just sees a bare "Failed to fetch".
  const origin = new URL(url).origin + "/*";
  if (!(await chrome.permissions.contains({ origins: [origin] })))
    throw new Error(`No access to ${origin}. Open the extension options and press Save to grant it.`);

  await dropOriginFor(url);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}: ${(await res.text()).slice(0, 300) || res.statusText}`);
  return res.json();
}

async function translate(text) {
  const cfg = await chrome.storage.sync.get(DEFAULTS);

  if (cfg.provider === "libretranslate") {
    const data = await post(libreUrl(cfg.baseUrl), {
      q: text,
      source: "en",
      target: "vi",
      format: "text",
      ...(cfg.apiKey ? { api_key: cfg.apiKey } : {}),
    });
    return (data.translatedText || "").trim();
  }

  const data = await post(
    chatUrl(cfg.baseUrl),
    {
      model: cfg.model,
      temperature: 0,
      stream: false,
      messages: [
        { role: "system", content: cfg.systemPrompt },
        { role: "user", content: text },
      ],
    },
    cfg.apiKey ? { Authorization: "Bearer " + cfg.apiKey } : {}
  );
  return (data.choices?.[0]?.message?.content || "").trim();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "translate") return;
  translate(msg.text).then(
    (text) => sendResponse({ text }),
    (err) => sendResponse({ error: String(err.message || err) })
  );
  return true; // async response
});
