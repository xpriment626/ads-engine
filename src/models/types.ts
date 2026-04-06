export interface GenerateInput {
  prompt: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  resolution?: string;
  seed?: number;
  referenceImages?: string[]; // URLs or base64 data URIs
  outputFormat?: string;
  // Model-specific overrides — passed through as-is
  extra?: Record<string, unknown>;
}

export interface GenerateOutput {
  urls: string[];
  model: string;
  input: Record<string, unknown>;
}

export interface ModelAdapter {
  buildInput(input: GenerateInput): Record<string, unknown>;
  parseOutput(output: unknown): string[];
}
