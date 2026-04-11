import type { FrameNode } from "../scene-graph/types.js";
import type { TemplateMeta } from "./types.js";
import { deserializeGraph } from "../scene-graph/serialize.js";
import { readFileSync } from "fs";
import { resolve } from "path";

const TEMPLATE_DIR = resolve(import.meta.dirname, ".");

const registry: TemplateMeta[] = [
  {
    id: "hero-device",
    name: "Hero Device",
    description: "Device mockup centered, headline above, CTA below. Best for app launch announcements.",
    slots: [
      { name: "headline", nodeId: "headline", nodeType: "TEXT", description: "Main headline text" },
      { name: "device-mockup", nodeId: "device-mockup", nodeType: "IMAGE", description: "Device mockup image (composited product screenshot)" },
      { name: "cta-text", nodeId: "cta-text", nodeType: "TEXT", description: "Call to action button text" },
      { name: "cta", nodeId: "cta", nodeType: "FRAME", description: "CTA button frame (change fills for brand color)" },
    ],
  },
  {
    id: "split",
    name: "Split",
    description: "Image/mockup one side, copy + CTA other side. Best for feature highlights.",
    slots: [
      { name: "headline", nodeId: "headline", nodeType: "TEXT", description: "Main headline text" },
      { name: "subtext", nodeId: "subtext", nodeType: "TEXT", description: "Supporting body text" },
      { name: "hero-image", nodeId: "hero-image", nodeType: "IMAGE", description: "Hero image or illustration" },
      { name: "cta-text", nodeId: "cta-text", nodeType: "TEXT", description: "Call to action button text" },
      { name: "cta", nodeId: "cta", nodeType: "FRAME", description: "CTA button frame" },
    ],
  },
  {
    id: "announcement",
    name: "Announcement",
    description: "Gradient background, centered headline, logo, date. Best for event/launch announcements.",
    slots: [
      { name: "logo", nodeId: "logo", nodeType: "IMAGE", description: "Brand logo" },
      { name: "headline", nodeId: "headline", nodeType: "TEXT", description: "Announcement headline" },
      { name: "subtext", nodeId: "subtext", nodeType: "TEXT", description: "Supporting details" },
      { name: "date", nodeId: "date", nodeType: "TEXT", description: "Event date or timing" },
    ],
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Logo, single headline, accent illustration, CTA. Best for brand awareness.",
    slots: [
      { name: "logo", nodeId: "logo", nodeType: "IMAGE", description: "Brand logo (small)" },
      { name: "headline", nodeId: "headline", nodeType: "TEXT", description: "Main headline text" },
      { name: "accent-illustration", nodeId: "accent-illustration", nodeType: "IMAGE", description: "Decorative illustration or graphic" },
      { name: "cta-text", nodeId: "cta-text", nodeType: "TEXT", description: "Call to action button text" },
      { name: "cta", nodeId: "cta", nodeType: "FRAME", description: "CTA button frame" },
    ],
  },
];

export function listTemplates(): TemplateMeta[] {
  return registry;
}

export function loadTemplate(id: string): FrameNode {
  const meta = registry.find((t) => t.id === id);
  if (!meta) throw new Error(`Template "${id}" not found`);
  const filePath = resolve(TEMPLATE_DIR, `${id}.json`);
  const json = readFileSync(filePath, "utf-8");
  return deserializeGraph(json);
}
