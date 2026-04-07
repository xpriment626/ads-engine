export interface GenerateInput {
  prompt: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  resolution?: string;
  seed?: number;
  referenceImages?: string[]; // URLs or base64 data URIs
  outputFormat?: string;
  numOutputs?: number;
  quality?: string;
  background?: string;
  // Model-specific overrides — passed through as-is
  extra?: Record<string, unknown>;
}

export interface GenerateOutput {
  urls: string[];
  model: string;
  input: Record<string, unknown>;
}

export interface ModelAdapter {
  validate(input: GenerateInput): void;
  buildInput(input: GenerateInput): Record<string, unknown>;
  parseOutput(output: unknown): string[];
}

// Helpers

export class ValidationError extends Error {
  constructor(model: string, message: string) {
    super(`[${model}] ${message}`);
    this.name = "ValidationError";
  }
}

export function assertEnum(
  model: string,
  field: string,
  value: string | undefined,
  allowed: readonly string[]
): void {
  if (value !== undefined && !allowed.includes(value)) {
    throw new ValidationError(
      model,
      `Invalid ${field}: "${value}". Allowed: ${allowed.join(", ")}`
    );
  }
}

export function assertNoRefs(model: string, input: GenerateInput): void {
  if (input.referenceImages?.length) {
    throw new ValidationError(model, "This model does not support reference images");
  }
}

export function assertMaxRefs(
  model: string,
  input: GenerateInput,
  max: number
): void {
  if (input.referenceImages && input.referenceImages.length > max) {
    throw new ValidationError(
      model,
      `Maximum ${max} reference image(s). Got ${input.referenceImages.length}`
    );
  }
}
