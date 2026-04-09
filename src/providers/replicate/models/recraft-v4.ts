import {
  type ModelAdapter,
  type GenerateInput,
  ValidationError,
  assertEnum,
  assertNoRefs,
} from "./types.js";

const ASPECT_RATIOS = [
  "Not set",
  "1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16",
  "1:2", "2:1", "14:10", "10:14", "4:5", "5:4", "6:10",
] as const;

const SIZES = [
  "1024x1024", "1536x768", "768x1536", "1280x832", "832x1280",
  "1216x896", "896x1216", "1152x896", "896x1152", "832x1344",
  "1280x896", "896x1280", "1344x768", "768x1344",
] as const;

function validate(model: string, input: GenerateInput) {
  assertNoRefs(model, input);
  assertEnum(model, "aspectRatio", input.aspectRatio, ASPECT_RATIOS);

  if (input.prompt && input.prompt.length > 10_000) {
    throw new ValidationError(model, `Prompt exceeds 10,000 character limit (got ${input.prompt.length})`);
  }

  // If user passes width x height, map it to the size enum
  if (input.width && input.height) {
    const sizeStr = `${input.width}x${input.height}`;
    assertEnum(model, "size", sizeStr, SIZES);
  }
}

function buildRecraftInput(input: GenerateInput): Record<string, unknown> {
  const params: Record<string, unknown> = {
    prompt: input.prompt,
  };

  if (input.aspectRatio && input.aspectRatio !== "Not set") {
    params.aspect_ratio = input.aspectRatio;
    // size is ignored when aspect_ratio is set
  } else if (input.width && input.height) {
    params.size = `${input.width}x${input.height}`;
  } else {
    params.size = "1024x1024";
  }

  return { ...params, ...input.extra };
}

function parseRecraftOutput(output: unknown): string[] {
  if (output && typeof output === "object" && "url" in output) {
    return [(output as { url: () => string }).url()];
  }
  return [String(output)];
}

export const recraftV4: ModelAdapter = {
  validate: (input) => validate("recraft-v4", input),
  buildInput: buildRecraftInput,
  parseOutput: parseRecraftOutput,
};

export const recraftV4Svg: ModelAdapter = {
  validate: (input) => validate("recraft-v4-svg", input),
  buildInput: buildRecraftInput,
  parseOutput: parseRecraftOutput,
};
