import type { ModelAdapter, GenerateInput } from "./types.js";

export const fluxSchnell: ModelAdapter = {
  buildInput(input: GenerateInput) {
    const params: Record<string, unknown> = {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio ?? "1:1",
      output_format: input.outputFormat ?? "webp",
      go_fast: true,
      num_outputs: 1,
    };

    if (input.seed !== undefined) params.seed = input.seed;

    return { ...params, ...input.extra };
  },

  parseOutput(output: unknown): string[] {
    // Schnell returns uri[] — array of FileOutput
    if (Array.isArray(output)) {
      return output.map((o) =>
        typeof o === "string" ? o : (o as { url: () => string }).url()
      );
    }
    if (output && typeof output === "object" && "url" in output) {
      return [(output as { url: () => string }).url()];
    }
    return [String(output)];
  },
};
