import {
  type ModelAdapter,
  type GenerateInput,
  ValidationError,
  assertEnum,
  assertMaxRefs,
} from "./types.js";

const ASPECT_RATIOS = [
  "match_input_image", "custom",
  "1:1", "16:9", "3:2", "2:3", "4:5", "5:4", "9:16", "3:4", "4:3",
] as const;

const RESOLUTIONS = [
  "match_input_image", "0.5 MP", "1 MP", "2 MP", "4 MP",
] as const;

const OUTPUT_FORMATS = ["webp", "jpg", "png"] as const;

export const flux2Pro: ModelAdapter = {
  validate(input: GenerateInput) {
    assertEnum("flux-2-pro", "aspectRatio", input.aspectRatio, ASPECT_RATIOS);
    assertEnum("flux-2-pro", "resolution", input.resolution, RESOLUTIONS);
    assertEnum("flux-2-pro", "outputFormat", input.outputFormat, OUTPUT_FORMATS);
    assertMaxRefs("flux-2-pro", input, 8);

    if (input.aspectRatio === "custom") {
      if (!input.width || !input.height) {
        throw new ValidationError("flux-2-pro", "width and height are required when aspectRatio is 'custom'");
      }
      if (input.width < 256 || input.width > 2048) {
        throw new ValidationError("flux-2-pro", `width must be 256-2048. Got ${input.width}`);
      }
      if (input.height < 256 || input.height > 2048) {
        throw new ValidationError("flux-2-pro", `height must be 256-2048. Got ${input.height}`);
      }
    }
  },

  buildInput(input: GenerateInput) {
    const params: Record<string, unknown> = {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio ?? "1:1",
      output_format: input.outputFormat ?? "webp",
    };

    if (input.aspectRatio === "custom") {
      params.width = input.width;
      params.height = input.height;
    } else {
      params.resolution = input.resolution ?? "1 MP";
    }

    if (input.seed !== undefined) params.seed = input.seed;

    if (input.referenceImages?.length) {
      params.input_images = input.referenceImages;
    }

    return { ...params, ...input.extra };
  },

  parseOutput(output: unknown): string[] {
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
