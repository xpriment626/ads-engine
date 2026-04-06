import type { ModelAdapter, GenerateInput } from "./types.js";

export const fluxKontextPro: ModelAdapter = {
  buildInput(input: GenerateInput) {
    const params: Record<string, unknown> = {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio ?? "match_input_image",
      output_format: input.outputFormat ?? "png",
    };

    if (input.seed !== undefined) params.seed = input.seed;

    // Kontext takes a single input_image, not an array
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
