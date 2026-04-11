import type { FrameNode } from "./types.js";
import { frameNodeSchema } from "./schema.js";

export function serializeGraph(root: FrameNode): string {
  return JSON.stringify(root, null, 2);
}

export function deserializeGraph(json: string): FrameNode {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON");
  }
  const result = frameNodeSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid scene graph: ${result.error.issues[0].message}`);
  }
  return result.data as FrameNode;
}
