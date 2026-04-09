import {
  type ModelAdapter,
  type GenerateInput,
  ValidationError,
  assertEnum,
  assertNoRefs,
} from "./types.js";

const ASPECT_RATIOS = [
  "1:1", "16:9", "21:9", "3:2", "2:3", "4:5", "5:4", "3:4", "4:3", "9:16", "9:21",
] as const;

const OUTPUT_FORMATS = ["webp", "jpg", "png"] as const;

const MEGAPIXELS = ["1", "0.25"] as const;

export const fluxSchnell: ModelAdapter = {
  validate(input: GenerateInput) {
    assertNoRefs("flux-schnell", input);
    assertEnum("flux-schnell", "aspectRatio", input.aspectRatio, ASPECT_RATIOS);
    assertEnum("flux-schnell", "outputFormat", input.outputFormat, OUTPUT_FORMATS);
    assertEnum("flux-schnell", "resolution", input.resolution, MEGAPIXELS);

    if (input.numOutputs !== undefined) {
      if (input.numOutputs < 1 || input.numOutputs > 4) {
        throw new ValidationError("flux-schnell", `numOutputs must be 1-4. Got ${input.numOutputs}`);
      }
    }
  },

  buildInput(input: GenerateInput) {
    const params: Record<string, unknown> = {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio ?? "1:1",
      output_format: input.outputFormat ?? "webp",
      go_fast: true,
      num_outputs: input.numOutputs ?? 1,
      megapixels: input.resolution ?? "1",
      disable_safety_checker: true,
    };

    if (input.seed !== undefined) params.seed = input.seed;

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
