import {
  type ModelAdapter,
  type GenerateInput,
  assertEnum,
  assertMaxRefs,
} from "./types.js";

const ASPECT_RATIOS = [
  "match_input_image",
  "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3",
  "4:5", "5:4", "21:9", "9:21", "2:1", "1:2",
] as const;

const OUTPUT_FORMATS = ["jpg", "png"] as const;

export const fluxKontextPro: ModelAdapter = {
  validate(input: GenerateInput) {
    assertEnum("flux-kontext-pro", "aspectRatio", input.aspectRatio, ASPECT_RATIOS);
    assertEnum("flux-kontext-pro", "outputFormat", input.outputFormat, OUTPUT_FORMATS);
    assertMaxRefs("flux-kontext-pro", input, 1);
  },

  buildInput(input: GenerateInput) {
    const params: Record<string, unknown> = {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio ?? "match_input_image",
      output_format: input.outputFormat ?? "png",
      safety_tolerance: input.referenceImages?.length ? 2 : 6,
    };

    if (input.seed !== undefined) params.seed = input.seed;

    if (input.referenceImages?.length) {
      params.input_image = input.referenceImages[0];
    }

    return { ...params, ...input.extra };
  },

  parseOutput(output: unknown): string[] {
    if (output && typeof output === "object" && "url" in output) {
      return [(output as { url: () => string }).url()];
    }
    return [String(output)];
  },
};
