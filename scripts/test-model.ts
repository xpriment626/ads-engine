/**
 * Test a single model via the local server.
 *
 * Usage:
 *   npx tsx scripts/test-model.ts flux-schnell "a retro gaming console, isometric illustration"
 *   npx tsx scripts/test-model.ts recraft-v4-svg "minimalist logo of a mountain, flat design"
 *   npx tsx scripts/test-model.ts flux-kontext-pro "change the orange accents to blue" --ref https://example.com/image.png
 */

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";

const args = process.argv.slice(2);
const model = args[0];
const prompt = args[1];

if (!model || !prompt) {
  console.log("Usage: npx tsx scripts/test-model.ts <model-key> <prompt> [--ref <url>] [--ratio <ratio>]");
  console.log("\nModels: flux-2-pro, flux-kontext-pro, recraft-v4, recraft-v4-svg, nano-banana-pro, gpt-image, flux-schnell");
  process.exit(1);
}

// Parse optional flags
const body: Record<string, unknown> = { prompt };

for (let i = 2; i < args.length; i++) {
  if (args[i] === "--ref" && args[i + 1]) {
    const refs = (body.referenceImages as string[]) ?? [];
    refs.push(args[++i]);
    body.referenceImages = refs;
  } else if (args[i] === "--ratio" && args[i + 1]) {
    body.aspectRatio = args[++i];
  } else if (args[i] === "--resolution" && args[i + 1]) {
    body.resolution = args[++i];
  }
}

console.log(`\n  Model:  ${model}`);
console.log(`  Prompt: "${prompt}"`);
if (body.referenceImages) console.log(`  Refs:   ${(body.referenceImages as string[]).join(", ")}`);
if (body.aspectRatio) console.log(`  Ratio:  ${body.aspectRatio}`);
console.log();

const start = Date.now();
const res = await fetch(`${BASE}/generate/${model}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const data = await res.json();
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

if (!res.ok) {
  console.error(`  ERROR (${res.status}): ${(data as { error: string }).error}`);
  process.exit(1);
}

const result = data as { urls: string[]; model: string };
console.log(`  Done in ${elapsed}s`);
result.urls.forEach((url, i) => {
  console.log(`  Output ${i + 1}: ${url}`);
});
console.log();
