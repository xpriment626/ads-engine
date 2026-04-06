/**
 * Quick smoke test — hits each model with a simple prompt.
 * Make sure the server is running first: npm run dev
 *
 * Usage: npx tsx scripts/test-all.ts
 */

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";

const tests = [
  {
    model: "flux-schnell",
    prompt: "a retro gaming console on a desk, isometric illustration, warm lighting",
    note: "cheapest/fastest — sanity check",
  },
  {
    model: "flux-2-pro",
    prompt: "a premium skincare product bottle on marble surface, soft studio lighting, product photography",
    note: "production quality",
  },
  {
    model: "recraft-v4",
    prompt: "minimalist banner ad for a coffee brand, warm earth tones, clean typography reading 'Wake Up'",
    note: "design-first with text",
  },
  {
    model: "recraft-v4-svg",
    prompt: "flat geometric mountain logo, three peaks, sunset gradient, vector style",
    note: "native SVG output",
  },
  {
    model: "nano-banana-pro",
    prompt: "isometric illustration of a cozy home office setup with a laptop, plants, and warm lighting",
    note: "Gemini-powered reasoning",
  },
  {
    model: "gpt-image",
    prompt: "a social media ad for a fitness app, bold modern design, text reading 'Start Today', energetic colors",
    note: "OpenAI — best prompt following",
  },
];

console.log(`\n  Testing ${tests.length} models against ${BASE}\n`);

for (const test of tests) {
  const label = `${test.model} (${test.note})`;
  console.log(`  [${"."} ] ${label}...`);

  const start = Date.now();
  try {
    const res = await fetch(`${BASE}/generate/${test.model}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: test.prompt }),
    });

    const data = (await res.json()) as { urls?: string[]; error?: string };
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (!res.ok) {
      console.log(`  [FAIL] ${label} — ${data.error} (${elapsed}s)`);
    } else {
      console.log(`  [ OK ] ${label} — ${elapsed}s`);
      data.urls?.forEach((url) => console.log(`         ${url}`));
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  [ERR ] ${label} — ${err instanceof Error ? err.message : err} (${elapsed}s)`);
  }
  console.log();
}

console.log("  Done.\n");
