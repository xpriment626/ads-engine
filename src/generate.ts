import { replicate } from "./client.js";
import { getModel } from "./models/registry.js";
import type { GenerateInput, GenerateOutput, ModelAdapter } from "./models/types.js";
import { flux2Pro } from "./models/flux-2-pro.js";
import { fluxKontextPro } from "./models/flux-kontext-pro.js";
import { recraftV4, recraftV4Svg } from "./models/recraft-v4.js";
import { nanaBananaPro } from "./models/nano-banana-pro.js";
import { gptImage } from "./models/gpt-image.js";
import { fluxSchnell } from "./models/flux-schnell.js";

const adapters: Record<string, ModelAdapter> = {
  "flux-2-pro": flux2Pro,
  "flux-kontext-pro": fluxKontextPro,
  "recraft-v4": recraftV4,
  "recraft-v4-svg": recraftV4Svg,
  "nano-banana-pro": nanaBananaPro,
  "gpt-image": gptImage,
  "flux-schnell": fluxSchnell,
};

const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(error: unknown): number | null {
  const msg = error instanceof Error ? error.message : String(error);
  // Replicate 429 responses include "retry_after" in the JSON body
  const match = msg.match(/retry.after.*?(\d+)/i);
  if (match) return parseInt(match[1], 10);
  // Also check for "resets in ~Ns" pattern
  const resetMatch = msg.match(/resets in ~(\d+)s/);
  if (resetMatch) return parseInt(resetMatch[1], 10);
  return null;
}

function is429(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("rate limit");
}

export async function generate(
  modelKey: string,
  input: GenerateInput
): Promise<GenerateOutput> {
  const modelDef = getModel(modelKey);
  const adapter = adapters[modelKey];
  if (!adapter) {
    throw new Error(`No adapter for model "${modelKey}"`);
  }

  adapter.validate(input);
  const modelInput = adapter.buildInput(input);

  console.log(`[generate] ${modelDef.name} (${modelDef.id})`);
  console.log(`[generate] input:`, JSON.stringify(modelInput, null, 2));

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const output = await replicate().run(modelDef.id as `${string}/${string}`, {
        input: modelInput,
      });

      const urls = adapter.parseOutput(output);
      console.log(`[generate] output:`, urls);
      return { urls, model: modelKey, input: modelInput };
    } catch (err) {
      lastError = err;

      if (!is429(err) || attempt === MAX_RETRIES) break;

      const retryAfter = parseRetryAfter(err) ?? 10;
      const waitMs = (retryAfter + 2) * 1000; // pad by 2s
      console.log(
        `[generate] Rate limited. Waiting ${retryAfter + 2}s before retry ${attempt + 1}/${MAX_RETRIES}...`
      );
      await sleep(waitMs);
    }
  }

  throw lastError;
}
