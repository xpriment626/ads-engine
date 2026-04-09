import {
  type ModelAdapter,
  type GenerateInput,
  assertEnum,
  assertMaxRefs,
} from "./types.js";

const ASPECT_RATIOS = [
  "match_input_image",
  "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9",
] as const;

const RESOLUTIONS = ["1K", "2K", "4K"] as const;

const OUTPUT_FORMATS = ["jpg", "png"] as const;

export const nanaBananaPro: ModelAdapter = {
  validate(input: GenerateInput) {
    assertEnum("nano-banana-pro", "aspectRatio", input.aspectRatio, ASPECT_RATIOS);
    assertEnum("nano-banana-pro", "resolution", input.resolution, RESOLUTIONS);
    assertEnum("nano-banana-pro", "outputFormat", input.outputFormat, OUTPUT_FORMATS);
    assertMaxRefs("nano-banana-pro", input, 14);
  },

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
