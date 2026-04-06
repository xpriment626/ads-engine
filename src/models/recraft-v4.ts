import type { ModelAdapter, GenerateInput } from "./types.js";

function buildRecraftInput(input: GenerateInput): Record<string, unknown> {
  const params: Record<string, unknown> = {
    prompt: input.prompt,
  };

  if (input.aspectRatio) {
    params.aspect_ratio = input.aspectRatio;
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
  buildInput: buildRecraftInput,
  parseOutput: parseRecraftOutput,
};

export const recraftV4Svg: ModelAdapter = {
  buildInput: buildRecraftInput,
  parseOutput: parseRecraftOutput,
};
