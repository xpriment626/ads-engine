import type { ModelAdapter, GenerateInput } from "./types.js";

export const gptImage: ModelAdapter = {
  buildInput(input: GenerateInput) {
    const params: Record<string, unknown> = {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio ?? "1:1",
      quality: "auto",
      output_format: input.outputFormat ?? "webp",
      number_of_images: 1,
      background: "auto",
      moderation: "auto",
    };

    if (input.referenceImages?.length) {
      params.input_images = input.referenceImages;
    }

    return { ...params, ...input.extra };
  },

  parseOutput(output: unknown): string[] {
    // GPT Image returns uri[] — array of FileOutput
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
