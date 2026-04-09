# Plan G: Export + Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the export pipeline — PNG screenshot export via Playwright, multi-dimension batch export, Figma push via REST API — and wire the full end-to-end generation-to-export flow with a demo script.

**Architecture:** A headless export server spins up the Plan D canvas renderer in a Playwright-controlled browser, loads a scene graph, and screenshots it at target dimensions. The Figma exporter maps scene graph node types to Figma REST API node types and pushes them to a Figma file via the `POST /v1/files/:key/nodes` endpoint. Export functions are pure TypeScript modules that accept a scene graph and return buffers or API responses. The editor UI from Plan F gets export buttons wired in.

**Tech Stack:** Playwright, Figma REST API, TypeScript, Vite, Vitest

**Phase:** 4 (depends on Plan A scene graph, Plan D canvas renderer, Plan E composition agent, Plan F editor UI)

**Spec reference:** [2026-04-09-brandouble-mvp-design.md](../specs/2026-04-09-brandouble-mvp-design.md) — "Output and variations" and "Export" sections

---

## File structure

```
src/
  export/
    screenshot.ts           # Playwright-based PNG screenshot of rendered scene graph
    multi-export.ts         # Batch export at multiple target dimensions
    figma-mapper.ts         # Scene graph nodes → Figma REST API node format
    figma-export.ts         # Push mapped nodes to Figma file via REST API
    dimensions.ts           # Predefined target dimension presets
    types.ts                # Export-related type definitions
    index.ts                # Barrel export
  editor/
    components/
      export-toolbar.tsx    # Export buttons wired into editor UI
scripts/
  demo-e2e.ts              # End-to-end demo: create project → generate → render → export
tests/
  export/
    screenshot.test.ts
    multi-export.test.ts
    figma-mapper.test.ts
    figma-export.test.ts
    dimensions.test.ts
```

---

### Task 1: Install Playwright

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Playwright as a dependency**

```bash
npm install playwright
```

- [ ] **Step 2: Install Chromium browser binary**

```bash
npx playwright install chromium
```

- [ ] **Step 3: Verify Playwright installs correctly**

```bash
npx playwright --version
```

Expected: prints Playwright version number (e.g., `1.52.0`)

- [ ] **Step 4: Add export-related scripts to package.json**

Add to the `"scripts"` section:

```json
"export:demo": "tsx scripts/demo-e2e.ts"
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Playwright dependency and chromium browser for export pipeline"
```

---

### Task 2: Screenshot export function

**Files:**
- Create: `src/export/types.ts`
- Create: `src/export/dimensions.ts`
- Create: `src/export/screenshot.ts`
- Create: `tests/export/screenshot.test.ts`
- Create: `tests/export/dimensions.test.ts`

- [ ] **Step 1: Write failing tests for dimensions**

```typescript
// tests/export/dimensions.test.ts
import { describe, it, expect } from "vitest";
import {
  DIMENSION_PRESETS,
  getDimension,
  type TargetDimension,
} from "../../src/export/dimensions.js";

describe("Dimension presets", () => {
  it("includes Twitter preset", () => {
    const twitter = getDimension("twitter");
    expect(twitter).toBeDefined();
    expect(twitter!.width).toBe(1200);
    expect(twitter!.height).toBe(675);
  });

  it("includes Instagram preset", () => {
    const ig = getDimension("instagram-square");
    expect(ig).toBeDefined();
    expect(ig!.width).toBe(1080);
    expect(ig!.height).toBe(1080);
  });

  it("includes LinkedIn preset", () => {
    const li = getDimension("linkedin");
    expect(li).toBeDefined();
    expect(li!.width).toBe(1200);
    expect(li!.height).toBe(627);
  });

  it("returns undefined for unknown preset", () => {
    expect(getDimension("unknown")).toBeUndefined();
  });

  it("has at least 4 presets", () => {
    expect(DIMENSION_PRESETS.length).toBeGreaterThanOrEqual(4);
  });

  it("all presets have name, width, and height", () => {
    for (const preset of DIMENSION_PRESETS) {
      expect(preset.name).toBeTruthy();
      expect(preset.width).toBeGreaterThan(0);
      expect(preset.height).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/export/dimensions.test.ts`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement export types**

```typescript
// src/export/types.ts
import type { FrameNode } from "../scene-graph/types.js";

export interface TargetDimension {
  name: string;       // e.g. "twitter", "instagram-square"
  label: string;      // e.g. "Twitter / X (1200x675)"
  width: number;
  height: number;
}

export interface ExportResult {
  dimension: TargetDimension;
  buffer: Buffer;
  mimeType: "image/png";
  filename: string;
}

export interface ExportOptions {
  scene: FrameNode;
  dimensions: TargetDimension[];
  outputDir?: string;
  rendererUrl?: string; // URL of the running Plan D canvas renderer dev server
}

export interface FigmaExportOptions {
  scene: FrameNode;
  figmaFileKey: string;
  figmaAccessToken: string;
  parentNodeId?: string; // Figma node to insert under; defaults to first page
}

export interface FigmaExportResult {
  fileKey: string;
  nodeIds: string[];
  url: string;
}
```

- [ ] **Step 4: Implement dimensions**

```typescript
// src/export/dimensions.ts
import type { TargetDimension } from "./types.js";

export type { TargetDimension };

export const DIMENSION_PRESETS: TargetDimension[] = [
  { name: "twitter", label: "Twitter / X (1200x675)", width: 1200, height: 675 },
  { name: "linkedin", label: "LinkedIn (1200x627)", width: 1200, height: 627 },
  { name: "instagram-square", label: "Instagram Square (1080x1080)", width: 1080, height: 1080 },
  { name: "instagram-story", label: "Instagram Story (1080x1920)", width: 1080, height: 1920 },
  { name: "facebook", label: "Facebook (1200x630)", width: 1200, height: 630 },
  { name: "og-image", label: "OG Image (1200x630)", width: 1200, height: 630 },
  { name: "youtube-thumbnail", label: "YouTube Thumbnail (1280x720)", width: 1280, height: 720 },
];

export function getDimension(name: string): TargetDimension | undefined {
  return DIMENSION_PRESETS.find((d) => d.name === name);
}
```

- [ ] **Step 5: Write failing tests for screenshot**

```typescript
// tests/export/screenshot.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screenshotSceneGraph, buildRendererHtml } from "../../src/export/screenshot.js";
import { createFrame, createText, createRectangle } from "../../src/scene-graph/node-factory.js";
import type { FrameNode } from "../../src/scene-graph/types.js";

function makeScene(): FrameNode {
  const bg = createRectangle({
    id: "bg", name: "Background",
    x: 0, y: 0, width: 1200, height: 675,
    fills: [{ type: "SOLID", color: { r: 0.2, g: 0.1, b: 0.5, a: 1 } }],
  });
  const headline = createText({
    id: "h1", name: "Headline", characters: "Ship Faster",
    x: 100, y: 200, width: 600, height: 80,
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
    style: { fontSize: 64, fontWeight: 700 },
  });
  return createFrame({
    id: "root", name: "Banner",
    x: 0, y: 0, width: 1200, height: 675,
    children: [bg, headline],
  });
}

describe("buildRendererHtml", () => {
  it("produces a valid HTML string containing the scene graph", () => {
    const scene = makeScene();
    const html = buildRendererHtml(scene, 1200, 675);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Ship Faster");
    expect(html).toContain("1200");
    expect(html).toContain("675");
  });

  it("includes inline styles for nodes", () => {
    const scene = makeScene();
    const html = buildRendererHtml(scene, 1200, 675);
    expect(html).toContain("position:");
    expect(html).toContain("background");
  });
});

describe("screenshotSceneGraph", () => {
  it("returns a PNG buffer", async () => {
    const scene = makeScene();
    const result = await screenshotSceneGraph(scene, 1200, 675);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    // PNG magic bytes: 0x89 0x50 0x4E 0x47
    expect(result[0]).toBe(0x89);
    expect(result[1]).toBe(0x50);
    expect(result[2]).toBe(0x4e);
    expect(result[3]).toBe(0x47);
  }, 30_000);

  it("respects custom dimensions", async () => {
    const scene = makeScene();
    const result = await screenshotSceneGraph(scene, 800, 600);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  }, 30_000);
});
```

- [ ] **Step 6: Implement screenshot export**

```typescript
// src/export/screenshot.ts
import { chromium } from "playwright";
import type { FrameNode, SceneNode, SolidPaint, Paint, Color } from "../scene-graph/types.js";

/**
 * Converts a Color (0-1 range) to a CSS rgba string.
 */
function colorToCSS(c: Color): string {
  return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a})`;
}

/**
 * Gets the CSS background value from a fills array.
 */
function fillsToCSS(fills: Paint[]): string {
  if (fills.length === 0) return "transparent";
  const fill = fills[0];
  if (fill.type === "SOLID") {
    return colorToCSS(fill.color);
  }
  if (fill.type === "GRADIENT_LINEAR") {
    const stops = fill.stops
      .map((s) => `${colorToCSS(s.color)} ${Math.round(s.position * 100)}%`)
      .join(", ");
    return `linear-gradient(180deg, ${stops})`;
  }
  if (fill.type === "IMAGE") {
    return `url(${fill.source}) center/cover no-repeat`;
  }
  return "transparent";
}

/**
 * Recursively renders a scene graph node to an HTML string with inline styles.
 * This is a self-contained renderer that does not depend on React or Plan D —
 * it produces a static HTML document suitable for Playwright screenshotting.
 */
function renderNodeToHtml(node: SceneNode): string {
  if (!node.visible) return "";

  const baseStyles = [
    `position: absolute`,
    `left: ${node.x}px`,
    `top: ${node.y}px`,
    `width: ${node.width}px`,
    `height: ${node.height}px`,
    `opacity: ${node.opacity}`,
  ];

  if (node.type === "FRAME") {
    const bg = fillsToCSS(node.fills);
    const styles = [
      ...baseStyles,
      `background: ${bg}`,
      `border-radius: ${node.cornerRadius}px`,
      node.clipsContent ? `overflow: hidden` : `overflow: visible`,
    ];

    const childrenHtml = node.children.map(renderNodeToHtml).join("\n");
    return `<div style="${styles.join("; ")}">${childrenHtml}</div>`;
  }

  if (node.type === "TEXT") {
    const textColor = node.fills.length > 0 && node.fills[0].type === "SOLID"
      ? colorToCSS(node.fills[0].color)
      : "black";
    const styles = [
      ...baseStyles,
      `color: ${textColor}`,
      `font-family: ${node.style.fontFamily}, system-ui, sans-serif`,
      `font-size: ${node.style.fontSize}px`,
      `font-weight: ${node.style.fontWeight}`,
      `line-height: ${node.style.lineHeightPx}px`,
      `letter-spacing: ${node.style.letterSpacing}px`,
      `text-align: ${node.style.textAlignHorizontal.toLowerCase()}`,
      `display: flex`,
      `align-items: ${
        node.style.textAlignVertical === "TOP" ? "flex-start" :
        node.style.textAlignVertical === "BOTTOM" ? "flex-end" : "center"
      }`,
    ];
    // Escape HTML entities in text content
    const escaped = node.characters
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<div style="${styles.join("; ")}">${escaped}</div>`;
  }

  if (node.type === "RECTANGLE") {
    const bg = fillsToCSS(node.fills);
    const strokeCSS = node.strokes.length > 0 && node.strokes[0].type === "SOLID"
      ? `border: 1px solid ${colorToCSS(node.strokes[0].color)}`
      : "";
    const styles = [
      ...baseStyles,
      `background: ${bg}`,
      `border-radius: ${node.cornerRadius}px`,
      strokeCSS,
    ].filter(Boolean);
    return `<div style="${styles.join("; ")}"></div>`;
  }

  if (node.type === "IMAGE") {
    const styles = [
      ...baseStyles,
      `background: url(${node.source}) center/${node.fit === "contain" ? "contain" : node.fit === "fill" ? "100% 100%" : "cover"} no-repeat`,
    ];
    return `<div style="${styles.join("; ")}"></div>`;
  }

  return "";
}

/**
 * Builds a self-contained HTML document that renders the scene graph
 * at the specified dimensions. Used by Playwright for screenshotting.
 */
export function buildRendererHtml(scene: FrameNode, width: number, height: number): string {
  // Override root dimensions to match target export size
  const rootOverride: FrameNode = { ...scene, x: 0, y: 0, width, height };
  const bodyHtml = renderNodeToHtml(rootOverride);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=${width}, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      position: relative;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

/**
 * Renders a scene graph in a headless Chromium instance and captures a PNG screenshot.
 *
 * @param scene - The root FrameNode of the scene graph
 * @param width - Target width in pixels
 * @param height - Target height in pixels
 * @returns PNG image as a Buffer
 */
export async function screenshotSceneGraph(
  scene: FrameNode,
  width: number,
  height: number,
): Promise<Buffer> {
  const html = buildRendererHtml(scene, width, height);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2, // 2x for retina-quality export
    });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });

    // Small delay for any font loading or rendering to settle
    await page.waitForTimeout(200);

    const buffer = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width, height },
    });

    await context.close();
    return Buffer.from(buffer);
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run tests/export/dimensions.test.ts tests/export/screenshot.test.ts`
Expected: PASS — all dimension tests pass; screenshot tests pass (may take ~10s for Playwright launch)

- [ ] **Step 8: Commit**

```bash
git add src/export/types.ts src/export/dimensions.ts src/export/screenshot.ts tests/export/dimensions.test.ts tests/export/screenshot.test.ts
git commit -m "feat: add Playwright-based PNG screenshot export with dimension presets"
```

---

### Task 3: Multi-dimension export

**Files:**
- Create: `src/export/multi-export.ts`
- Create: `tests/export/multi-export.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/export/multi-export.test.ts
import { describe, it, expect } from "vitest";
import { exportMultipleDimensions } from "../../src/export/multi-export.js";
import { createFrame, createText, createRectangle } from "../../src/scene-graph/node-factory.js";
import type { FrameNode } from "../../src/scene-graph/types.js";
import type { TargetDimension } from "../../src/export/types.js";

function makeScene(): FrameNode {
  const bg = createRectangle({
    id: "bg", name: "BG",
    x: 0, y: 0, width: 1200, height: 675,
    fills: [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.4, a: 1 } }],
  });
  const headline = createText({
    id: "h1", name: "Headline", characters: "Test Export",
    x: 50, y: 100, width: 400, height: 60,
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
  });
  return createFrame({
    id: "root", name: "Banner",
    x: 0, y: 0, width: 1200, height: 675,
    children: [bg, headline],
  });
}

const TEST_DIMENSIONS: TargetDimension[] = [
  { name: "twitter", label: "Twitter", width: 1200, height: 675 },
  { name: "instagram-square", label: "Instagram", width: 1080, height: 1080 },
];

describe("exportMultipleDimensions", () => {
  it("returns one result per target dimension", async () => {
    const scene = makeScene();
    const results = await exportMultipleDimensions(scene, TEST_DIMENSIONS);
    expect(results).toHaveLength(2);
  }, 60_000);

  it("each result has the correct dimension metadata", async () => {
    const scene = makeScene();
    const results = await exportMultipleDimensions(scene, TEST_DIMENSIONS);
    expect(results[0].dimension.name).toBe("twitter");
    expect(results[1].dimension.name).toBe("instagram-square");
  }, 60_000);

  it("each result contains a valid PNG buffer", async () => {
    const scene = makeScene();
    const results = await exportMultipleDimensions(scene, TEST_DIMENSIONS);
    for (const r of results) {
      expect(r.buffer).toBeInstanceOf(Buffer);
      expect(r.buffer.length).toBeGreaterThan(0);
      // PNG magic bytes
      expect(r.buffer[0]).toBe(0x89);
      expect(r.buffer[1]).toBe(0x50);
    }
  }, 60_000);

  it("generates correct filenames", async () => {
    const scene = makeScene();
    const results = await exportMultipleDimensions(scene, TEST_DIMENSIONS);
    expect(results[0].filename).toBe("Banner-twitter-1200x675.png");
    expect(results[1].filename).toBe("Banner-instagram-square-1080x1080.png");
  }, 60_000);

  it("returns empty array for empty dimensions", async () => {
    const scene = makeScene();
    const results = await exportMultipleDimensions(scene, []);
    expect(results).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/export/multi-export.test.ts`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement multi-dimension export**

```typescript
// src/export/multi-export.ts
import { chromium } from "playwright";
import type { FrameNode } from "../scene-graph/types.js";
import type { TargetDimension, ExportResult } from "./types.js";
import { buildRendererHtml } from "./screenshot.js";

/**
 * Sanitizes a string for use in filenames.
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
}

/**
 * Exports a scene graph as PNG at multiple target dimensions.
 * Uses a single browser instance for efficiency — one page per dimension.
 *
 * @param scene - The root FrameNode
 * @param dimensions - List of target dimensions to render
 * @returns Array of ExportResult, one per dimension
 */
export async function exportMultipleDimensions(
  scene: FrameNode,
  dimensions: TargetDimension[],
): Promise<ExportResult[]> {
  if (dimensions.length === 0) return [];

  const browser = await chromium.launch({ headless: true });
  const results: ExportResult[] = [];

  try {
    for (const dim of dimensions) {
      const html = buildRendererHtml(scene, dim.width, dim.height);

      const context = await browser.newContext({
        viewport: { width: dim.width, height: dim.height },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: "load" });
      await page.waitForTimeout(200);

      const buffer = await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: dim.width, height: dim.height },
      });

      await context.close();

      const safeName = sanitizeFilename(scene.name);
      const filename = `${safeName}-${dim.name}-${dim.width}x${dim.height}.png`;

      results.push({
        dimension: dim,
        buffer: Buffer.from(buffer),
        mimeType: "image/png",
        filename,
      });
    }
  } finally {
    await browser.close();
  }

  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/export/multi-export.test.ts`
Expected: PASS — all 5 tests pass (may take ~30s total for Playwright renders)

- [ ] **Step 5: Commit**

```bash
git add src/export/multi-export.ts tests/export/multi-export.test.ts
git commit -m "feat: add multi-dimension PNG batch export via Playwright"
```

---

### Task 4: Figma node mapping utilities

**Files:**
- Create: `src/export/figma-mapper.ts`
- Create: `tests/export/figma-mapper.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/export/figma-mapper.test.ts
import { describe, it, expect } from "vitest";
import {
  mapNodeToFigma,
  mapSceneToFigma,
  colorToFigmaRGBA,
  fillsToFigmaPaints,
} from "../../src/export/figma-mapper.js";
import { createFrame, createText, createRectangle, createImage } from "../../src/scene-graph/node-factory.js";
import type { FrameNode } from "../../src/scene-graph/types.js";

describe("colorToFigmaRGBA", () => {
  it("maps 0-1 color to Figma RGBA format", () => {
    const result = colorToFigmaRGBA({ r: 0.5, g: 0.25, b: 1, a: 0.8 });
    expect(result).toEqual({ r: 0.5, g: 0.25, b: 1, a: 0.8 });
  });
});

describe("fillsToFigmaPaints", () => {
  it("maps solid fill to Figma SOLID paint", () => {
    const result = fillsToFigmaPaints([
      { type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } },
    ]);
    expect(result).toEqual([
      {
        type: "SOLID",
        color: { r: 1, g: 0, b: 0, a: 1 },
        opacity: 1,
      },
    ]);
  });

  it("maps gradient fill to Figma GRADIENT_LINEAR paint", () => {
    const result = fillsToFigmaPaints([
      {
        type: "GRADIENT_LINEAR",
        stops: [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
        ],
      },
    ]);
    expect(result[0].type).toBe("GRADIENT_LINEAR");
    expect(result[0].gradientStops).toHaveLength(2);
  });

  it("returns empty array for empty fills", () => {
    expect(fillsToFigmaPaints([])).toEqual([]);
  });
});

describe("mapNodeToFigma", () => {
  it("maps a FrameNode to Figma FRAME type", () => {
    const frame = createFrame({
      id: "f1", name: "Container",
      width: 800, height: 600,
      cornerRadius: 12,
      fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
      layoutMode: "HORIZONTAL",
      itemSpacing: 16,
      paddingLeft: 20,
      paddingRight: 20,
      paddingTop: 10,
      paddingBottom: 10,
    });
    const result = mapNodeToFigma(frame);
    expect(result.type).toBe("FRAME");
    expect(result.name).toBe("Container");
    expect(result.absoluteBoundingBox).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    expect(result.cornerRadius).toBe(12);
    expect(result.layoutMode).toBe("HORIZONTAL");
    expect(result.itemSpacing).toBe(16);
    expect(result.paddingLeft).toBe(20);
    expect(result.children).toEqual([]);
  });

  it("maps a TextNode to Figma TEXT type", () => {
    const text = createText({
      id: "t1", name: "Title",
      characters: "Hello World",
      width: 300, height: 50,
      fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
      style: { fontSize: 24, fontWeight: 700, fontFamily: "Inter" },
    });
    const result = mapNodeToFigma(text);
    expect(result.type).toBe("TEXT");
    expect(result.characters).toBe("Hello World");
    expect(result.style.fontSize).toBe(24);
    expect(result.style.fontWeight).toBe(700);
    expect(result.style.fontFamily).toBe("Inter");
  });

  it("maps a RectangleNode to Figma RECTANGLE type", () => {
    const rect = createRectangle({
      id: "r1", name: "Box",
      width: 100, height: 50,
      cornerRadius: 8,
      fills: [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } }],
    });
    const result = mapNodeToFigma(rect);
    expect(result.type).toBe("RECTANGLE");
    expect(result.cornerRadius).toBe(8);
  });

  it("maps an ImageNode to Figma RECTANGLE with image fill", () => {
    const img = createImage({
      id: "i1", name: "Hero",
      source: "https://example.com/hero.png",
      width: 400, height: 300,
    });
    const result = mapNodeToFigma(img);
    expect(result.type).toBe("RECTANGLE");
    expect(result.name).toBe("Hero");
    expect(result.fills[0].type).toBe("IMAGE");
    expect(result.fills[0].imageRef).toBe("https://example.com/hero.png");
    expect(result.fills[0].scaleMode).toBe("FILL");
  });
});

describe("mapSceneToFigma", () => {
  it("recursively maps an entire scene graph", () => {
    const child = createText({
      id: "t1", name: "Headline", characters: "Hi",
      width: 200, height: 40,
    });
    const root = createFrame({
      id: "root", name: "Banner",
      width: 1200, height: 675,
      children: [child],
    });
    const result = mapSceneToFigma(root);
    expect(result.type).toBe("FRAME");
    expect(result.children).toHaveLength(1);
    expect(result.children[0].type).toBe("TEXT");
    expect(result.children[0].characters).toBe("Hi");
  });

  it("preserves nested frame hierarchy", () => {
    const inner = createFrame({
      id: "inner", name: "Inner",
      width: 400, height: 200,
      children: [
        createRectangle({ id: "bg", name: "BG", width: 400, height: 200 }),
      ],
    });
    const root = createFrame({
      id: "root", name: "Root",
      width: 1200, height: 675,
      children: [inner],
    });
    const result = mapSceneToFigma(root);
    expect(result.children[0].type).toBe("FRAME");
    expect(result.children[0].children).toHaveLength(1);
    expect(result.children[0].children[0].type).toBe("RECTANGLE");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/export/figma-mapper.test.ts`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement Figma node mapper**

```typescript
// src/export/figma-mapper.ts
import type {
  SceneNode,
  FrameNode,
  TextNode,
  RectangleNode,
  ImageNode,
  Color,
  Paint,
  SolidPaint,
  GradientPaint,
  ImagePaint,
} from "../scene-graph/types.js";

// --- Figma REST API node type definitions (subset) ---

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaPaint {
  type: string;
  color?: FigmaColor;
  opacity?: number;
  gradientStops?: { position: number; color: FigmaColor }[];
  imageRef?: string;
  scaleMode?: string;
}

export interface FigmaBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaNode {
  type: string;
  name: string;
  absoluteBoundingBox: FigmaBoundingBox;
  fills: FigmaPaint[];
  strokes: FigmaPaint[];
  opacity: number;
  visible: boolean;
  cornerRadius?: number;
  layoutMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  clipsContent?: boolean;
  characters?: string;
  style?: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    textAlignHorizontal: string;
    textAlignVertical: string;
    lineHeightPx: number;
    letterSpacing: number;
  };
  children: FigmaNode[];
}

/**
 * Maps our Color type (already 0-1 range) to Figma's RGBA format.
 * They are identical in structure, but this function provides a clear contract.
 */
export function colorToFigmaRGBA(c: Color): FigmaColor {
  return { r: c.r, g: c.g, b: c.b, a: c.a };
}

/**
 * Maps our Paint[] to Figma's paint format.
 */
export function fillsToFigmaPaints(fills: Paint[]): FigmaPaint[] {
  return fills.map((fill): FigmaPaint => {
    if (fill.type === "SOLID") {
      return {
        type: "SOLID",
        color: colorToFigmaRGBA(fill.color),
        opacity: fill.opacity ?? 1,
      };
    }

    if (fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL") {
      return {
        type: fill.type,
        gradientStops: fill.stops.map((s) => ({
          position: s.position,
          color: colorToFigmaRGBA(s.color),
        })),
        opacity: fill.opacity ?? 1,
      };
    }

    if (fill.type === "IMAGE") {
      return {
        type: "IMAGE",
        imageRef: fill.source,
        scaleMode: fill.scaleMode === "FIT" ? "FIT" : "FILL",
        opacity: fill.opacity ?? 1,
      };
    }

    return { type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1 };
  });
}

/**
 * Maps a single SceneNode to Figma REST API node format.
 */
export function mapNodeToFigma(node: SceneNode): FigmaNode {
  const base = {
    name: node.name,
    absoluteBoundingBox: { x: node.x, y: node.y, width: node.width, height: node.height },
    fills: fillsToFigmaPaints(node.fills),
    strokes: fillsToFigmaPaints(node.strokes),
    opacity: node.opacity,
    visible: node.visible,
    children: [] as FigmaNode[],
  };

  if (node.type === "FRAME") {
    return {
      ...base,
      type: "FRAME",
      cornerRadius: node.cornerRadius,
      layoutMode: node.layoutMode === "NONE" ? undefined : node.layoutMode,
      primaryAxisAlignItems: node.primaryAxisAlignItems,
      counterAxisAlignItems: node.counterAxisAlignItems,
      itemSpacing: node.itemSpacing,
      paddingLeft: node.paddingLeft,
      paddingRight: node.paddingRight,
      paddingTop: node.paddingTop,
      paddingBottom: node.paddingBottom,
      clipsContent: node.clipsContent,
      children: node.children.map(mapNodeToFigma),
    };
  }

  if (node.type === "TEXT") {
    return {
      ...base,
      type: "TEXT",
      characters: node.characters,
      style: {
        fontFamily: node.style.fontFamily,
        fontSize: node.style.fontSize,
        fontWeight: node.style.fontWeight,
        textAlignHorizontal: node.style.textAlignHorizontal,
        textAlignVertical: node.style.textAlignVertical,
        lineHeightPx: node.style.lineHeightPx,
        letterSpacing: node.style.letterSpacing,
      },
    };
  }

  if (node.type === "RECTANGLE") {
    return {
      ...base,
      type: "RECTANGLE",
      cornerRadius: node.cornerRadius,
    };
  }

  if (node.type === "IMAGE") {
    // Figma has no "IMAGE" node type — images are represented as
    // RECTANGLE nodes with an image fill.
    return {
      ...base,
      type: "RECTANGLE",
      fills: [
        {
          type: "IMAGE",
          imageRef: node.source,
          scaleMode: node.fit === "contain" ? "FIT" : "FILL",
          opacity: 1,
        },
      ],
    };
  }

  // Fallback
  return { ...base, type: "RECTANGLE" };
}

/**
 * Maps an entire scene graph (rooted at a FrameNode) to Figma format.
 */
export function mapSceneToFigma(root: FrameNode): FigmaNode {
  return mapNodeToFigma(root);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/export/figma-mapper.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/export/figma-mapper.ts tests/export/figma-mapper.test.ts
git commit -m "feat: add Figma node mapper (scene graph → Figma REST API format)"
```

---

### Task 5: Figma export function

**Files:**
- Create: `src/export/figma-export.ts`
- Create: `tests/export/figma-export.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/export/figma-export.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportToFigma, buildFigmaApiPayload } from "../../src/export/figma-export.js";
import { createFrame, createText, createRectangle } from "../../src/scene-graph/node-factory.js";
import type { FrameNode } from "../../src/scene-graph/types.js";

function makeScene(): FrameNode {
  const headline = createText({
    id: "h1", name: "Headline", characters: "Launch Day",
    x: 60, y: 200, width: 500, height: 80,
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
    style: { fontSize: 64, fontWeight: 700 },
  });
  const bg = createRectangle({
    id: "bg", name: "Background",
    x: 0, y: 0, width: 1200, height: 675,
    fills: [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.3, a: 1 } }],
  });
  return createFrame({
    id: "root", name: "Banner",
    x: 0, y: 0, width: 1200, height: 675,
    children: [bg, headline],
  });
}

describe("buildFigmaApiPayload", () => {
  it("produces a valid Figma API nodes payload", () => {
    const scene = makeScene();
    const payload = buildFigmaApiPayload(scene);
    expect(payload).toHaveProperty("nodes");
    expect(Array.isArray(payload.nodes)).toBe(true);
    expect(payload.nodes.length).toBeGreaterThan(0);
  });

  it("root node is a FRAME with correct name", () => {
    const scene = makeScene();
    const payload = buildFigmaApiPayload(scene);
    expect(payload.nodes[0].type).toBe("FRAME");
    expect(payload.nodes[0].name).toBe("Banner");
  });

  it("includes child nodes", () => {
    const scene = makeScene();
    const payload = buildFigmaApiPayload(scene);
    const root = payload.nodes[0];
    expect(root.children).toHaveLength(2);
    expect(root.children[0].type).toBe("RECTANGLE");
    expect(root.children[1].type).toBe("TEXT");
    expect(root.children[1].characters).toBe("Launch Day");
  });
});

describe("exportToFigma", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the Figma API with correct headers", async () => {
    const scene = makeScene();

    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        nodes: { "0:1": { id: "0:1" } },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await exportToFigma({
      scene,
      figmaFileKey: "test-file-key",
      figmaAccessToken: "test-token",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("api.figma.com");
    expect(url).toContain("test-file-key");
    expect(options.headers["X-Figma-Token"]).toBe("test-token");
    expect(options.method).toBe("POST");

    vi.unstubAllGlobals();
  });

  it("returns file key and URL on success", async () => {
    const scene = makeScene();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        nodes: { "0:1": { id: "0:1" }, "0:2": { id: "0:2" } },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await exportToFigma({
      scene,
      figmaFileKey: "abc123",
      figmaAccessToken: "token",
    });

    expect(result.fileKey).toBe("abc123");
    expect(result.url).toContain("figma.com");
    expect(result.url).toContain("abc123");

    vi.unstubAllGlobals();
  });

  it("throws on API error", async () => {
    const scene = makeScene();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () => "Access denied",
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      exportToFigma({
        scene,
        figmaFileKey: "abc123",
        figmaAccessToken: "bad-token",
      }),
    ).rejects.toThrow("Figma API error");

    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/export/figma-export.test.ts`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement Figma export**

```typescript
// src/export/figma-export.ts
import type { FrameNode } from "../scene-graph/types.js";
import type { FigmaExportOptions, FigmaExportResult } from "./types.js";
import { mapSceneToFigma } from "./figma-mapper.js";
import type { FigmaNode } from "./figma-mapper.js";

const FIGMA_API_BASE = "https://api.figma.com/v1";

export interface FigmaApiPayload {
  nodes: FigmaNode[];
}

/**
 * Builds the Figma REST API payload from a scene graph.
 * The payload structure follows the Figma Plugin API / REST API
 * convention for creating nodes.
 */
export function buildFigmaApiPayload(scene: FrameNode): FigmaApiPayload {
  const figmaRoot = mapSceneToFigma(scene);
  return { nodes: [figmaRoot] };
}

/**
 * Exports a scene graph to a Figma file via the Figma REST API.
 *
 * This uses the Figma REST API to create nodes in a Figma file.
 * The scene graph nodes are mapped to Figma node types:
 *   Frame  → Figma Frame
 *   Text   → Figma Text
 *   Rectangle → Figma Rectangle
 *   Image  → Figma Rectangle with IMAGE fill
 *
 * @param options - Export options including scene graph, file key, and access token
 * @returns The file key, created node IDs, and a URL to the Figma file
 */
export async function exportToFigma(options: FigmaExportOptions): Promise<FigmaExportResult> {
  const { scene, figmaFileKey, figmaAccessToken, parentNodeId } = options;
  const payload = buildFigmaApiPayload(scene);

  const url = parentNodeId
    ? `${FIGMA_API_BASE}/files/${figmaFileKey}/nodes`
    : `${FIGMA_API_BASE}/files/${figmaFileKey}/nodes`;

  const body = JSON.stringify({
    nodes: payload.nodes,
    ...(parentNodeId ? { parent_id: parentNodeId } : {}),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Figma-Token": figmaAccessToken,
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Figma API error (${response.status} ${response.statusText}): ${errorText}`,
    );
  }

  const data = await response.json();

  // Extract created node IDs from response
  const nodeIds = data.nodes ? Object.keys(data.nodes) : [];

  return {
    fileKey: figmaFileKey,
    nodeIds,
    url: `https://www.figma.com/design/${figmaFileKey}`,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/export/figma-export.test.ts`
Expected: PASS — all 6 tests pass (API calls are mocked)

- [ ] **Step 5: Commit**

```bash
git add src/export/figma-export.ts tests/export/figma-export.test.ts
git commit -m "feat: add Figma export via REST API with node type mapping"
```

---

### Task 6: End-to-end demo script

**Files:**
- Create: `scripts/demo-e2e.ts`
- Create: `src/export/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// src/export/index.ts
export type { TargetDimension, ExportResult, ExportOptions, FigmaExportOptions, FigmaExportResult } from "./types.js";
export { DIMENSION_PRESETS, getDimension } from "./dimensions.js";
export { buildRendererHtml, screenshotSceneGraph } from "./screenshot.js";
export { exportMultipleDimensions } from "./multi-export.js";
export { mapNodeToFigma, mapSceneToFigma, colorToFigmaRGBA, fillsToFigmaPaints } from "./figma-mapper.js";
export type { FigmaNode, FigmaColor, FigmaPaint } from "./figma-mapper.js";
export { exportToFigma, buildFigmaApiPayload } from "./figma-export.js";
```

- [ ] **Step 2: Write the demo script**

```typescript
// scripts/demo-e2e.ts
/**
 * Brandouble End-to-End Demo
 *
 * Demonstrates the full pipeline:
 * 1. Build a scene graph (simulating Plan E composition agent output)
 * 2. Render the scene graph to HTML
 * 3. Screenshot at multiple dimensions via Playwright
 * 4. Write PNG files to disk
 * 5. Show Figma mapping output (dry run — no API call without token)
 *
 * Usage: npx tsx scripts/demo-e2e.ts
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createFrame, createText, createRectangle, createImage } from "../src/scene-graph/node-factory.js";
import type { FrameNode } from "../src/scene-graph/types.js";
import { exportMultipleDimensions } from "../src/export/multi-export.js";
import { DIMENSION_PRESETS, getDimension } from "../src/export/dimensions.js";
import { mapSceneToFigma } from "../src/export/figma-mapper.js";
import { buildFigmaApiPayload } from "../src/export/figma-export.js";

// --- Step 1: Build a sample scene graph ---

function buildDemoScene(): FrameNode {
  const background = createRectangle({
    id: "bg",
    name: "Background",
    x: 0,
    y: 0,
    width: 1200,
    height: 675,
    fills: [
      {
        type: "GRADIENT_LINEAR",
        stops: [
          { position: 0, color: { r: 0.08, g: 0.04, b: 0.2, a: 1 } },
          { position: 1, color: { r: 0.15, g: 0.08, b: 0.45, a: 1 } },
        ],
      },
    ],
  });

  const headline = createText({
    id: "headline",
    name: "Headline",
    characters: "Ship Faster",
    x: 60,
    y: 180,
    width: 500,
    height: 80,
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
    style: {
      fontFamily: "Inter",
      fontSize: 64,
      fontWeight: 700,
      textAlignHorizontal: "LEFT",
      textAlignVertical: "CENTER",
      lineHeightPx: 76,
      letterSpacing: -1,
    },
  });

  const subtext = createText({
    id: "subtext",
    name: "Subtext",
    characters: "DeFi lending, simplified. Launch your protocol in days, not months.",
    x: 60,
    y: 280,
    width: 460,
    height: 60,
    fills: [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.9, a: 0.8 } }],
    style: {
      fontFamily: "Inter",
      fontSize: 18,
      fontWeight: 400,
      textAlignHorizontal: "LEFT",
      textAlignVertical: "TOP",
      lineHeightPx: 28,
      letterSpacing: 0,
    },
  });

  const ctaButton = createRectangle({
    id: "cta-bg",
    name: "CTA Background",
    x: 60,
    y: 370,
    width: 180,
    height: 48,
    fills: [{ type: "SOLID", color: { r: 0.42, g: 0.36, b: 0.9, a: 1 } }],
    cornerRadius: 8,
  });

  const ctaText = createText({
    id: "cta-text",
    name: "CTA Text",
    characters: "Launch App",
    x: 85,
    y: 380,
    width: 130,
    height: 28,
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
    style: {
      fontFamily: "Inter",
      fontSize: 16,
      fontWeight: 600,
      textAlignHorizontal: "CENTER",
      textAlignVertical: "CENTER",
      lineHeightPx: 24,
      letterSpacing: 0,
    },
  });

  const accentRect = createRectangle({
    id: "accent",
    name: "Accent Shape",
    x: 650,
    y: 100,
    width: 480,
    height: 480,
    fills: [{ type: "SOLID", color: { r: 0.42, g: 0.36, b: 0.9, a: 0.15 } }],
    cornerRadius: 240,
  });

  const logo = createText({
    id: "logo",
    name: "Logo",
    characters: "ACME PROTOCOL",
    x: 60,
    y: 40,
    width: 200,
    height: 24,
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 0.6 } }],
    style: {
      fontFamily: "Inter",
      fontSize: 14,
      fontWeight: 600,
      textAlignHorizontal: "LEFT",
      textAlignVertical: "CENTER",
      lineHeightPx: 20,
      letterSpacing: 2,
    },
  });

  return createFrame({
    id: "root",
    name: "Acme-Protocol-Launch-Banner",
    x: 0,
    y: 0,
    width: 1200,
    height: 675,
    clipsContent: true,
    children: [background, accentRect, logo, headline, subtext, ctaButton, ctaText],
  });
}

// --- Main ---

async function main() {
  console.log("=== Brandouble End-to-End Demo ===\n");

  // Step 1: Build scene
  console.log("1. Building demo scene graph...");
  const scene = buildDemoScene();
  console.log(`   Root: "${scene.name}" (${scene.width}x${scene.height})`);
  console.log(`   Children: ${scene.children.length} nodes`);
  for (const child of scene.children) {
    console.log(`     - ${child.type} "${child.name}"`);
  }

  // Step 2: Prepare output directory
  const outputDir = join(process.cwd(), "output", "demo-export");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  console.log(`\n2. Output directory: ${outputDir}`);

  // Step 3: Export at multiple dimensions
  const targetDimensions = [
    getDimension("twitter")!,
    getDimension("instagram-square")!,
    getDimension("linkedin")!,
  ];

  console.log(`\n3. Exporting at ${targetDimensions.length} dimensions...`);
  const startTime = Date.now();
  const results = await exportMultipleDimensions(scene, targetDimensions);
  const elapsed = Date.now() - startTime;

  for (const result of results) {
    const filePath = join(outputDir, result.filename);
    writeFileSync(filePath, result.buffer);
    const sizeKb = Math.round(result.buffer.length / 1024);
    console.log(
      `   ${result.dimension.label} -> ${result.filename} (${sizeKb} KB)`,
    );
  }
  console.log(`   Total export time: ${elapsed}ms`);

  // Step 4: Save scene graph JSON
  const jsonPath = join(outputDir, "scene-graph.json");
  writeFileSync(jsonPath, JSON.stringify(scene, null, 2));
  console.log(`\n4. Scene graph JSON saved: scene-graph.json`);

  // Step 5: Figma mapping dry run
  console.log("\n5. Figma mapping (dry run)...");
  const figmaPayload = buildFigmaApiPayload(scene);
  const figmaJsonPath = join(outputDir, "figma-payload.json");
  writeFileSync(figmaJsonPath, JSON.stringify(figmaPayload, null, 2));
  console.log(`   Figma payload saved: figma-payload.json`);
  console.log(`   Root type: ${figmaPayload.nodes[0].type}`);
  console.log(`   Root children: ${figmaPayload.nodes[0].children.length}`);

  if (process.env.FIGMA_TOKEN && process.env.FIGMA_FILE_KEY) {
    console.log("\n   FIGMA_TOKEN and FIGMA_FILE_KEY detected — pushing to Figma...");
    const { exportToFigma } = await import("../src/export/figma-export.js");
    const result = await exportToFigma({
      scene,
      figmaFileKey: process.env.FIGMA_FILE_KEY,
      figmaAccessToken: process.env.FIGMA_TOKEN,
    });
    console.log(`   Pushed to Figma: ${result.url}`);
    console.log(`   Created nodes: ${result.nodeIds.join(", ")}`);
  } else {
    console.log("   Set FIGMA_TOKEN and FIGMA_FILE_KEY env vars to push to Figma.");
  }

  console.log("\n=== Demo complete ===");
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Run the demo script**

Run: `npx tsx scripts/demo-e2e.ts`
Expected: Script runs successfully, creates output/demo-export/ with PNG files, scene-graph.json, and figma-payload.json. Console shows the full pipeline output.

- [ ] **Step 4: Verify output files exist**

```bash
ls -la output/demo-export/
```

Expected: 5 files — 3 PNGs (Twitter, Instagram, LinkedIn), scene-graph.json, figma-payload.json.

- [ ] **Step 5: Commit**

```bash
git add src/export/index.ts scripts/demo-e2e.ts
git commit -m "feat: add end-to-end demo script (scene graph → multi-export → Figma mapping)"
```

---

### Task 7: Wire export buttons into the editor UI

**Files:**
- Create: `src/editor/components/export-toolbar.tsx`
- Modify: `src/editor/components/editor-layout.tsx`
- Modify: `src/editor/index.ts`
- Create: `tests/export/export-toolbar.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/export/export-toolbar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportToolbar } from "../../src/editor/components/export-toolbar.js";
import { EditorProvider } from "../../src/editor/context/editor-context.js";
import { createFrame, createText } from "../../src/scene-graph/node-factory.js";
import type { FrameNode } from "../../src/scene-graph/types.js";
import type { ReactNode } from "react";

function makeScene(): FrameNode {
  const headline = createText({
    id: "h1", name: "Headline", characters: "Test",
    x: 0, y: 0, width: 300, height: 50,
  });
  return createFrame({
    id: "root", name: "Banner",
    x: 0, y: 0, width: 1200, height: 675,
    children: [headline],
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  return <EditorProvider initialScene={makeScene()}>{children}</EditorProvider>;
}

describe("ExportToolbar", () => {
  it("renders export PNG button", () => {
    render(<Wrapper><ExportToolbar onExportPng={() => {}} onExportFigma={() => {}} /></Wrapper>);
    expect(screen.getByTestId("export-png-btn")).toBeInTheDocument();
    expect(screen.getByText(/export png/i)).toBeInTheDocument();
  });

  it("renders export to Figma button", () => {
    render(<Wrapper><ExportToolbar onExportPng={() => {}} onExportFigma={() => {}} /></Wrapper>);
    expect(screen.getByTestId("export-figma-btn")).toBeInTheDocument();
    expect(screen.getByText(/figma/i)).toBeInTheDocument();
  });

  it("renders dimension checkboxes", () => {
    render(<Wrapper><ExportToolbar onExportPng={() => {}} onExportFigma={() => {}} /></Wrapper>);
    expect(screen.getByLabelText(/twitter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/instagram/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument();
  });

  it("calls onExportPng with selected dimensions", () => {
    const onExportPng = vi.fn();
    render(<Wrapper><ExportToolbar onExportPng={onExportPng} onExportFigma={() => {}} /></Wrapper>);

    // Twitter should be checked by default
    fireEvent.click(screen.getByTestId("export-png-btn"));
    expect(onExportPng).toHaveBeenCalledTimes(1);
    const args = onExportPng.mock.calls[0][0];
    expect(Array.isArray(args)).toBe(true);
    expect(args.length).toBeGreaterThan(0);
  });

  it("calls onExportFigma when Figma button is clicked", () => {
    const onExportFigma = vi.fn();
    render(<Wrapper><ExportToolbar onExportPng={() => {}} onExportFigma={onExportFigma} /></Wrapper>);
    fireEvent.click(screen.getByTestId("export-figma-btn"));
    expect(onExportFigma).toHaveBeenCalledTimes(1);
  });

  it("disables export when no dimensions selected", () => {
    render(<Wrapper><ExportToolbar onExportPng={() => {}} onExportFigma={() => {}} /></Wrapper>);

    // Uncheck all dimensions
    const checkboxes = screen.getAllByRole("checkbox");
    for (const cb of checkboxes) {
      if ((cb as HTMLInputElement).checked) {
        fireEvent.click(cb);
      }
    }

    expect(screen.getByTestId("export-png-btn")).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/export/export-toolbar.test.tsx`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement ExportToolbar**

```typescript
// src/editor/components/export-toolbar.tsx
import { useState, useCallback } from "react";
import { DIMENSION_PRESETS } from "../../export/dimensions.js";
import type { TargetDimension } from "../../export/types.js";

interface ExportToolbarProps {
  onExportPng: (dimensions: TargetDimension[]) => void;
  onExportFigma: () => void;
  isExporting?: boolean;
}

export function ExportToolbar({ onExportPng, onExportFigma, isExporting }: ExportToolbarProps) {
  // Default: first 3 presets selected (Twitter, LinkedIn, Instagram Square)
  const [selectedDimensions, setSelectedDimensions] = useState<Set<string>>(
    new Set(DIMENSION_PRESETS.slice(0, 3).map((d) => d.name)),
  );

  const toggleDimension = useCallback((name: string) => {
    setSelectedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const handleExportPng = useCallback(() => {
    const dims = DIMENSION_PRESETS.filter((d) => selectedDimensions.has(d.name));
    onExportPng(dims);
  }, [selectedDimensions, onExportPng]);

  const noneSelected = selectedDimensions.size === 0;

  return (
    <div
      data-testid="export-toolbar"
      style={{
        padding: 12,
        borderTop: "1px solid #e5e7eb",
        backgroundColor: "#fafafa",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#6b7280",
          marginBottom: 8,
        }}
      >
        Export Dimensions
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        {DIMENSION_PRESETS.map((preset) => (
          <label
            key={preset.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={selectedDimensions.has(preset.name)}
              onChange={() => toggleDimension(preset.name)}
            />
            {preset.label}
          </label>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          data-testid="export-png-btn"
          onClick={handleExportPng}
          disabled={noneSelected || isExporting}
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 600,
            color: "white",
            backgroundColor: noneSelected || isExporting ? "#9ca3af" : "#3b82f6",
            border: "none",
            borderRadius: 6,
            cursor: noneSelected || isExporting ? "not-allowed" : "pointer",
          }}
        >
          {isExporting ? "Exporting..." : "Export PNG"}
        </button>

        <button
          data-testid="export-figma-btn"
          onClick={onExportFigma}
          disabled={isExporting}
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 600,
            color: "#3b82f6",
            backgroundColor: "white",
            border: "1px solid #3b82f6",
            borderRadius: 6,
            cursor: isExporting ? "not-allowed" : "pointer",
          }}
        >
          Figma
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire ExportToolbar into EditorLayout**

Update `src/editor/components/editor-layout.tsx` to include the export toolbar in the right sidebar:

```typescript
// src/editor/components/editor-layout.tsx (full replacement)
import { useCallback, useState } from "react";
import { EditorProvider } from "../context/editor-context.js";
import { useEditor } from "../hooks/use-editor.js";
import { LayerPanel } from "./layer-panel.js";
import { InteractionLayer } from "./interaction-layer.js";
import { PropertiesPanel } from "./properties-panel.js";
import { ExportToolbar } from "./export-toolbar.js";
import type { FrameNode } from "../../scene-graph/types.js";
import type { TargetDimension } from "../../export/types.js";

interface EditorLayoutProps {
  scene: FrameNode;
  children: React.ReactNode;
  onExportPng?: (scene: FrameNode, dimensions: TargetDimension[]) => void;
  onExportFigma?: (scene: FrameNode) => void;
}

function EditorLayoutInner({
  children,
  onExportPng,
  onExportFigma,
}: {
  children: React.ReactNode;
  onExportPng?: (scene: FrameNode, dimensions: TargetDimension[]) => void;
  onExportFigma?: (scene: FrameNode) => void;
}) {
  const { scene } = useEditor();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPng = useCallback(
    async (dimensions: TargetDimension[]) => {
      if (onExportPng) {
        setIsExporting(true);
        try {
          await onExportPng(scene, dimensions);
        } finally {
          setIsExporting(false);
        }
      }
    },
    [scene, onExportPng],
  );

  const handleExportFigma = useCallback(async () => {
    if (onExportFigma) {
      setIsExporting(true);
      try {
        await onExportFigma(scene);
      } finally {
        setIsExporting(false);
      }
    }
  }, [scene, onExportFigma]);

  return (
    <div
      data-testid="editor-layout"
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Left sidebar: layer panel */}
      <LayerPanel />

      {/* Center: canvas with interaction layer */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#e5e7eb",
          overflow: "auto",
          padding: 40,
        }}
      >
        <InteractionLayer canvasWidth={scene.width} canvasHeight={scene.height}>
          {children}
        </InteractionLayer>
      </div>

      {/* Right sidebar: properties + export */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <div style={{ flex: 1, overflow: "auto" }}>
          <PropertiesPanel />
        </div>
        <ExportToolbar
          onExportPng={handleExportPng}
          onExportFigma={handleExportFigma}
          isExporting={isExporting}
        />
      </div>
    </div>
  );
}

export function EditorLayout({ scene, children, onExportPng, onExportFigma }: EditorLayoutProps) {
  return (
    <EditorProvider initialScene={scene}>
      <EditorLayoutInner onExportPng={onExportPng} onExportFigma={onExportFigma}>
        {children}
      </EditorLayoutInner>
    </EditorProvider>
  );
}
```

- [ ] **Step 5: Update barrel export**

Add to `src/editor/index.ts`:

```typescript
export { ExportToolbar } from "./components/export-toolbar.js";
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/export/export-toolbar.test.tsx`
Expected: PASS — all 6 tests pass

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: PASS — all tests across editor and export modules pass

- [ ] **Step 8: Commit**

```bash
git add src/editor/components/export-toolbar.tsx src/editor/components/editor-layout.tsx src/editor/index.ts tests/export/export-toolbar.test.tsx
git commit -m "feat: wire export toolbar into editor with PNG and Figma export buttons"
```
