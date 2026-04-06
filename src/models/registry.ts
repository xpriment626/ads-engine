export interface ModelDef {
  id: string;
  name: string;
  description: string;
  capabilities: ("generate" | "edit" | "svg")[];
  costPerImage: string;
  supportsReferenceImages: boolean;
  maxReferenceImages: number;
}

export const models: Record<string, ModelDef> = {
  "flux-2-pro": {
    id: "black-forest-labs/flux-2-pro",
    name: "FLUX.2 [pro]",
    description: "Best all-rounder. Reference images, structured prompting, text rendering.",
    capabilities: ["generate", "edit"],
    costPerImage: "$0.035",
    supportsReferenceImages: true,
    maxReferenceImages: 8,
  },
  "flux-kontext-pro": {
    id: "black-forest-labs/flux-kontext-pro",
    name: "FLUX Kontext [pro]",
    description: "Text-guided image editing. Transform images via natural language.",
    capabilities: ["edit"],
    costPerImage: "$0.04",
    supportsReferenceImages: true,
    maxReferenceImages: 1,
  },
  "recraft-v4": {
    id: "recraft-ai/recraft-v4",
    name: "Recraft V4",
    description: "Design-first. Strong composition, color control, text rendering.",
    capabilities: ["generate"],
    costPerImage: "$0.04",
    supportsReferenceImages: false,
    maxReferenceImages: 0,
  },
  "recraft-v4-svg": {
    id: "recraft-ai/recraft-v4-svg",
    name: "Recraft V4 SVG",
    description: "Native SVG output. Clean paths, structured layers, editable in Figma/Illustrator.",
    capabilities: ["generate", "svg"],
    costPerImage: "$0.08",
    supportsReferenceImages: false,
    maxReferenceImages: 0,
  },
  "nano-banana-pro": {
    id: "google/nano-banana-pro",
    name: "Nano Banana Pro (Gemini 3 Pro)",
    description: "LLM-powered generation. Reasons about prompts. Up to 14 reference images, editing, 4K.",
    capabilities: ["generate", "edit"],
    costPerImage: "~$0.04",
    supportsReferenceImages: true,
    maxReferenceImages: 14,
  },
  "gpt-image": {
    id: "openai/gpt-image-1.5",
    name: "GPT Image 1.5",
    description: "OpenAI's strongest. Best prompt following, text in images, transparent backgrounds.",
    capabilities: ["generate", "edit"],
    costPerImage: "~$0.04-0.17",
    supportsReferenceImages: true,
    maxReferenceImages: 10,
  },
  "flux-schnell": {
    id: "black-forest-labs/flux-schnell",
    name: "FLUX.1 [schnell]",
    description: "Near-instant. Great for rapid iteration before committing to expensive models.",
    capabilities: ["generate"],
    costPerImage: "$0.003",
    supportsReferenceImages: false,
    maxReferenceImages: 0,
  },
};

export function getModel(key: string): ModelDef {
  const model = models[key];
  if (!model) {
    throw new Error(
      `Unknown model "${key}". Available: ${Object.keys(models).join(", ")}`
    );
  }
  return model;
}

export function listModels(): ModelDef[] {
  return Object.values(models);
}
