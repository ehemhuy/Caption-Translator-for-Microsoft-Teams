// Watches Teams captions, translates them and mirrors them into a separate
// floating panel (name + translated line). The panel lives in a shadow DOM:
// Teams CSS cannot bleed in, and the document MutationObserver cannot see the
// shadow root -> no self-triggering loop.

const DEBOUNCE_MS = 900; // captions type out word by word -> wait 900ms of silence before translating
const state = new WeakMap(); // caption el -> { src, timer, busy, row }
const cache = new Map(); // source text -> translation

let cfg = { ...DEFAULTS };
const load = () =>
  chrome.storage.sync.get(DEFAULTS).then((v) => {
    cfg = v;
    if (cfg.enabled) hint();
    else if (ui.root) {
      ui.root.hidden = true;
      ui.list.innerHTML = '<div class="empty"></div>'; // start clean when re-enabled
    }
  });
load();
chrome.storage.onChanged.addListener(load);

// Show the panel right away: without it there is no way to tell the script is running.
function hint() {
  const { list } = ui();
  ui.root.hidden = false;
  const empty = list.querySelector(".empty");
  if (!empty) return; // translations are already showing
  empty.textContent = document.querySelector(cfg.captionSelector)
    ? "Waiting for captions..."
    : "No caption element found. Turn on live captions in Teams, or fix the Caption selector in options.";
}

const CSS = `
.panel {
  position: fixed; right: 16px; bottom: 96px; z-index: 2147483647;
  width: 360px; height: 280px; min-width: 220px; min-height: 120px;
  display: flex; flex-direction: column; resize: both; overflow: hidden;
  font: 14px/1.4 system-ui, sans-serif; color: #242424;
  background: #fff; border: 1px solid #d1d1d1; border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,.24);
}
.head {
  display: flex; align-items: center; gap: 8px; padding: 6px 10px;
  background: #f0f0f0; border-bottom: 1px solid #d1d1d1;
  cursor: move; user-select: none; font-weight: 600; font-size: 13px;
}
.head button {
  margin-left: auto; border: 0; background: none; cursor: pointer;
  font-size: 16px; line-height: 1; color: inherit; padding: 2px 4px;
}
.list { flex: 1; overflow-y: auto; padding: 8px 10px; }
.row { margin-bottom: 10px; }
.name { font-weight: 600; font-size: 12px; color: #616161; }
.text { white-space: pre-wrap; overflow-wrap: anywhere; }
.pending { opacity: .5; font-style: italic; }
.err { color: #c4314b; }
.empty { color: #888; font-size: 12px; }
@media (prefers-color-scheme: dark) {
  .panel { background: #292929; color: #f5f5f5; border-color: #444 }
  .head { background: #1f1f1f; border-color: #444 }
  .name { color: #adadad }
}
`;

// Shared panel, created once.
function ui() {
  if (ui.root?.isConnected) return ui;
  const host = document.createElement("div");
  host.id = "tmlt-host";
  const sr = host.attachShadow({ mode: "open" });
  sr.innerHTML = `<style>${CSS}</style>
    <div class="panel">
      <div class="head">Translation<button title="Hide">×</button></div>
      <div class="list"><div class="empty">Waiting for captions...</div></div>
    </div>`;
  document.documentElement.append(host);
  ui.root = host;
  ui.panel = sr.querySelector(".panel");
  ui.list = sr.querySelector(".list");
  ui.root.hidden = !cfg.enabled;
  sr.querySelector("button").onclick = () => chrome.storage.sync.set({ enabled: false });
  drag(sr.querySelector(".head"), ui.panel);
  return ui;
}

function drag(handle, panel) {
  handle.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    const r = panel.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    const move = (ev) => {
      panel.style.left = ev.clientX - dx + "px";
      panel.style.top = ev.clientY - dy + "px";
      panel.style.right = panel.style.bottom = "auto";
    };
    const up = () => {
      removeEventListener("mousemove", move);
      removeEventListener("mouseup", up);
    };
    addEventListener("mousemove", move);
    addEventListener("mouseup", up);
    e.preventDefault();
  });
}

function rowFor(el, st, speaker) {
  const { list } = ui();
  if (!st.row?.isConnected) {
    list.querySelector(".empty")?.remove();
    st.row = document.createElement("div");
    st.row.className = "row";
    st.row.innerHTML = `<div class="name"></div><div class="text"></div>`;
    list.append(st.row);
  }
  st.row.querySelector(".name").textContent = speaker;
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
  const text = st.row.querySelector(".text");
  return { text, scroll: () => atBottom && (list.scrollTop = list.scrollHeight) };
}

// The Teams caption DOM keeps changing -> don't assume a structure, just walk up
// to the NEAREST ancestor that has an author. Nearest = the right person, not a
// neighbouring caption's.
function speakerOf(el) {
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    const a = n.querySelector(cfg.authorSelector);
    if (a) return a.textContent.trim();
  }
  return "";
}

async function run(el) {
  const st = state.get(el);
  if (!st || st.busy || !cfg.enabled) return;
  const src = el.innerText.trim();
  if (!src || src === st.src) return;
  st.src = src;

  const { text, scroll } = rowFor(el, st, speakerOf(el));
  if (cache.has(src)) {
    text.className = "text";
    text.textContent = cache.get(src);
    return scroll();
  }

  st.busy = true;
  text.className = "text pending";
  text.textContent = src; // show the original while translating
  scroll();
  try {
    const r = await chrome.runtime.sendMessage({ type: "translate", text: src });
    if (r?.error) {
      text.className = "text err";
      text.textContent = "⚠ " + r.error;
    } else if (r?.text) {
      if (cache.size > 500) cache.clear();
      cache.set(src, r.text);
      text.className = "text";
      text.textContent = r.text;
    }
  } catch (e) {
    text.className = "text err";
    text.textContent = "⚠ " + (e.message || e);
  } finally {
    st.busy = false;
    scroll();
    schedule(el); // the caption may have grown while translating
  }
}

function schedule(el) {
  let st = state.get(el);
  if (!st) state.set(el, (st = {}));
  clearTimeout(st.timer);
  st.timer = setTimeout(() => run(el), DEBOUNCE_MS);
}

// Users usually turn live captions on after the page has loaded -> refresh the hint.
const poll = setInterval(() => {
  if (!ui.root?.isConnected || !ui.list.querySelector(".empty")) clearInterval(poll);
  else if (cfg.enabled) hint();
}, 3000);

new MutationObserver((muts) => {
  if (!cfg.enabled) return;
  for (const m of muts) {
    const node = m.target.nodeType === 1 ? m.target : m.target.parentElement;
    if (!node || node.id === "tmlt-host") continue;
    const own = node.closest?.(cfg.captionSelector);
    if (own) schedule(own);
    else node.querySelectorAll?.(cfg.captionSelector).forEach(schedule);
  }
}).observe(document.documentElement, { childList: true, characterData: true, subtree: true });
