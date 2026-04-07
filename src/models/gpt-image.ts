import {
  type ModelAdapter,
  type GenerateInput,
  ValidationError,
  assertEnum,
} from "./types.js";

// GPT Image 1.5 only supports 3 aspect ratios
const ASPECT_RATIOS = ["1:1", "3:2", "2:3"] as const;

const OUTPUT_FORMATS = ["png", "jpeg", "webp"] as const;

const QUALITY_LEVELS = ["low", "medium", "high", "auto"] as const;

const BACKGROUND_MODES = ["auto", "transparent", "opaque"] as const;

export const gptImage: ModelAdapter = {
  validate(input: GenerateInput) {
    assertEnum("gpt-image", "aspectRatio", input.aspectRatio, ASPECT_RATIOS);
    assertEnum("gpt-image", "outputFormat", input.outputFormat, OUTPUT_FORMATS);
    assertEnum("gpt-image", "quality", input.quality, QUALITY_LEVELS);
    assertEnum("gpt-image", "background", input.background, BACKGROUND_MODES);

    if (input.numOutputs !== undefined) {
      if (input.numOutputs < 1 || input.numOutputs > 10) {
        throw new ValidationError("gpt-image", `numOutputs must be 1-10. Got ${input.numOutputs}`);
      }
    }

    if (input.background === "transparent" && input.outputFormat === "jpeg") {
      throw new ValidationError(
        "gpt-image",
        "Transparent background requires png or webp output format, not jpeg"
      );
    }
  },

  buildInput(input: GenerateInput) {
    const params: Record<string, unknown> = {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio ?? "1:1",
      quality: input.quality ?? "auto",
      output_format: input.outputFormat ?? "webp",
      number_of_images: input.numOutputs ?? 1,
      background: input.background ?? "auto",
      moderation: "low",
    };

    if (input.referenceImages?.length) {
      params.input_images = input.referenceImages;
    }

    return { ...params, ...input.extra };
  },

  parseOutput(output: unknown): string[] {
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
