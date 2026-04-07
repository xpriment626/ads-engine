import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { generate } from "./generate.js";
import { models, listModels } from "./models/registry.js";
import { type GenerateInput, ValidationError } from "./models/types.js";

// Load .env
import { readFileSync } from "fs";
import { resolve } from "path";
try {
  const envPath = resolve(import.meta.dirname, "../.env");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env not found — rely on environment
}

const app = new Hono();

// List available models
app.get("/models", (c) => {
  return c.json(listModels());
});

// Get single model info
app.get("/models/:key", (c) => {
  const key = c.req.param("key");
  const model = models[key];
  if (!model) return c.json({ error: `Unknown model: ${key}` }, 404);
  return c.json(model);
});

// Generate an image
app.post("/generate/:model", async (c) => {
  const modelKey = c.req.param("model");
  const body = (await c.req.json()) as GenerateInput;

  if (!body.prompt) {
    return c.json({ error: "prompt is required" }, 400);
  }

  try {
    const result = await generate(modelKey, body);
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof ValidationError ? 400 : 500;
    console.error(`[server] Error:`, message);
    return c.json({ error: message }, status);
  }
});

const PORT = parseInt(process.env.PORT ?? "3100", 10);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\n  image-engine running on http://127.0.0.1:${PORT}`);
  console.log(`  models: ${Object.keys(models).join(", ")}\n`);
});
