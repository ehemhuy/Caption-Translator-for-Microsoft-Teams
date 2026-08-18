# Caption Translator for Microsoft Teams

_Not affiliated with, endorsed by, or sponsored by Microsoft Corporation._

Translates Microsoft Teams live captions (web version) into Vietnamese using any
endpoint that speaks the OpenAI API: Ollama, OpenAI, LM Studio, vLLM, OpenRouter,
Groq... or a local LibreTranslate.

## Install

1. `chrome://extensions` (or `edge://extensions`) → enable **Developer mode** →
   **Load unpacked** → pick this folder.
2. Click the extension icon → pick a **Provider** (the URL is prefilled) →
   **Test** → **Save**. Chrome asks for access to that one endpoint the first
   time — allow it, or nothing can be translated. Changing the URL later means
   pressing **Save** again to grant the new host.

   - **Ollama** — `OLLAMA_ORIGINS='chrome-extension://*' ollama serve`, model
     `qwen2.5:3b` (runs on CPU only too, ~1.5-2s per sentence).
   - **LibreTranslate** — `docker run -d -p 5000:5000 libretranslate/libretranslate --load-only en,vi`.
     Much faster, but it is a plain translation model: fine on normal sentences,
     wrong on office slang ("circle back on the blockers" → "vòng lại trên cột chắn").
   - **Other** — any OpenAI-compatible endpoint, fill the URL in by hand.
3. Join a Teams meeting in the **browser** and turn on **More → Language and
   speech → Turn on live captions**. A floating panel appears in the bottom
   right corner and fills with translations as captions arrive (speaker name +
   translated line). Drag it by the title bar, resize it from the corner, click
   `×` to hide it, and bring it back with the checkbox in the popup.

## If the provider returns 403

Some gateways (e.g. tokenrouter) block `Origin: chrome-extension://<id>` — the
same request passes once the `Origin` header is dropped. [background.js](background.js)
uses declarativeNetRequest to strip `Origin` for the API host only, and only for
requests coming from the service worker. Nothing else to do.

Ollama blocks origins differently and needs:

```bash
OLLAMA_ORIGINS='chrome-extension://*' ollama serve
```

## Notes

- Captions are typed out word by word, so a line is only translated after it has
  been quiet for 900ms (`DEBOUNCE_MS` in [content.js](content.js)); a cache keeps
  old sentences from being translated twice.
- The Teams **desktop app** is not supported — the extension only runs in a browser.
- If Teams changes its DOM, edit `Caption selector` in the options; no rebuild needed.
- `node test.mjs` checks the URL normalisation.
