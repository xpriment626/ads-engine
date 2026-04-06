import type { ModelAdapter, GenerateInput } from "./types.js";

export const nanaBananaPro: ModelAdapter = {
  buildInput(input: GenerateInput) {
    const params: Record<string, unknown> = {
      prompt: input.prompt,
      resolution: input.resolution ?? "2K",
      aspect_ratio: input.aspectRatio ?? "1:1",
      output_format: input.outputFormat ?? "jpg",
      safety_filter_level: "block_only_high",
    };

    if (input.referenceImages?.length) {
      params.image_input = input.referenceImages;
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
