// node bench.mjs [model...] — do toc do + xem chat luong dich tren cau caption that.
// Goi dung endpoint/prompt ma extension dung, de so do khop voi luc chay that.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("lib.js", import.meta.url), "utf8");
const { DEFAULTS, chatUrl } = new Function(src + ";return {DEFAULTS, chatUrl}")();

const MODELS = process.argv.slice(2);
if (!MODELS.length) {
  console.error("usage: node bench.mjs qwen2.5:3b hf.co/...:Q4_K_M");
  process.exit(1);
}

const SAMPLES = [
  "The meeting starts in five minutes. Can everyone hear me clearly?",
  "Let's circle back on the deployment blockers after the standup.",
  "I'll take an action item to sync with the infra team about the rollout.",
  "We're seeing a spike in p99 latency since yesterday's release.",
];

const url = chatUrl(DEFAULTS.baseUrl);

async function ask(model, text) {
  const t0 = process.hrtime.bigint();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      stream: false,
      messages: [
        { role: "system", content: DEFAULTS.systemPrompt },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { ms, out: (data.choices?.[0]?.message?.content || "").trim() };
}

for (const model of MODELS) {
  console.log(`\n=== ${model} ===`);
  await ask(model, "warmup").catch(() => {}); // lan dau phai load model vao RAM
  const times = [];
  for (const s of SAMPLES) {
    const { ms, out } = await ask(model, s);
    times.push(ms);
    console.log(`[${(ms / 1000).toFixed(2)}s] ${s}\n         → ${out}`);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`trung bình: ${(avg / 1000).toFixed(2)}s/câu`);
}
