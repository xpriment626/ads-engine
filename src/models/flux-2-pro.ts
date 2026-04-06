import type { ModelAdapter, GenerateInput } from "./types.js";

export const flux2Pro: ModelAdapter = {
  buildInput(input: GenerateInput) {
    const params: Record<string, unknown> = {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio ?? "1:1",
      resolution: input.resolution ?? "1 MP",
      output_format: input.outputFormat ?? "webp",
    };

    if (input.aspectRatio === "custom") {
      if (!input.width || !input.height) {
        throw new Error("width and height required for custom aspect ratio");
      }
      params.width = input.width;
      params.height = input.height;
    }

    if (input.seed !== undefined) params.seed = input.seed;

    if (input.referenceImages?.length) {
      params.input_images = input.referenceImages;
    }

    return { ...params, ...input.extra };
  },

  parseOutput(output: unknown): string[] {
    // Flux 2 Pro returns a single FileOutput
    if (output && typeof output === "object" && "url" in output) {
      return [(output as { url: () => string }).url()];
    }
    if (Array.isArray(output)) {
      return output.map((o) =>
        typeof o === "string" ? o : (o as { url: () => string }).url()
      );
    }
    return [String(output)];
  },
};
