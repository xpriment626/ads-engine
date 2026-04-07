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

  const output = await replicate().run(modelDef.id as `${string}/${string}`, {
    input: modelInput,
  });

  const urls = adapter.parseOutput(output);

  console.log(`[generate] output:`, urls);

  return { urls, model: modelKey, input: modelInput };
}
