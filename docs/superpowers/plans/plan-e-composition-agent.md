# Plan E: Composition Agent

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single composition agent that takes a text brief + serialized brand canvas context and produces 3 banner variations as scene graph JSON files, using Vercel AI SDK for LLM reasoning and the existing Replicate MCP server for image generation.

**Architecture:** The composition agent is a `generateText` loop powered by Vercel AI SDK with tool-use. It receives four tools (generate_image, list_templates, load_template, update_scene_graph) and a system prompt encoding template archetype knowledge and composition guidelines. The pipeline runs 3 times with explicit variation instructions, producing 3 complete scene graph JSON files. After each variation the agent self-evaluates against the brief and brand context, fixing issues before emitting output.

**Tech Stack:** Vercel AI SDK, @ai-sdk/anthropic, TypeScript, Vitest

**Phase:** 2 (depends on Plan A scene graph + existing Replicate MCP server)

**Spec reference:** [2026-04-09-brandouble-mvp-design.md](../specs/2026-04-09-brandouble-mvp-design.md)

---

## File structure

```
src/
  agent/
    system-prompt.ts      # System prompt builder with template descriptions
    tools.ts              # AI SDK tool() definitions (4 tools)
    assemble.ts           # Scene graph assembly helpers (populate slots)
    pipeline.ts           # Main composition pipeline: brief + canvas → 3 banners
    evaluate.ts           # Self-evaluation prompt builder
    types.ts              # Agent-specific types (BannerBrief, CanvasContext, etc.)
    index.ts              # Barrel export
scripts/
  test-agent.ts           # CLI test script for end-to-end run
tests/
  agent/
    tools.test.ts
    assemble.test.ts
    pipeline.test.ts
    evaluate.test.ts
```

---

### Task 1: Install AI SDK dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Vercel AI SDK and Anthropic provider**

```bash
npm install ai @ai-sdk/anthropic
```

- [ ] **Step 2: Verify installation**

Run: `node -e "require('ai'); require('@ai-sdk/anthropic'); console.log('OK')"`
Expected: "OK" — both packages resolve.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Vercel AI SDK and Anthropic provider"
```

---

### Task 2: Agent type definitions

**Files:**
- Create: `src/agent/types.ts`

- [ ] **Step 1: Define agent types**

```typescript
// src/agent/types.ts
import type { FrameNode } from "../scene-graph/types.js";

/**
 * A single asset on the brand canvas — logo, screenshot, color swatch, etc.
 * The system infers the role; users never categorize manually.
 */
export interface CanvasAsset {
  id: string;
  /** System-inferred type */
  role: "logo" | "screenshot" | "illustration" | "color-swatch" | "reference-creative" | "other";
  /** URL or data URI for image assets */
  source?: string;
  /** Hex color for color swatches */
  color?: string;
  /** Freeform note or extracted text */
  note?: string;
  /** Original filename if uploaded */
  filename?: string;
}

/**
 * Serialized brand canvas — everything the agent sees about the brand.
 * Passed as context to the composition pipeline.
 */
export interface CanvasContext {
  projectName: string;
  projectDescription: string;
  assets: CanvasAsset[];
  /** Freeform text notes from the canvas */
  notes: string[];
  /** URLs added to the canvas (product pages, references) */
  urls: string[];
}

/**
 * The user's generation request.
 */
export interface BannerBrief {
  /** The user's text prompt describing what they want */
  prompt: string;
  /** Target dimensions — defaults to Twitter/X 1200x675 */
  width?: number;
  height?: number;
  /** Number of variations to generate (default 3) */
  variationCount?: number;
}

/**
 * A single completed banner variation.
 */
export interface BannerVariation {
  /** 1-indexed variation number */
  index: number;
  /** The template archetype used */
  templateId: string;
  /** The completed scene graph */
  sceneGraph: FrameNode;
  /** Agent's reasoning for this variation */
  reasoning: string;
  /** Self-evaluation notes */
  evaluation: string;
}

/**
 * Full output of a composition pipeline run.
 */
export interface CompositionResult {
  brief: BannerBrief;
  canvas: CanvasContext;
  variations: BannerVariation[];
  /** Total time in milliseconds */
  durationMs: number;
}

/**
 * Operation type for the update_scene_graph tool.
 */
export type SceneGraphOperation =
  | { type: "insert"; parentId: string; node: Record<string, unknown> }
  | { type: "update"; nodeId: string; props: Record<string, unknown> }
  | { type: "replace"; nodeId: string; newNode: Record<string, unknown> };
```

- [ ] **Step 2: Commit**

```bash
git add src/agent/types.ts
git commit -m "feat: add composition agent type definitions"
```

---

### Task 3: Agent system prompt

**Files:**
- Create: `src/agent/system-prompt.ts`

- [ ] **Step 1: Build system prompt with template metadata**

```typescript
// src/agent/system-prompt.ts
import type { CanvasContext } from "./types.js";

/**
 * Template archetype descriptions embedded in the system prompt.
 * These must match the templates defined in src/templates/.
 */
const TEMPLATE_DESCRIPTIONS = `
## Available template archetypes

1. **hero-device** — Device mockup centered, headline above, CTA below.
   - Best for: app launch announcements, product showcases
   - Slots: headline (TEXT), device-mockup (IMAGE), cta-text (TEXT), cta (FRAME)
   - Layout: vertical center-aligned, generous padding

2. **split** — Image/mockup one side, copy + CTA other side.
   - Best for: feature highlights, product comparisons
   - Slots: headline (TEXT), subtext (TEXT), hero-image (IMAGE), cta-text (TEXT), cta (FRAME)
   - Layout: horizontal space-between, copy group left, image right

3. **announcement** — Gradient background, centered headline, logo, date.
   - Best for: event announcements, launches, major updates
   - Slots: logo (IMAGE), headline (TEXT), subtext (TEXT), date (TEXT)
   - Layout: vertical center-aligned, dark gradient background, light text

4. **minimal** — Logo, single headline, accent illustration, CTA.
   - Best for: brand awareness, simple messaging
   - Slots: logo (IMAGE), headline (TEXT), accent-illustration (IMAGE), cta-text (TEXT), cta (FRAME)
   - Layout: horizontal, left group (logo + headline + CTA), right illustration
`.trim();

const COMPOSITION_GUIDELINES = `
## Composition guidelines

### Color usage
- Extract brand colors from the canvas context (color swatches, logo colors)
- Use the primary brand color for CTA buttons and accent elements
- Ensure sufficient contrast between text and background (WCAG AA minimum)
- Background colors should complement, not compete with, the brand palette

### Typography
- Headlines: bold (700), large (40-56px depending on content length)
- Subtext: regular (400), medium (18-20px)
- CTA text: semibold (600), small-medium (14-16px)
- Keep font family consistent (Inter as default, or match brand if specified)

### Image generation
- Use flux-schnell for rapid iteration and placeholder assets
- Use recraft-v4 for final production-quality illustrations and graphics
- Use flux-2-pro for photorealistic imagery when needed
- Always include brand context in image prompts (colors, style, mood)
- Generate images at aspect ratios that match the template slot dimensions

### Layout principles
- Respect the template's auto-layout — do not fight the structure
- Populate ALL slots — no empty image sources or placeholder text in final output
- CTA text should be action-oriented (verbs: "Get Started", "Learn More", "Try Free")
- Headlines should be concise (3-7 words) and benefit-focused

### Variation strategy
- Each of the 3 variations MUST use a different template archetype
- Vary the creative direction: different color treatments, illustration styles, copy angles
- Do not produce near-identical banners — explore the design space
`.trim();

/**
 * Build the full system prompt for the composition agent.
 */
export function buildSystemPrompt(canvas: CanvasContext): string {
  const canvasSection = formatCanvasContext(canvas);

  return `You are Brandouble's composition agent — an expert visual designer that creates banner ads as scene graph JSON structures.

You have tools to generate images, load templates, and build scene graphs. Your job is to take a brief and brand context, then produce a single complete banner variation.

${TEMPLATE_DESCRIPTIONS}

${COMPOSITION_GUIDELINES}

## Brand context (from canvas)

${canvasSection}

## Your workflow

1. **Interpret the brief** — understand what the user wants, identify the key message, and determine what visual assets are needed.
2. **Select a template** — choose the archetype that best fits the brief. Use list_templates to see options, then load_template to get the scene graph.
3. **Generate assets** — use generate_image to create any illustrations, backgrounds, or graphics needed. Use brand context to inform prompts.
4. **Assemble the banner** — use update_scene_graph to populate every template slot with real content: set text, insert generated images, apply brand colors.
5. **Self-evaluate** — review the completed scene graph against the brief. Check: all slots populated (no empty sources), brand colors applied, text is relevant and concise, layout makes sense for the content.
6. **Fix issues** — if evaluation finds problems, use update_scene_graph to fix them before outputting.

## Output format

When you have finished assembling and evaluating a banner, output your final response as a JSON object with this structure:

\`\`\`json
{
  "templateId": "the-template-used",
  "reasoning": "1-2 sentences explaining your creative choices",
  "evaluation": "1-2 sentences on quality assessment",
  "sceneGraph": { ... the complete FrameNode JSON ... }
}
\`\`\`

IMPORTANT: The sceneGraph must be the COMPLETE scene graph — a valid FrameNode with all children fully populated. No placeholder text, no empty image sources.
`;
}

/**
 * Format the canvas context into a readable string for the system prompt.
 */
function formatCanvasContext(canvas: CanvasContext): string {
  const lines: string[] = [];

  lines.push(`**Project:** ${canvas.projectName}`);
  if (canvas.projectDescription) {
    lines.push(`**Description:** ${canvas.projectDescription}`);
  }

  // Assets
  const logos = canvas.assets.filter((a) => a.role === "logo");
  const screenshots = canvas.assets.filter((a) => a.role === "screenshot");
  const illustrations = canvas.assets.filter((a) => a.role === "illustration");
  const colors = canvas.assets.filter((a) => a.role === "color-swatch");
  const references = canvas.assets.filter((a) => a.role === "reference-creative");

  if (logos.length > 0) {
    lines.push(`\n**Logos:** ${logos.map((a) => a.source ?? a.filename ?? "uploaded").join(", ")}`);
  }
  if (screenshots.length > 0) {
    lines.push(`**Screenshots:** ${screenshots.map((a) => a.source ?? a.filename ?? "uploaded").join(", ")}`);
  }
  if (illustrations.length > 0) {
    lines.push(`**Illustrations:** ${illustrations.map((a) => a.source ?? a.filename ?? "uploaded").join(", ")}`);
  }
  if (colors.length > 0) {
    lines.push(`**Brand colors:** ${colors.map((a) => a.color ?? "unknown").join(", ")}`);
  }
  if (references.length > 0) {
    lines.push(`**Reference creative:** ${references.map((a) => a.source ?? a.filename ?? "uploaded").join(", ")}`);
  }

  // Notes
  if (canvas.notes.length > 0) {
    lines.push(`\n**Notes:**`);
    for (const note of canvas.notes) {
      lines.push(`- ${note}`);
    }
  }

  // URLs
  if (canvas.urls.length > 0) {
    lines.push(`\n**URLs:**`);
    for (const url of canvas.urls) {
      lines.push(`- ${url}`);
    }
  }

  if (lines.length === 1) {
    lines.push("\n(No brand assets provided — use sensible defaults)");
  }

  return lines.join("\n");
}

export { TEMPLATE_DESCRIPTIONS, COMPOSITION_GUIDELINES, formatCanvasContext };
```

- [ ] **Step 2: Commit**

```bash
git add src/agent/system-prompt.ts
git commit -m "feat: add composition agent system prompt builder"
```

---

### Task 4: Tool definitions

**Files:**
- Create: `src/agent/tools.ts`
- Create: `tests/agent/tools.test.ts`

- [ ] **Step 1: Write failing tests for tools**

```typescript
// tests/agent/tools.test.ts
import { describe, it, expect, vi } from "vitest";
import { createAgentTools } from "../../src/agent/tools.js";
import type { FrameNode } from "../../src/scene-graph/types.js";

// Mock the template loader — Plan A must be implemented first
vi.mock("../../src/templates/index.js", () => ({
  listTemplates: () => [
    {
      id: "hero-device",
      name: "Hero Device",
      description: "Device mockup centered",
      slots: [
        { name: "headline", nodeId: "headline", nodeType: "TEXT", description: "Main headline" },
        { name: "device-mockup", nodeId: "device-mockup", nodeType: "IMAGE", description: "Device mockup" },
      ],
    },
    {
      id: "split",
      name: "Split",
      description: "Image one side, copy other",
      slots: [
        { name: "headline", nodeId: "headline", nodeType: "TEXT", description: "Main headline" },
        { name: "hero-image", nodeId: "hero-image", nodeType: "IMAGE", description: "Hero image" },
      ],
    },
  ],
  loadTemplate: (id: string) => {
    if (id === "hero-device") {
      return {
        id: "root", type: "FRAME", name: "Banner",
        x: 0, y: 0, width: 1200, height: 675,
        fills: [], strokes: [], effects: [],
        cornerRadius: 0, opacity: 1, visible: true,
        clipsContent: true, layoutMode: "VERTICAL",
        primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
        primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "FIXED",
        paddingLeft: 60, paddingRight: 60, paddingTop: 48, paddingBottom: 48,
        itemSpacing: 32,
        children: [
          {
            id: "headline", type: "TEXT", name: "Headline",
            x: 0, y: 0, width: 800, height: 60,
            fills: [], strokes: [], effects: [],
            opacity: 1, visible: true,
            characters: "Your Headline Here",
            style: {
              fontFamily: "Inter", fontSize: 48, fontWeight: 700,
              textAlignHorizontal: "CENTER", textAlignVertical: "TOP",
              lineHeightPx: 58, letterSpacing: -1,
            },
          },
          {
            id: "device-mockup", type: "IMAGE", name: "DeviceMockup",
            x: 0, y: 0, width: 300, height: 400,
            fills: [], strokes: [], effects: [],
            opacity: 1, visible: true,
            source: "", fit: "contain",
          },
        ],
      } satisfies FrameNode;
    }
    throw new Error(`Template "${id}" not found`);
  },
}));

describe("Agent tools", () => {
  it("createAgentTools returns 4 tool definitions", () => {
    const tools = createAgentTools({ mcpBaseUrl: "http://127.0.0.1:3101" });
    expect(Object.keys(tools)).toHaveLength(4);
    expect(tools).toHaveProperty("generate_image");
    expect(tools).toHaveProperty("list_templates");
    expect(tools).toHaveProperty("load_template");
    expect(tools).toHaveProperty("update_scene_graph");
  });

  it("list_templates tool returns template metadata", async () => {
    const tools = createAgentTools({ mcpBaseUrl: "http://127.0.0.1:3101" });
    const result = await tools.list_templates.execute({}, { toolCallId: "test", messages: [] });
    expect(result).toContain("hero-device");
    expect(result).toContain("split");
  });

  it("load_template tool returns a scene graph", async () => {
    const tools = createAgentTools({ mcpBaseUrl: "http://127.0.0.1:3101" });
    const result = await tools.load_template.execute(
      { templateId: "hero-device" },
      { toolCallId: "test", messages: [] },
    );
    const parsed = JSON.parse(result);
    expect(parsed.type).toBe("FRAME");
    expect(parsed.children).toHaveLength(2);
  });

  it("load_template tool throws for unknown template", async () => {
    const tools = createAgentTools({ mcpBaseUrl: "http://127.0.0.1:3101" });
    await expect(
      tools.load_template.execute(
        { templateId: "nonexistent" },
        { toolCallId: "test", messages: [] },
      ),
    ).rejects.toThrow("not found");
  });

  it("update_scene_graph tool applies an update operation", async () => {
    const tools = createAgentTools({ mcpBaseUrl: "http://127.0.0.1:3101" });

    // First load a template to get a scene graph
    const templateJson = await tools.load_template.execute(
      { templateId: "hero-device" },
      { toolCallId: "test", messages: [] },
    );

    // Apply an update
    const result = await tools.update_scene_graph.execute(
      {
        sceneGraph: templateJson,
        operations: [
          { type: "update", nodeId: "headline", props: { characters: "New Headline" } },
        ],
      },
      { toolCallId: "test", messages: [] },
    );

    const updated = JSON.parse(result);
    const headline = updated.children.find((c: { id: string }) => c.id === "headline");
    expect(headline.characters).toBe("New Headline");
  });

  it("update_scene_graph tool applies insert operation", async () => {
    const tools = createAgentTools({ mcpBaseUrl: "http://127.0.0.1:3101" });

    const templateJson = await tools.load_template.execute(
      { templateId: "hero-device" },
      { toolCallId: "test", messages: [] },
    );

    const result = await tools.update_scene_graph.execute(
      {
        sceneGraph: templateJson,
        operations: [
          {
            type: "insert",
            parentId: "root",
            node: {
              id: "new-text", type: "TEXT", name: "NewText",
              x: 0, y: 0, width: 200, height: 30,
              fills: [], strokes: [], effects: [],
              opacity: 1, visible: true,
              characters: "Inserted",
              style: {
                fontFamily: "Inter", fontSize: 16, fontWeight: 400,
                textAlignHorizontal: "LEFT", textAlignVertical: "TOP",
                lineHeightPx: 20, letterSpacing: 0,
              },
            },
          },
        ],
      },
      { toolCallId: "test", messages: [] },
    );

    const updated = JSON.parse(result);
    expect(updated.children).toHaveLength(3);
  });

  it("update_scene_graph tool applies replace operation", async () => {
    const tools = createAgentTools({ mcpBaseUrl: "http://127.0.0.1:3101" });

    const templateJson = await tools.load_template.execute(
      { templateId: "hero-device" },
      { toolCallId: "test", messages: [] },
    );

    const result = await tools.update_scene_graph.execute(
      {
        sceneGraph: templateJson,
        operations: [
          {
            type: "replace",
            nodeId: "device-mockup",
            newNode: {
              id: "replaced-img", type: "IMAGE", name: "ReplacedImg",
              x: 0, y: 0, width: 300, height: 400,
              fills: [], strokes: [], effects: [],
              opacity: 1, visible: true,
              source: "https://example.com/new.png", fit: "cover",
            },
          },
        ],
      },
      { toolCallId: "test", messages: [] },
    );

    const updated = JSON.parse(result);
    const img = updated.children.find((c: { id: string }) => c.id === "replaced-img");
    expect(img).toBeDefined();
    expect(img.source).toBe("https://example.com/new.png");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/agent/tools.test.ts`
Expected: FAIL — cannot resolve `../../src/agent/tools.js`

- [ ] **Step 3: Implement tool definitions**

```typescript
// src/agent/tools.ts
import { tool } from "ai";
import { z } from "zod";
import { listTemplates, loadTemplate } from "../templates/index.js";
import { findNode, insertNode, updateNode, replaceNode } from "../scene-graph/operations.js";
import { serializeGraph, deserializeGraph } from "../scene-graph/serialize.js";
import type { SceneNode, FrameNode } from "../scene-graph/types.js";

interface ToolConfig {
  /** Base URL of the Replicate MCP server (e.g. http://127.0.0.1:3101) */
  mcpBaseUrl: string;
}

/**
 * Call the Replicate MCP server's generate_image tool via MCP HTTP transport.
 * Sends a JSON-RPC request to the MCP endpoint.
 */
async function callMcpGenerateImage(
  baseUrl: string,
  params: {
    model: string;
    prompt: string;
    aspectRatio?: string;
    width?: number;
    height?: number;
    outputFormat?: string;
  },
): Promise<{ urls: string[] }> {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "generate_image",
        arguments: params,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP server error: ${response.status} ${response.statusText}`);
  }

  const rpcResponse = await response.json() as {
    result?: { content: Array<{ type: string; text: string }> };
    error?: { message: string };
  };

  if (rpcResponse.error) {
    throw new Error(`MCP tool error: ${rpcResponse.error.message}`);
  }

  const textContent = rpcResponse.result?.content?.find(
    (c: { type: string }) => c.type === "text",
  );
  if (!textContent) {
    throw new Error("MCP tool returned no text content");
  }

  return JSON.parse((textContent as { text: string }).text);
}

/**
 * Create the 4 AI SDK tools for the composition agent.
 */
export function createAgentTools(config: ToolConfig) {
  return {
    /**
     * Generate an image via the Replicate MCP server.
     */
    generate_image: tool({
      description:
        "Generate an image using an AI model via the Replicate MCP server. " +
        "Returns URLs of generated images. " +
        "Available models: flux-schnell (fast, $0.003), recraft-v4 (design-quality, $0.04), " +
        "flux-2-pro (photorealistic, $0.035), gpt-image (best prompt following, ~$0.04-0.17). " +
        "Use flux-schnell for iteration, recraft-v4 or flux-2-pro for final assets.",
      parameters: z.object({
        model: z
          .enum([
            "flux-2-pro",
            "flux-kontext-pro",
            "recraft-v4",
            "recraft-v4-svg",
            "nano-banana-pro",
            "gpt-image",
            "flux-schnell",
          ])
          .describe("Model to use for generation"),
        prompt: z.string().describe("Detailed text prompt describing the desired image"),
        aspectRatio: z
          .string()
          .optional()
          .describe("Aspect ratio (e.g. 1:1, 16:9, 3:2)"),
        width: z.number().optional().describe("Width in pixels"),
        height: z.number().optional().describe("Height in pixels"),
        outputFormat: z
          .enum(["webp", "jpg", "png"])
          .optional()
          .describe("Output format — defaults to webp"),
      }),
      execute: async (params) => {
        const result = await callMcpGenerateImage(config.mcpBaseUrl, params);
        return JSON.stringify(result);
      },
    }),

    /**
     * List available template archetypes with their slot descriptions.
     */
    list_templates: tool({
      description:
        "List all available banner template archetypes. " +
        "Returns template IDs, names, descriptions, and their slots (what content each template expects). " +
        "Use this to decide which template fits the brief before loading one.",
      parameters: z.object({}),
      execute: async () => {
        const templates = listTemplates();
        return JSON.stringify(templates, null, 2);
      },
    }),

    /**
     * Load a template as a scene graph.
     */
    load_template: tool({
      description:
        "Load a template archetype as a scene graph (FrameNode JSON). " +
        "The template has placeholder content in its slots that you must populate. " +
        "Returns the full scene graph JSON string.",
      parameters: z.object({
        templateId: z
          .enum(["hero-device", "split", "announcement", "minimal"])
          .describe("Template archetype ID to load"),
      }),
      execute: async ({ templateId }) => {
        const graph = loadTemplate(templateId);
        return serializeGraph(graph);
      },
    }),

    /**
     * Apply operations (insert, update, replace) to a scene graph.
     */
    update_scene_graph: tool({
      description:
        "Apply one or more operations to a scene graph. " +
        "Operations: " +
        '  - update: change properties of a node (e.g. set text characters, change fills). Use {type:"update", nodeId, props}. ' +
        '  - insert: add a new node as child of a frame. Use {type:"insert", parentId, node}. ' +
        '  - replace: swap a node entirely. Use {type:"replace", nodeId, newNode}. ' +
        "Takes the current scene graph JSON and returns the modified scene graph JSON. " +
        "Chain multiple operations in a single call — they apply sequentially.",
      parameters: z.object({
        sceneGraph: z.string().describe("The current scene graph as a JSON string"),
        operations: z.array(
          z.discriminatedUnion("type", [
            z.object({
              type: z.literal("update"),
              nodeId: z.string().describe("ID of the node to update"),
              props: z
                .record(z.unknown())
                .describe("Properties to merge onto the node"),
            }),
            z.object({
              type: z.literal("insert"),
              parentId: z.string().describe("ID of the parent FRAME to insert into"),
              node: z
                .record(z.unknown())
                .describe("Complete node object to insert"),
            }),
            z.object({
              type: z.literal("replace"),
              nodeId: z.string().describe("ID of the node to replace"),
              newNode: z
                .record(z.unknown())
                .describe("Complete new node object"),
            }),
          ]),
        ),
      }),
      execute: async ({ sceneGraph, operations }) => {
        let graph = deserializeGraph(sceneGraph);

        for (const op of operations) {
          switch (op.type) {
            case "update":
              graph = updateNode(graph, op.nodeId, op.props);
              break;
            case "insert":
              graph = insertNode(graph, op.parentId, op.node as unknown as SceneNode);
              break;
            case "replace":
              graph = replaceNode(graph, op.nodeId, op.newNode as unknown as SceneNode);
              break;
          }
        }

        return serializeGraph(graph);
      },
    }),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/agent/tools.test.ts`
Expected: PASS — all 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/agent/tools.ts tests/agent/tools.test.ts
git commit -m "feat: add AI SDK tool definitions for composition agent"
```

---

### Task 5: Scene graph assembly helpers

**Files:**
- Create: `src/agent/assemble.ts`
- Create: `tests/agent/assemble.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/agent/assemble.test.ts
import { describe, it, expect } from "vitest";
import { applyBrandColors, populateTextSlot, populateImageSlot, validateAllSlotsPopulated } from "../../src/agent/assemble.js";
import { createFrame, createText, createImage } from "../../src/scene-graph/node-factory.js";
import type { FrameNode, SolidPaint } from "../../src/scene-graph/types.js";

function makeBanner(): FrameNode {
  return createFrame({
    id: "root",
    name: "Banner",
    width: 1200,
    height: 675,
    children: [
      createText({
        id: "headline",
        name: "Headline",
        characters: "Placeholder",
        width: 800,
        height: 60,
      }),
      createImage({
        id: "hero",
        name: "Hero",
        source: "",
        width: 400,
        height: 400,
      }),
      createFrame({
        id: "cta",
        name: "CTA",
        width: 200,
        height: 48,
        fills: [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } }],
        children: [
          createText({
            id: "cta-text",
            name: "CTAText",
            characters: "Click",
            width: 150,
            height: 24,
          }),
        ],
      }),
    ],
  });
}

describe("Scene graph assembly helpers", () => {
  describe("populateTextSlot", () => {
    it("sets text characters on a text node", () => {
      const banner = makeBanner();
      const updated = populateTextSlot(banner, "headline", "Ship Faster");
      const headline = updated.children[0];
      expect(headline.type === "TEXT" && headline.characters).toBe("Ship Faster");
    });

    it("throws if node is not a TEXT node", () => {
      const banner = makeBanner();
      expect(() => populateTextSlot(banner, "hero", "oops")).toThrow("not a TEXT node");
    });
  });

  describe("populateImageSlot", () => {
    it("sets image source on an image node", () => {
      const banner = makeBanner();
      const updated = populateImageSlot(banner, "hero", "https://example.com/img.png");
      const hero = updated.children[1];
      expect(hero.type === "IMAGE" && hero.source).toBe("https://example.com/img.png");
    });

    it("throws if node is not an IMAGE node", () => {
      const banner = makeBanner();
      expect(() => populateImageSlot(banner, "headline", "url")).toThrow("not an IMAGE node");
    });
  });

  describe("applyBrandColors", () => {
    it("sets CTA fill to the provided brand color", () => {
      const banner = makeBanner();
      const brandColor = { r: 0.42, g: 0.36, b: 0.9, a: 1 };
      const updated = applyBrandColors(banner, {
        ctaNodeIds: ["cta"],
        primaryColor: brandColor,
      });
      const cta = updated.children[2];
      expect(cta.type === "FRAME" && (cta.fills[0] as SolidPaint).color).toEqual(brandColor);
    });

    it("sets background fill when provided", () => {
      const banner = makeBanner();
      const bgColor = { r: 0.05, g: 0.05, b: 0.1, a: 1 };
      const updated = applyBrandColors(banner, {
        ctaNodeIds: [],
        backgroundColor: bgColor,
      });
      expect((updated.fills[0] as SolidPaint).color).toEqual(bgColor);
    });
  });

  describe("validateAllSlotsPopulated", () => {
    it("returns errors for empty image sources", () => {
      const banner = makeBanner();
      const errors = validateAllSlotsPopulated(banner);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain("hero");
    });

    it("returns empty array when all slots are populated", () => {
      let banner = makeBanner();
      banner = populateTextSlot(banner, "headline", "Real headline");
      banner = populateImageSlot(banner, "hero", "https://example.com/img.png");
      const errors = validateAllSlotsPopulated(banner);
      expect(errors).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/agent/assemble.test.ts`
Expected: FAIL — cannot resolve `../../src/agent/assemble.js`

- [ ] **Step 3: Implement assembly helpers**

```typescript
// src/agent/assemble.ts
import type { FrameNode, SceneNode, Color, SolidPaint } from "../scene-graph/types.js";
import { findNode, updateNode } from "../scene-graph/operations.js";
import { isFrame, isText, isImage } from "../scene-graph/types.js";

/**
 * Set the text content of a TEXT node by ID.
 */
export function populateTextSlot(
  graph: FrameNode,
  nodeId: string,
  characters: string,
): FrameNode {
  const node = findNode(graph, nodeId);
  if (!node) throw new Error(`Node "${nodeId}" not found`);
  if (!isText(node)) throw new Error(`Node "${nodeId}" is not a TEXT node`);
  return updateNode(graph, nodeId, { characters });
}

/**
 * Set the source URL of an IMAGE node by ID.
 */
export function populateImageSlot(
  graph: FrameNode,
  nodeId: string,
  source: string,
): FrameNode {
  const node = findNode(graph, nodeId);
  if (!node) throw new Error(`Node "${nodeId}" not found`);
  if (!isImage(node)) throw new Error(`Node "${nodeId}" is not an IMAGE node`);
  return updateNode(graph, nodeId, { source });
}

/**
 * Apply brand colors to a scene graph.
 */
export function applyBrandColors(
  graph: FrameNode,
  config: {
    primaryColor?: Color;
    backgroundColor?: Color;
    ctaNodeIds: string[];
    textColor?: Color;
    headlineNodeIds?: string[];
  },
): FrameNode {
  let result = graph;

  // Apply background color to root frame
  if (config.backgroundColor) {
    const bgFill: SolidPaint = { type: "SOLID", color: config.backgroundColor };
    result = updateNode(result, result.id, { fills: [bgFill] });
  }

  // Apply primary color to CTA frames
  if (config.primaryColor) {
    for (const ctaId of config.ctaNodeIds) {
      const node = findNode(result, ctaId);
      if (node && isFrame(node)) {
        const ctaFill: SolidPaint = { type: "SOLID", color: config.primaryColor };
        result = updateNode(result, ctaId, { fills: [ctaFill] });
      }
    }
  }

  // Apply text color to headline nodes
  if (config.textColor && config.headlineNodeIds) {
    for (const headlineId of config.headlineNodeIds) {
      const node = findNode(result, headlineId);
      if (node && isText(node)) {
        const textFill: SolidPaint = { type: "SOLID", color: config.textColor };
        result = updateNode(result, headlineId, { fills: [textFill] });
      }
    }
  }

  return result;
}

/**
 * Validate that all slots in a scene graph are populated.
 * Returns an array of error messages (empty = all good).
 *
 * Rules:
 * - IMAGE nodes must have a non-empty source
 * - TEXT nodes must not have placeholder content ("Your Headline Here", etc.)
 */
const PLACEHOLDER_PATTERNS = [
  /^your\s+\w+\s+here$/i,
  /^placeholder$/i,
  /^supporting\s+(text|details)\s+(goes\s+)?here$/i,
  /^announcement\s+headline$/i,
  /^april\s+2026$/i,
];

export function validateAllSlotsPopulated(graph: FrameNode): string[] {
  const errors: string[] = [];

  function walk(node: SceneNode) {
    if (isImage(node) && !node.source) {
      errors.push(`IMAGE node "${node.id}" (${node.name}) has empty source`);
    }
    if (isText(node)) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(node.characters.trim())) {
          errors.push(
            `TEXT node "${node.id}" (${node.name}) still has placeholder content: "${node.characters}"`,
          );
          break;
        }
      }
    }
    if (isFrame(node)) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(graph);
  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/agent/assemble.test.ts`
Expected: PASS — all 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/agent/assemble.ts tests/agent/assemble.test.ts
git commit -m "feat: add scene graph assembly helpers for slot population and brand colors"
```

---

### Task 6: Self-evaluation prompt builder

**Files:**
- Create: `src/agent/evaluate.ts`
- Create: `tests/agent/evaluate.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/agent/evaluate.test.ts
import { describe, it, expect } from "vitest";
import { buildEvaluationPrompt, parseEvaluationResult } from "../../src/agent/evaluate.js";

describe("Self-evaluation", () => {
  describe("buildEvaluationPrompt", () => {
    it("includes the brief prompt", () => {
      const prompt = buildEvaluationPrompt({
        briefPrompt: "Launch banner for DeFi app",
        templateId: "split",
        sceneGraphJson: '{"type":"FRAME"}',
        brandColors: ["#6C5CE7"],
      });
      expect(prompt).toContain("Launch banner for DeFi app");
    });

    it("includes template ID", () => {
      const prompt = buildEvaluationPrompt({
        briefPrompt: "test",
        templateId: "hero-device",
        sceneGraphJson: '{"type":"FRAME"}',
        brandColors: [],
      });
      expect(prompt).toContain("hero-device");
    });

    it("includes brand colors when provided", () => {
      const prompt = buildEvaluationPrompt({
        briefPrompt: "test",
        templateId: "minimal",
        sceneGraphJson: '{"type":"FRAME"}',
        brandColors: ["#6C5CE7", "#00B894"],
      });
      expect(prompt).toContain("#6C5CE7");
      expect(prompt).toContain("#00B894");
    });
  });

  describe("parseEvaluationResult", () => {
    it("parses a passing evaluation", () => {
      const result = parseEvaluationResult(
        JSON.stringify({
          pass: true,
          issues: [],
          summary: "All slots populated, brand colors applied correctly.",
        }),
      );
      expect(result.pass).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("parses a failing evaluation with issues", () => {
      const result = parseEvaluationResult(
        JSON.stringify({
          pass: false,
          issues: [
            "Hero image source is empty",
            "Headline still has placeholder text",
          ],
          summary: "Two slots not populated.",
        }),
      );
      expect(result.pass).toBe(false);
      expect(result.issues).toHaveLength(2);
    });

    it("handles malformed JSON gracefully", () => {
      const result = parseEvaluationResult("not json at all");
      expect(result.pass).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/agent/evaluate.test.ts`
Expected: FAIL — cannot resolve `../../src/agent/evaluate.js`

- [ ] **Step 3: Implement self-evaluation**

```typescript
// src/agent/evaluate.ts

export interface EvaluationInput {
  briefPrompt: string;
  templateId: string;
  sceneGraphJson: string;
  brandColors: string[];
}

export interface EvaluationResult {
  pass: boolean;
  issues: string[];
  summary: string;
}

/**
 * Build a prompt that asks the LLM to evaluate a completed banner against the brief.
 * This is used as a follow-up message after the agent finishes assembling a banner.
 */
export function buildEvaluationPrompt(input: EvaluationInput): string {
  const brandColorSection =
    input.brandColors.length > 0
      ? `Brand colors to check for: ${input.brandColors.join(", ")}`
      : "No specific brand colors were provided.";

  return `Evaluate this completed banner against the original brief.

## Original brief
"${input.briefPrompt}"

## Template used
${input.templateId}

## Brand colors
${brandColorSection}

## Completed scene graph
\`\`\`json
${input.sceneGraphJson}
\`\`\`

## Evaluation checklist

Check each of the following and report any issues:

1. **Slots populated** — every IMAGE node must have a non-empty "source" URL. Every TEXT node must have real content (not placeholder text like "Your Headline Here").
2. **Brand colors** — if brand colors were provided, at least one should appear in CTA fills or accent elements. Colors are stored as {r, g, b, a} with 0-1 values.
3. **Brief alignment** — the headline and any subtext should relate to the brief's message. The visual assets should match the brief's intent.
4. **Layout coherence** — the template choice should make sense for the brief (e.g. don't use "announcement" template for a feature highlight).
5. **Text quality** — headlines should be concise (3-7 words), CTAs should be action-oriented.

## Response format

Respond with a JSON object:
\`\`\`json
{
  "pass": true/false,
  "issues": ["issue 1", "issue 2"],
  "summary": "one sentence overall assessment"
}
\`\`\`

If all checks pass, set "pass": true and "issues": [].
If any check fails, set "pass": false and list every issue found.`;
}

/**
 * Parse the LLM's evaluation response. Handles both clean JSON and
 * JSON embedded in markdown code fences.
 */
export function parseEvaluationResult(raw: string): EvaluationResult {
  // Try to extract JSON from code fences first
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      pass: Boolean(parsed.pass),
      issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "No summary provided.",
    };
  } catch {
    return {
      pass: false,
      issues: [`Failed to parse evaluation response: ${raw.slice(0, 200)}`],
      summary: "Evaluation response was not valid JSON.",
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/agent/evaluate.test.ts`
Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/agent/evaluate.ts tests/agent/evaluate.test.ts
git commit -m "feat: add self-evaluation prompt builder and parser"
```

---

### Task 7: Composition pipeline

**Files:**
- Create: `src/agent/pipeline.ts`
- Create: `tests/agent/pipeline.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/agent/pipeline.test.ts
import { describe, it, expect, vi } from "vitest";
import {
  buildVariationPrompt,
  parseAgentOutput,
  VARIATION_DIRECTIVES,
} from "../../src/agent/pipeline.js";

describe("Composition pipeline", () => {
  describe("VARIATION_DIRECTIVES", () => {
    it("provides at least 3 directives", () => {
      expect(VARIATION_DIRECTIVES.length).toBeGreaterThanOrEqual(3);
    });

    it("each directive mentions a different template", () => {
      const templates = VARIATION_DIRECTIVES.map((d) => d.suggestedTemplate);
      const unique = new Set(templates);
      expect(unique.size).toBe(VARIATION_DIRECTIVES.length);
    });
  });

  describe("buildVariationPrompt", () => {
    it("includes the user brief", () => {
      const prompt = buildVariationPrompt({
        brief: "Launch banner for our new DeFi lending protocol",
        variationIndex: 0,
        directive: VARIATION_DIRECTIVES[0],
      });
      expect(prompt).toContain("Launch banner for our new DeFi lending protocol");
    });

    it("includes the variation number", () => {
      const prompt = buildVariationPrompt({
        brief: "test",
        variationIndex: 1,
        directive: VARIATION_DIRECTIVES[1],
      });
      expect(prompt).toContain("Variation 2");
    });

    it("includes the creative directive", () => {
      const prompt = buildVariationPrompt({
        brief: "test",
        variationIndex: 0,
        directive: VARIATION_DIRECTIVES[0],
      });
      expect(prompt).toContain(VARIATION_DIRECTIVES[0].suggestedTemplate);
    });
  });

  describe("parseAgentOutput", () => {
    it("parses valid agent JSON output", () => {
      const output = JSON.stringify({
        templateId: "split",
        reasoning: "Chose split layout for feature highlight",
        evaluation: "All slots populated, looks good",
        sceneGraph: {
          id: "root",
          type: "FRAME",
          name: "Banner",
          x: 0, y: 0, width: 1200, height: 675,
          fills: [], strokes: [], effects: [],
          cornerRadius: 0, opacity: 1, visible: true,
          clipsContent: true, layoutMode: "HORIZONTAL",
          primaryAxisAlignItems: "SPACE_BETWEEN",
          counterAxisAlignItems: "CENTER",
          primaryAxisSizingMode: "FIXED",
          counterAxisSizingMode: "FIXED",
          paddingLeft: 60, paddingRight: 60,
          paddingTop: 48, paddingBottom: 48,
          itemSpacing: 40,
          children: [],
        },
      });

      const result = parseAgentOutput(output);
      expect(result.templateId).toBe("split");
      expect(result.reasoning).toContain("split layout");
      expect(result.sceneGraph.type).toBe("FRAME");
    });

    it("extracts JSON from markdown code fences", () => {
      const output = `Here is the completed banner:

\`\`\`json
{
  "templateId": "minimal",
  "reasoning": "Clean and simple",
  "evaluation": "Looks great",
  "sceneGraph": {
    "id": "root", "type": "FRAME", "name": "Banner",
    "x": 0, "y": 0, "width": 1200, "height": 675,
    "fills": [], "strokes": [], "effects": [],
    "cornerRadius": 0, "opacity": 1, "visible": true,
    "clipsContent": true, "layoutMode": "HORIZONTAL",
    "primaryAxisAlignItems": "SPACE_BETWEEN",
    "counterAxisAlignItems": "CENTER",
    "primaryAxisSizingMode": "FIXED",
    "counterAxisSizingMode": "FIXED",
    "paddingLeft": 60, "paddingRight": 60,
    "paddingTop": 48, "paddingBottom": 48,
    "itemSpacing": 40, "children": []
  }
}
\`\`\``;

      const result = parseAgentOutput(output);
      expect(result.templateId).toBe("minimal");
    });

    it("throws on unparseable output", () => {
      expect(() => parseAgentOutput("just some random text")).toThrow(
        "Failed to parse agent output",
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/agent/pipeline.test.ts`
Expected: FAIL — cannot resolve `../../src/agent/pipeline.js`

- [ ] **Step 3: Implement the composition pipeline**

```typescript
// src/agent/pipeline.ts
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildSystemPrompt } from "./system-prompt.js";
import { createAgentTools } from "./tools.js";
import { buildEvaluationPrompt, parseEvaluationResult } from "./evaluate.js";
import { validateAllSlotsPopulated } from "./assemble.js";
import { deserializeGraph, serializeGraph } from "../scene-graph/serialize.js";
import type { FrameNode } from "../scene-graph/types.js";
import type {
  BannerBrief,
  BannerVariation,
  CanvasContext,
  CompositionResult,
} from "./types.js";

/**
 * Creative directives for each variation — forces the agent to
 * explore different layout archetypes and creative directions.
 */
export const VARIATION_DIRECTIVES = [
  {
    suggestedTemplate: "split",
    direction:
      "Use a split layout with the hero image on one side and copy on the other. " +
      "Go for a clean, professional look with generous whitespace.",
  },
  {
    suggestedTemplate: "hero-device",
    direction:
      "Use a hero-device layout with a centered device mockup. " +
      "Make it bold and attention-grabbing with a strong headline above the device.",
  },
  {
    suggestedTemplate: "announcement",
    direction:
      "Use an announcement layout with a gradient background and centered text. " +
      "Go for a dramatic, high-impact look with contrasting light text on dark background.",
  },
  {
    suggestedTemplate: "minimal",
    direction:
      "Use a minimal layout with logo, headline, and accent illustration. " +
      "Keep it simple and elegant with a lot of breathing room.",
  },
] as const;

export interface VariationDirective {
  suggestedTemplate: string;
  direction: string;
}

/**
 * Build the user message for a single variation run.
 */
export function buildVariationPrompt(opts: {
  brief: string;
  variationIndex: number;
  directive: VariationDirective;
}): string {
  return `## Variation ${opts.variationIndex + 1}

**User brief:** "${opts.brief}"

**Creative directive for this variation:** ${opts.directive.direction}

**Suggested template:** ${opts.directive.suggestedTemplate} (you may override if you have a strong reason, but prefer this template)

Follow your workflow: list templates, load the suggested template, generate needed images, assemble the banner by populating all slots, then output the final result.

Remember: output a complete JSON object with templateId, reasoning, evaluation, and the full sceneGraph.`;
}

/**
 * Parsed output from the agent's final text response.
 */
export interface AgentOutput {
  templateId: string;
  reasoning: string;
  evaluation: string;
  sceneGraph: FrameNode;
}

/**
 * Parse the agent's text output into structured data.
 * Handles both raw JSON and JSON in markdown code fences.
 */
export function parseAgentOutput(text: string): AgentOutput {
  // Try to extract JSON from code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      `Failed to parse agent output as JSON. Raw text: ${text.slice(0, 300)}`,
    );
  }

  if (
    typeof parsed.templateId !== "string" ||
    typeof parsed.reasoning !== "string" ||
    typeof parsed.sceneGraph !== "object" ||
    parsed.sceneGraph === null
  ) {
    throw new Error(
      "Agent output missing required fields: templateId, reasoning, sceneGraph",
    );
  }

  // Validate the scene graph by deserializing it
  const sceneGraph = deserializeGraph(JSON.stringify(parsed.sceneGraph));

  return {
    templateId: parsed.templateId,
    reasoning: parsed.reasoning,
    evaluation: typeof parsed.evaluation === "string" ? parsed.evaluation : "",
    sceneGraph,
  };
}

/**
 * Run one variation of the composition pipeline.
 * The agent uses tools to load a template, generate images, and assemble the banner.
 */
async function runSingleVariation(opts: {
  brief: BannerBrief;
  canvas: CanvasContext;
  variationIndex: number;
  directive: VariationDirective;
  mcpBaseUrl: string;
  model?: string;
  maxRetries?: number;
}): Promise<BannerVariation> {
  const systemPrompt = buildSystemPrompt(opts.canvas);
  const tools = createAgentTools({ mcpBaseUrl: opts.mcpBaseUrl });
  const userMessage = buildVariationPrompt({
    brief: opts.brief.prompt,
    variationIndex: opts.variationIndex,
    directive: opts.directive,
  });

  const modelId = opts.model ?? "claude-sonnet-4-20250514";
  const maxRetries = opts.maxRetries ?? 1;

  let agentOutput: AgentOutput | undefined;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Run the agent with tool use
      const result = await generateText({
        model: anthropic(modelId),
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
        tools,
        maxSteps: 15,
        maxTokens: 8192,
      });

      // Parse the final text output
      agentOutput = parseAgentOutput(result.text);

      // Self-evaluate: check for unpopulated slots
      const slotErrors = validateAllSlotsPopulated(agentOutput.sceneGraph);

      if (slotErrors.length > 0 && attempt < maxRetries) {
        console.log(
          `[pipeline] Variation ${opts.variationIndex + 1} attempt ${attempt + 1}: ` +
            `${slotErrors.length} slot issue(s), retrying...`,
        );
        console.log(`[pipeline] Issues: ${slotErrors.join("; ")}`);
        lastError = new Error(`Slot validation failed: ${slotErrors.join("; ")}`);
        continue;
      }

      // If we have slot errors on the last attempt, note them in evaluation
      if (slotErrors.length > 0) {
        agentOutput.evaluation += ` [WARN: ${slotErrors.join("; ")}]`;
      }

      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        console.log(
          `[pipeline] Variation ${opts.variationIndex + 1} attempt ${attempt + 1} ` +
            `failed: ${lastError.message}. Retrying...`,
        );
      }
    }
  }

  if (!agentOutput) {
    throw new Error(
      `Failed to generate variation ${opts.variationIndex + 1} after ` +
        `${maxRetries + 1} attempts. Last error: ${lastError?.message}`,
    );
  }

  return {
    index: opts.variationIndex + 1,
    templateId: agentOutput.templateId,
    sceneGraph: agentOutput.sceneGraph,
    reasoning: agentOutput.reasoning,
    evaluation: agentOutput.evaluation,
  };
}

export interface PipelineConfig {
  /** Base URL of the Replicate MCP server */
  mcpBaseUrl?: string;
  /** Anthropic model ID (default: claude-sonnet-4-20250514) */
  model?: string;
  /** Max retry attempts per variation on failure (default: 1) */
  maxRetries?: number;
}

/**
 * Run the full composition pipeline: brief + canvas context → 3 banner variations.
 *
 * Each variation runs as an independent agent call with a different creative
 * directive, forcing the agent to explore different layout archetypes.
 */
export async function compose(
  brief: BannerBrief,
  canvas: CanvasContext,
  config?: PipelineConfig,
): Promise<CompositionResult> {
  const mcpBaseUrl = config?.mcpBaseUrl ?? "http://127.0.0.1:3101";
  const variationCount = brief.variationCount ?? 3;
  const startTime = Date.now();

  console.log(`[pipeline] Starting composition: "${brief.prompt}"`);
  console.log(`[pipeline] Generating ${variationCount} variation(s)...`);

  // Select directives for the requested number of variations
  const directives = VARIATION_DIRECTIVES.slice(0, variationCount);

  // Run variations sequentially to avoid rate-limiting the MCP server
  // and to keep costs predictable during MVP
  const variations: BannerVariation[] = [];

  for (let i = 0; i < directives.length; i++) {
    console.log(
      `\n[pipeline] --- Variation ${i + 1}/${directives.length} ` +
        `(${directives[i].suggestedTemplate}) ---`,
    );

    const variation = await runSingleVariation({
      brief,
      canvas,
      variationIndex: i,
      directive: directives[i],
      mcpBaseUrl,
      model: config?.model,
      maxRetries: config?.maxRetries,
    });

    variations.push(variation);
    console.log(
      `[pipeline] Variation ${i + 1} complete: ${variation.templateId} — ${variation.reasoning}`,
    );
  }

  const durationMs = Date.now() - startTime;
  console.log(`\n[pipeline] Done. ${variations.length} variations in ${(durationMs / 1000).toFixed(1)}s`);

  return {
    brief,
    canvas,
    variations,
    durationMs,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/agent/pipeline.test.ts`
Expected: PASS — all 7 tests pass (only testing pure functions, not the LLM calls)

- [ ] **Step 5: Commit**

```bash
git add src/agent/pipeline.ts tests/agent/pipeline.test.ts
git commit -m "feat: add composition pipeline (brief + canvas → 3 banner variations)"
```

---

### Task 8: CLI test script

**Files:**
- Create: `scripts/test-agent.ts`
- Modify: `package.json` (add script)

- [ ] **Step 1: Create end-to-end test script**

```typescript
// scripts/test-agent.ts
/**
 * CLI test script to run the composition agent end-to-end.
 *
 * Prerequisites:
 *   1. ANTHROPIC_API_KEY set in .env or environment
 *   2. Replicate MCP server running: npm run mcp
 *
 * Usage:
 *   npx tsx scripts/test-agent.ts
 *   npx tsx scripts/test-agent.ts --variations 1    # Just 1 variation (faster/cheaper)
 *   npx tsx scripts/test-agent.ts --prompt "your brief here"
 */

import { compose } from "../src/agent/pipeline.js";
import { serializeGraph } from "../src/scene-graph/serialize.js";
import type { BannerBrief, CanvasContext } from "../src/agent/types.js";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

// Load .env
import { readFileSync } from "fs";
try {
  const envPath = resolve(import.meta.dirname, "../.env");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env not found
}

// Parse CLI args
const args = process.argv.slice(2);

function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return fallback;
}

const variationCount = parseInt(getArg("variations", "3"), 10);
const prompt = getArg(
  "prompt",
  "Create a launch banner for AcmeDeFi, a new decentralized lending protocol. " +
    "Emphasize security and high APY yields. Modern, trustworthy aesthetic.",
);

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY not found in environment or .env file");
  process.exit(1);
}

// Sample canvas context for testing
const testCanvas: CanvasContext = {
  projectName: "AcmeDeFi",
  projectDescription: "Decentralized lending protocol — secure, high-yield, launching Q2 2026",
  assets: [
    {
      id: "color-1",
      role: "color-swatch",
      color: "#6C5CE7",
      note: "Primary purple",
    },
    {
      id: "color-2",
      role: "color-swatch",
      color: "#00B894",
      note: "Accent green — used for positive metrics",
    },
    {
      id: "color-3",
      role: "color-swatch",
      color: "#0D1117",
      note: "Dark background",
    },
  ],
  notes: [
    "Premium but approachable — not intimidating",
    "Avoid gradients that look like 2018 crypto projects",
    "Clean, modern aesthetic — think Linear or Vercel design language",
    "Target audience: DeFi-native users and crypto-curious developers",
  ],
  urls: ["https://acmedefi.example.com"],
};

const brief: BannerBrief = {
  prompt,
  width: 1200,
  height: 675,
  variationCount,
};

async function main() {
  console.log("=== Brandouble Composition Agent — E2E Test ===\n");
  console.log(`Brief: "${brief.prompt}"`);
  console.log(`Variations: ${variationCount}`);
  console.log(`Dimensions: ${brief.width}x${brief.height}`);
  console.log("");

  const result = await compose(brief, testCanvas, {
    mcpBaseUrl: "http://127.0.0.1:3101",
  });

  // Write output files
  const outputDir = resolve(import.meta.dirname, "../output/agent-test");
  mkdirSync(outputDir, { recursive: true });

  for (const variation of result.variations) {
    const filename = `variation-${variation.index}-${variation.templateId}.json`;
    const filePath = resolve(outputDir, filename);
    writeFileSync(filePath, serializeGraph(variation.sceneGraph));
    console.log(`\n  Wrote: ${filePath}`);
    console.log(`  Template: ${variation.templateId}`);
    console.log(`  Reasoning: ${variation.reasoning}`);
    console.log(`  Evaluation: ${variation.evaluation}`);
  }

  // Write summary
  const summaryPath = resolve(outputDir, "summary.json");
  writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        brief: result.brief,
        canvas: { projectName: result.canvas.projectName },
        variations: result.variations.map((v) => ({
          index: v.index,
          templateId: v.templateId,
          reasoning: v.reasoning,
          evaluation: v.evaluation,
        })),
        durationMs: result.durationMs,
        durationFormatted: `${(result.durationMs / 1000).toFixed(1)}s`,
      },
      null,
      2,
    ),
  );

  console.log(`\n  Summary: ${summaryPath}`);
  console.log(`\n  Total time: ${(result.durationMs / 1000).toFixed(1)}s`);
  console.log("\n=== Done ===\n");
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script to package.json**

Add to the `"scripts"` section:

```json
"agent": "tsx scripts/test-agent.ts",
"agent:quick": "tsx scripts/test-agent.ts --variations 1"
```

- [ ] **Step 3: Verify the script compiles (dry-run type check)**

Run: `npx tsc --noEmit src/agent/pipeline.ts` (may show errors if Plan A not implemented yet — that is expected)

- [ ] **Step 4: Commit**

```bash
git add scripts/test-agent.ts package.json
git commit -m "feat: add CLI test script for end-to-end agent runs"
```

---

### Task 9: Barrel export

**Files:**
- Create: `src/agent/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// src/agent/index.ts
export type {
  BannerBrief,
  BannerVariation,
  CanvasContext,
  CanvasAsset,
  CompositionResult,
  SceneGraphOperation,
} from "./types.js";

export { compose } from "./pipeline.js";
export type { PipelineConfig } from "./pipeline.js";

export { createAgentTools } from "./tools.js";
export { buildSystemPrompt } from "./system-prompt.js";
export {
  buildEvaluationPrompt,
  parseEvaluationResult,
} from "./evaluate.js";
export type { EvaluationInput, EvaluationResult } from "./evaluate.js";

export {
  populateTextSlot,
  populateImageSlot,
  applyBrandColors,
  validateAllSlotsPopulated,
} from "./assemble.js";
```

- [ ] **Step 2: Verify all tests pass**

Run: `npx vitest run`
Expected: PASS — all tests from Tasks 4-7 pass

- [ ] **Step 3: Commit**

```bash
git add src/agent/index.ts
git commit -m "feat: add composition agent barrel export"
```
