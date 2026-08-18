// node test.mjs
import assert from "node:assert";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("lib.js", import.meta.url), "utf8");
const { chatUrl, libreUrl, DEFAULTS } = new Function(
  src + ";return {chatUrl, libreUrl, DEFAULTS}"
)();

assert.equal(chatUrl("http://localhost:11434"), "http://localhost:11434/v1/chat/completions");
assert.equal(chatUrl("http://localhost:11434/"), "http://localhost:11434/v1/chat/completions");
assert.equal(chatUrl("https://api.openai.com/v1"), "https://api.openai.com/v1/chat/completions");
assert.equal(chatUrl("https://api.openai.com/v1/"), "https://api.openai.com/v1/chat/completions");
assert.equal(
  chatUrl("https://x.dev/v1/chat/completions"),
  "https://x.dev/v1/chat/completions"
);
assert.equal(chatUrl(DEFAULTS.baseUrl), "http://localhost:11434/v1/chat/completions");
assert.equal(chatUrl(""), "/v1/chat/completions"); // garbage in -> fetch errors out, no crash

assert.equal(libreUrl("http://localhost:5000"), "http://localhost:5000/translate");
assert.equal(libreUrl("http://localhost:5000/"), "http://localhost:5000/translate");
assert.equal(libreUrl("http://localhost:5000/translate"), "http://localhost:5000/translate");

// The origin options.js asks permission for must equal the origin background.js
// actually fetches, or every translation dies on a permission error.
for (const base of ["http://localhost:11434", "https://api.openai.com/v1", DEFAULTS.baseUrl]) {
  assert.equal(new URL(chatUrl(base)).origin, new URL(base).origin);
  assert.equal(new URL(libreUrl(base)).origin, new URL(base).origin);
}
console.log("ok");
