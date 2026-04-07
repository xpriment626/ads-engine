/**
 * Control test: single refined prompt across 5 compatible models.
 * Downloads outputs to output/ folder automatically.
 */

import { writeFile } from "fs/promises";
import { resolve } from "path";

const BASE = "http://127.0.0.1:3100";
const OUT_DIR = resolve(import.meta.dirname, "../output");

const PROMPT =
  "A high-end shapewear photoshoot featuring four female models standing in a clean, minimalist studio. The models wear matching pastel-colored shapewear — soft lavender, blush pink, mint green, and pale peach. Studio lighting with soft shadows, editorial fashion photography style, full body shot, white cyclorama background, 85mm lens, shallow depth of field.";

const models = [
  "flux-schnell",
  "flux-2-pro",
  "recraft-v4",
  "nano-banana-pro",
  "gpt-image",
];

console.log(`\n  Prompt: "${PROMPT.slice(0, 80)}..."\n`);
console.log(`  Models: ${models.join(", ")}\n`);

const results: { model: string; url: string; time: string; file: string }[] = [];

for (const model of models) {
  process.stdout.write(`  [....] ${model}...`);
  const start = Date.now();

  try {
    const res = await fetch(`${BASE}/generate/${model}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: PROMPT,
        aspectRatio: model === "gpt-image" ? "3:2" : "16:9",
      }),
    });

    const data = (await res.json()) as { urls?: string[]; error?: string };
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (!res.ok) {
      console.log(`\r  [FAIL] ${model} — ${data.error} (${elapsed}s)`);
    } else {
      const url = data.urls?.[0] ?? "";
      const ext = url.match(/\.(webp|png|jpg|jpeg|svg)(\?|$)/)?.[1] ?? "webp";
      const filename = `shapewear-${model}.${ext}`;
      const filePath = resolve(OUT_DIR, filename);

      // Download the image
      const imgRes = await fetch(url);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      await writeFile(filePath, buf);

      results.push({ model, url, time: elapsed, file: filename });
      console.log(`\r  [ OK ] ${model} — ${elapsed}s → ${filename}`);
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `\r  [ERR ] ${model} — ${err instanceof Error ? err.message : err} (${elapsed}s)`
    );
  }
  console.log();
}

console.log("\n  === Results ===\n");
for (const r of results) {
  console.log(`  ${r.model} (${r.time}s) → output/${r.file}`);
}
console.log();
