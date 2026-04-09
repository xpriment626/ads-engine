# Plan A: Scene Graph Engine + Template Archetypes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core scene graph data structure — Figma-compatible typed node tree with operations, serialization, and 4 starter template archetypes.

**Architecture:** TypeScript type definitions modeling a subset of Figma's REST API node types (Frame, Text, Rectangle, Image). Operations (insert, update, move, delete, replace) mutate the tree immutably. Templates are pre-built JSON scene graph files. All code is pure functions with no UI or network dependencies.

**Tech Stack:** TypeScript, Vitest (testing), zod (runtime validation)

**Phase:** 1 (no dependencies — can run in parallel with Plans B and C)

**Spec reference:** [2026-04-09-brandouble-mvp-design.md](../specs/2026-04-09-brandouble-mvp-design.md) — "Scene graph engine" section

---

## File structure

```
src/
  scene-graph/
    types.ts            # Node type definitions, Paint, Effect, TypeStyle
    node-factory.ts     # Helper functions to create nodes with defaults
    operations.ts       # insert, update, move, delete, replace operations
    serialize.ts        # JSON load/save with validation
    schema.ts           # Zod schemas for runtime validation
    index.ts            # Public API barrel export
  templates/
    types.ts            # Template metadata type
    hero-device.json    # Template archetype: device mockup centered
    split.json          # Template archetype: image/copy split
    announcement.json   # Template archetype: centered headline
    minimal.json        # Template archetype: logo + headline + CTA
    index.ts            # Template loader
tests/
  scene-graph/
    types.test.ts
    node-factory.test.ts
    operations.test.ts
    serialize.test.ts
  templates/
    templates.test.ts
```

---

### Task 1: Install test framework

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add test script to package.json**

Add to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

Run: `npm test`
Expected: "No test files found" or similar — confirms vitest is installed and configured.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest test framework"
```

---

### Task 2: Scene graph type definitions

**Files:**
- Create: `src/scene-graph/types.ts`
- Create: `tests/scene-graph/types.test.ts`

- [ ] **Step 1: Write the type smoke test**

```typescript
// tests/scene-graph/types.test.ts
import { describe, it, expect } from "vitest";
import type {
  SceneNode,
  FrameNode,
  TextNode,
  RectangleNode,
  ImageNode,
  Paint,
  SolidPaint,
  GradientPaint,
  ImagePaint,
  Effect,
  DropShadowEffect,
  TypeStyle,
} from "../../src/scene-graph/types.js";

describe("Scene graph types", () => {
  it("FrameNode has correct structure", () => {
    const frame: FrameNode = {
      id: "frame-1",
      type: "FRAME",
      name: "Banner",
      x: 0,
      y: 0,
      width: 1200,
      height: 675,
      fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
      strokes: [],
      effects: [],
      cornerRadius: 0,
      opacity: 1,
      visible: true,
      clipsContent: true,
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "SPACE_BETWEEN",
      counterAxisAlignItems: "CENTER",
      primaryAxisSizingMode: "FIXED",
      counterAxisSizingMode: "FIXED",
      paddingLeft: 60,
      paddingRight: 60,
      paddingTop: 40,
      paddingBottom: 40,
      itemSpacing: 24,
      children: [],
    };
    expect(frame.type).toBe("FRAME");
    expect(frame.layoutMode).toBe("HORIZONTAL");
    expect(frame.children).toEqual([]);
  });

  it("TextNode has correct structure", () => {
    const text: TextNode = {
      id: "text-1",
      type: "TEXT",
      name: "Headline",
      x: 0,
      y: 0,
      width: 500,
      height: 60,
      fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
      strokes: [],
      effects: [],
      opacity: 1,
      visible: true,
      characters: "Ship Faster",
      style: {
        fontFamily: "Inter",
        fontSize: 48,
        fontWeight: 700,
        textAlignHorizontal: "LEFT",
        textAlignVertical: "TOP",
        lineHeightPx: 58,
        letterSpacing: 0,
      },
    };
    expect(text.type).toBe("TEXT");
    expect(text.characters).toBe("Ship Faster");
  });

  it("ImageNode has correct structure", () => {
    const img: ImageNode = {
      id: "img-1",
      type: "IMAGE",
      name: "Hero",
      x: 0,
      y: 0,
      width: 400,
      height: 500,
      fills: [],
      strokes: [],
      effects: [],
      opacity: 1,
      visible: true,
      source: "https://example.com/hero.png",
      fit: "contain",
    };
    expect(img.type).toBe("IMAGE");
    expect(img.source).toBe("https://example.com/hero.png");
  });

  it("RectangleNode has correct structure", () => {
    const rect: RectangleNode = {
      id: "rect-1",
      type: "RECTANGLE",
      name: "Background",
      x: 0,
      y: 0,
      width: 200,
      height: 50,
      fills: [{ type: "SOLID", color: { r: 0.42, g: 0.36, b: 0.9, a: 1 } }],
      strokes: [],
      effects: [],
      cornerRadius: 8,
      opacity: 1,
      visible: true,
    };
    expect(rect.type).toBe("RECTANGLE");
    expect(rect.cornerRadius).toBe(8);
  });

  it("SceneNode union type accepts all node types", () => {
    const nodes: SceneNode[] = [
      {
        id: "f1", type: "FRAME", name: "F", x: 0, y: 0, width: 100, height: 100,
        fills: [], strokes: [], effects: [], cornerRadius: 0, opacity: 1, visible: true,
        clipsContent: false, layoutMode: "NONE",
        primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN",
        primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "FIXED",
        paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
        itemSpacing: 0, children: [],
      },
      {
        id: "t1", type: "TEXT", name: "T", x: 0, y: 0, width: 100, height: 20,
        fills: [], strokes: [], effects: [], opacity: 1, visible: true,
        characters: "Hello", style: {
          fontFamily: "Inter", fontSize: 16, fontWeight: 400,
          textAlignHorizontal: "LEFT", textAlignVertical: "TOP",
          lineHeightPx: 20, letterSpacing: 0,
        },
      },
    ];
    expect(nodes).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scene-graph/types.test.ts`
Expected: FAIL — cannot resolve imports from `../../src/scene-graph/types.js`

- [ ] **Step 3: Write the type definitions**

```typescript
// src/scene-graph/types.ts

// --- Color ---
export interface Color {
  r: number; // 0-1
  g: number;
  b: number;
  a: number;
}

// --- Paints ---
export interface SolidPaint {
  type: "SOLID";
  color: Color;
  opacity?: number;
}

export interface ColorStop {
  position: number; // 0-1
  color: Color;
}

export interface GradientPaint {
  type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL";
  stops: ColorStop[];
  opacity?: number;
}

export interface ImagePaint {
  type: "IMAGE";
  source: string; // URL or data URI
  scaleMode?: "FILL" | "FIT" | "CROP" | "TILE";
  opacity?: number;
}

export type Paint = SolidPaint | GradientPaint | ImagePaint;

// --- Effects ---
export interface DropShadowEffect {
  type: "DROP_SHADOW";
  color: Color;
  offset: { x: number; y: number };
  radius: number;
  visible?: boolean;
}

export interface BlurEffect {
  type: "LAYER_BLUR";
  radius: number;
  visible?: boolean;
}

export type Effect = DropShadowEffect | BlurEffect;

// --- Typography ---
export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textAlignHorizontal: "LEFT" | "CENTER" | "RIGHT";
  textAlignVertical: "TOP" | "CENTER" | "BOTTOM";
  lineHeightPx: number;
  letterSpacing: number;
}

// --- Layout types ---
export type LayoutMode = "NONE" | "HORIZONTAL" | "VERTICAL";
export type AxisAlign = "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
export type SizingMode = "FIXED" | "HUG" | "FILL";
export type ImageFit = "cover" | "contain" | "fill";

// --- Base node ---
export interface BaseNode {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  fills: Paint[];
  strokes: Paint[];
  effects: Effect[];
}

// --- Frame ---
export interface FrameNode extends BaseNode {
  type: "FRAME";
  cornerRadius: number;
  clipsContent: boolean;
  layoutMode: LayoutMode;
  primaryAxisAlignItems: AxisAlign;
  counterAxisAlignItems: AxisAlign;
  primaryAxisSizingMode: SizingMode;
  counterAxisSizingMode: SizingMode;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  itemSpacing: number;
  children: SceneNode[];
}

// --- Text ---
export interface TextNode extends BaseNode {
  type: "TEXT";
  characters: string;
  style: TypeStyle;
}

// --- Rectangle ---
export interface RectangleNode extends BaseNode {
  type: "RECTANGLE";
  cornerRadius: number;
}

// --- Image ---
export interface ImageNode extends BaseNode {
  type: "IMAGE";
  source: string;
  fit: ImageFit;
}

// --- Union ---
export type SceneNode = FrameNode | TextNode | RectangleNode | ImageNode;

// --- Type guard helpers ---
export function isFrame(node: SceneNode): node is FrameNode {
  return node.type === "FRAME";
}

export function isText(node: SceneNode): node is TextNode {
  return node.type === "TEXT";
}

export function isRectangle(node: SceneNode): node is RectangleNode {
  return node.type === "RECTANGLE";
}

export function isImage(node: SceneNode): node is ImageNode {
  return node.type === "IMAGE";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scene-graph/types.test.ts`
Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/scene-graph/types.ts tests/scene-graph/types.test.ts
git commit -m "feat: add scene graph type definitions (Figma-compatible)"
```

---

### Task 3: Node factory helpers

**Files:**
- Create: `src/scene-graph/node-factory.ts`
- Create: `tests/scene-graph/node-factory.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/scene-graph/node-factory.test.ts
import { describe, it, expect } from "vitest";
import { createFrame, createText, createRectangle, createImage } from "../../src/scene-graph/node-factory.js";

describe("Node factory", () => {
  it("createFrame produces valid FrameNode with defaults", () => {
    const frame = createFrame({ name: "Banner", width: 1200, height: 675 });
    expect(frame.type).toBe("FRAME");
    expect(frame.id).toMatch(/^frame-/);
    expect(frame.width).toBe(1200);
    expect(frame.height).toBe(675);
    expect(frame.layoutMode).toBe("NONE");
    expect(frame.opacity).toBe(1);
    expect(frame.visible).toBe(true);
    expect(frame.fills).toEqual([]);
    expect(frame.children).toEqual([]);
  });

  it("createFrame accepts overrides", () => {
    const frame = createFrame({
      name: "Row",
      width: 800,
      height: 100,
      layoutMode: "HORIZONTAL",
      itemSpacing: 16,
      fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }],
    });
    expect(frame.layoutMode).toBe("HORIZONTAL");
    expect(frame.itemSpacing).toBe(16);
    expect(frame.fills).toHaveLength(1);
  });

  it("createText produces valid TextNode", () => {
    const text = createText({ name: "Headline", characters: "Ship Faster", width: 400, height: 60 });
    expect(text.type).toBe("TEXT");
    expect(text.characters).toBe("Ship Faster");
    expect(text.style.fontFamily).toBe("Inter");
    expect(text.style.fontSize).toBe(16);
  });

  it("createText accepts style overrides", () => {
    const text = createText({
      name: "Title",
      characters: "Hello",
      width: 300,
      height: 50,
      style: { fontSize: 48, fontWeight: 700 },
    });
    expect(text.style.fontSize).toBe(48);
    expect(text.style.fontWeight).toBe(700);
    expect(text.style.fontFamily).toBe("Inter"); // default preserved
  });

  it("createRectangle produces valid RectangleNode", () => {
    const rect = createRectangle({ name: "BG", width: 200, height: 50 });
    expect(rect.type).toBe("RECTANGLE");
    expect(rect.cornerRadius).toBe(0);
  });

  it("createImage produces valid ImageNode", () => {
    const img = createImage({
      name: "Hero",
      source: "https://example.com/img.png",
      width: 400,
      height: 300,
    });
    expect(img.type).toBe("IMAGE");
    expect(img.source).toBe("https://example.com/img.png");
    expect(img.fit).toBe("cover");
  });

  it("each factory call generates a unique id", () => {
    const a = createFrame({ name: "A", width: 100, height: 100 });
    const b = createFrame({ name: "B", width: 100, height: 100 });
    expect(a.id).not.toBe(b.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scene-graph/node-factory.test.ts`
Expected: FAIL — cannot resolve `node-factory.js`

- [ ] **Step 3: Implement node factories**

```typescript
// src/scene-graph/node-factory.ts
import type {
  FrameNode, TextNode, RectangleNode, ImageNode,
  Paint, Effect, TypeStyle, LayoutMode, AxisAlign, SizingMode, ImageFit,
} from "./types.js";

let counter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++counter}-${Date.now().toString(36)}`;
}

const DEFAULT_STYLE: TypeStyle = {
  fontFamily: "Inter",
  fontSize: 16,
  fontWeight: 400,
  textAlignHorizontal: "LEFT",
  textAlignVertical: "TOP",
  lineHeightPx: 20,
  letterSpacing: 0,
};

interface FrameOpts {
  name: string;
  width: number;
  height: number;
  id?: string;
  x?: number;
  y?: number;
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  cornerRadius?: number;
  opacity?: number;
  visible?: boolean;
  clipsContent?: boolean;
  layoutMode?: LayoutMode;
  primaryAxisAlignItems?: AxisAlign;
  counterAxisAlignItems?: AxisAlign;
  primaryAxisSizingMode?: SizingMode;
  counterAxisSizingMode?: SizingMode;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  children?: FrameNode["children"];
}

export function createFrame(opts: FrameOpts): FrameNode {
  return {
    id: opts.id ?? nextId("frame"),
    type: "FRAME",
    name: opts.name,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width,
    height: opts.height,
    fills: opts.fills ?? [],
    strokes: opts.strokes ?? [],
    effects: opts.effects ?? [],
    cornerRadius: opts.cornerRadius ?? 0,
    opacity: opts.opacity ?? 1,
    visible: opts.visible ?? true,
    clipsContent: opts.clipsContent ?? false,
    layoutMode: opts.layoutMode ?? "NONE",
    primaryAxisAlignItems: opts.primaryAxisAlignItems ?? "MIN",
    counterAxisAlignItems: opts.counterAxisAlignItems ?? "MIN",
    primaryAxisSizingMode: opts.primaryAxisSizingMode ?? "FIXED",
    counterAxisSizingMode: opts.counterAxisSizingMode ?? "FIXED",
    paddingLeft: opts.paddingLeft ?? 0,
    paddingRight: opts.paddingRight ?? 0,
    paddingTop: opts.paddingTop ?? 0,
    paddingBottom: opts.paddingBottom ?? 0,
    itemSpacing: opts.itemSpacing ?? 0,
    children: opts.children ?? [],
  };
}

interface TextOpts {
  name: string;
  characters: string;
  width: number;
  height: number;
  id?: string;
  x?: number;
  y?: number;
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  opacity?: number;
  visible?: boolean;
  style?: Partial<TypeStyle>;
}

export function createText(opts: TextOpts): TextNode {
  return {
    id: opts.id ?? nextId("text"),
    type: "TEXT",
    name: opts.name,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width,
    height: opts.height,
    fills: opts.fills ?? [],
    strokes: opts.strokes ?? [],
    effects: opts.effects ?? [],
    opacity: opts.opacity ?? 1,
    visible: opts.visible ?? true,
    characters: opts.characters,
    style: { ...DEFAULT_STYLE, ...opts.style },
  };
}

interface RectangleOpts {
  name: string;
  width: number;
  height: number;
  id?: string;
  x?: number;
  y?: number;
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  cornerRadius?: number;
  opacity?: number;
  visible?: boolean;
}

export function createRectangle(opts: RectangleOpts): RectangleNode {
  return {
    id: opts.id ?? nextId("rect"),
    type: "RECTANGLE",
    name: opts.name,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width,
    height: opts.height,
    fills: opts.fills ?? [],
    strokes: opts.strokes ?? [],
    effects: opts.effects ?? [],
    cornerRadius: opts.cornerRadius ?? 0,
    opacity: opts.opacity ?? 1,
    visible: opts.visible ?? true,
  };
}

interface ImageOpts {
  name: string;
  source: string;
  width: number;
  height: number;
  id?: string;
  x?: number;
  y?: number;
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  opacity?: number;
  visible?: boolean;
  fit?: ImageFit;
}

export function createImage(opts: ImageOpts): ImageNode {
  return {
    id: opts.id ?? nextId("img"),
    type: "IMAGE",
    name: opts.name,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width,
    height: opts.height,
    fills: opts.fills ?? [],
    strokes: opts.strokes ?? [],
    effects: opts.effects ?? [],
    opacity: opts.opacity ?? 1,
    visible: opts.visible ?? true,
    source: opts.source,
    fit: opts.fit ?? "cover",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scene-graph/node-factory.test.ts`
Expected: PASS — all 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/scene-graph/node-factory.ts tests/scene-graph/node-factory.test.ts
git commit -m "feat: add scene graph node factory helpers"
```

---

### Task 4: Scene graph operations

**Files:**
- Create: `src/scene-graph/operations.ts`
- Create: `tests/scene-graph/operations.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/scene-graph/operations.test.ts
import { describe, it, expect } from "vitest";
import { insertNode, updateNode, moveNode, deleteNode, replaceNode, findNode } from "../../src/scene-graph/operations.js";
import { createFrame, createText, createImage } from "../../src/scene-graph/node-factory.js";

describe("Scene graph operations", () => {
  function makeTree() {
    const headline = createText({ id: "h1", name: "Headline", characters: "Hello", width: 300, height: 50 });
    const subtext = createText({ id: "sub", name: "Subtext", characters: "World", width: 300, height: 30 });
    const copy = createFrame({ id: "copy", name: "Copy", width: 400, height: 200, children: [headline, subtext] });
    const hero = createImage({ id: "hero", name: "Hero", source: "hero.png", width: 400, height: 500 });
    const root = createFrame({ id: "root", name: "Banner", width: 1200, height: 675, children: [copy, hero] });
    return root;
  }

  describe("findNode", () => {
    it("finds root by id", () => {
      const root = makeTree();
      expect(findNode(root, "root")?.name).toBe("Banner");
    });

    it("finds nested node by id", () => {
      const root = makeTree();
      expect(findNode(root, "h1")?.name).toBe("Headline");
    });

    it("returns undefined for missing id", () => {
      const root = makeTree();
      expect(findNode(root, "nope")).toBeUndefined();
    });
  });

  describe("insertNode", () => {
    it("inserts a child into a frame", () => {
      const root = makeTree();
      const cta = createText({ id: "cta", name: "CTA", characters: "Click", width: 100, height: 40 });
      const updated = insertNode(root, "copy", cta);
      const copyNode = findNode(updated, "copy");
      expect(copyNode?.type === "FRAME" && copyNode.children).toHaveLength(3);
    });

    it("throws if parent is not a frame", () => {
      const root = makeTree();
      const node = createText({ id: "x", name: "X", characters: "X", width: 50, height: 20 });
      expect(() => insertNode(root, "h1", node)).toThrow("not a FRAME");
    });

    it("throws if parent not found", () => {
      const root = makeTree();
      const node = createText({ id: "x", name: "X", characters: "X", width: 50, height: 20 });
      expect(() => insertNode(root, "missing", node)).toThrow("not found");
    });
  });

  describe("updateNode", () => {
    it("updates text characters", () => {
      const root = makeTree();
      const updated = updateNode(root, "h1", { characters: "Updated" });
      const node = findNode(updated, "h1");
      expect(node?.type === "TEXT" && node.characters).toBe("Updated");
    });

    it("updates frame fills", () => {
      const root = makeTree();
      const updated = updateNode(root, "root", {
        fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 1, a: 1 } }],
      });
      expect(updated.fills).toHaveLength(1);
    });

    it("preserves unmodified properties", () => {
      const root = makeTree();
      const updated = updateNode(root, "h1", { characters: "New" });
      const node = findNode(updated, "h1");
      expect(node?.name).toBe("Headline");
      expect(node?.width).toBe(300);
    });
  });

  describe("deleteNode", () => {
    it("removes a child node", () => {
      const root = makeTree();
      const updated = deleteNode(root, "sub");
      const copy = findNode(updated, "copy");
      expect(copy?.type === "FRAME" && copy.children).toHaveLength(1);
    });

    it("throws if deleting root", () => {
      const root = makeTree();
      expect(() => deleteNode(root, "root")).toThrow("Cannot delete root");
    });
  });

  describe("moveNode", () => {
    it("moves a node to a different parent", () => {
      const root = makeTree();
      const updated = moveNode(root, "sub", "root");
      const copy = findNode(updated, "copy");
      expect(copy?.type === "FRAME" && copy.children).toHaveLength(1);
      expect(updated.children).toHaveLength(3);
    });
  });

  describe("replaceNode", () => {
    it("replaces a node with a new one", () => {
      const root = makeTree();
      const newHero = createImage({ id: "hero2", name: "NewHero", source: "new.png", width: 400, height: 500 });
      const updated = replaceNode(root, "hero", newHero);
      expect(findNode(updated, "hero")).toBeUndefined();
      expect(findNode(updated, "hero2")?.name).toBe("NewHero");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scene-graph/operations.test.ts`
Expected: FAIL — cannot resolve `operations.js`

- [ ] **Step 3: Implement operations**

```typescript
// src/scene-graph/operations.ts
import type { SceneNode, FrameNode } from "./types.js";
import { isFrame } from "./types.js";

/**
 * Deep-clone a scene node tree.
 */
function clone<T extends SceneNode>(node: T): T {
  return JSON.parse(JSON.stringify(node));
}

/**
 * Find a node by ID in the tree. Returns undefined if not found.
 */
export function findNode(root: SceneNode, id: string): SceneNode | undefined {
  if (root.id === id) return root;
  if (isFrame(root)) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Find the parent frame of a node by ID. Returns undefined for root.
 */
function findParent(root: SceneNode, targetId: string): FrameNode | undefined {
  if (isFrame(root)) {
    for (const child of root.children) {
      if (child.id === targetId) return root;
      const found = findParent(child, targetId);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Insert a node as a child of the frame with the given parentId.
 * Returns a new tree (immutable).
 */
export function insertNode(root: FrameNode, parentId: string, node: SceneNode): FrameNode {
  const tree = clone(root);
  const parent = findNode(tree, parentId);
  if (!parent) throw new Error(`Parent "${parentId}" not found`);
  if (!isFrame(parent)) throw new Error(`Parent "${parentId}" is not a FRAME`);
  parent.children.push(node);
  return tree;
}

/**
 * Update properties of a node. Shallow merge of props onto the node.
 * Returns a new tree (immutable).
 */
export function updateNode(root: FrameNode, nodeId: string, props: Record<string, unknown>): FrameNode {
  const tree = clone(root);
  const node = findNode(tree, nodeId);
  if (!node) throw new Error(`Node "${nodeId}" not found`);
  Object.assign(node, props);
  return tree;
}

/**
 * Delete a node from the tree by ID. Cannot delete root.
 * Returns a new tree (immutable).
 */
export function deleteNode(root: FrameNode, nodeId: string): FrameNode {
  if (root.id === nodeId) throw new Error("Cannot delete root node");
  const tree = clone(root);
  const parent = findParent(tree, nodeId);
  if (!parent) throw new Error(`Node "${nodeId}" not found`);
  parent.children = parent.children.filter((c) => c.id !== nodeId);
  return tree;
}

/**
 * Move a node to a new parent frame. Removes from old parent, appends to new.
 * Returns a new tree (immutable).
 */
export function moveNode(root: FrameNode, nodeId: string, newParentId: string): FrameNode {
  const tree = clone(root);
  const oldParent = findParent(tree, nodeId);
  if (!oldParent) throw new Error(`Node "${nodeId}" not found`);
  const node = oldParent.children.find((c) => c.id === nodeId);
  if (!node) throw new Error(`Node "${nodeId}" not found in parent`);
  oldParent.children = oldParent.children.filter((c) => c.id !== nodeId);
  const newParent = findNode(tree, newParentId);
  if (!newParent) throw new Error(`New parent "${newParentId}" not found`);
  if (!isFrame(newParent)) throw new Error(`New parent "${newParentId}" is not a FRAME`);
  newParent.children.push(node);
  return tree;
}

/**
 * Replace a node with a new node. Preserves position in parent.
 * Returns a new tree (immutable).
 */
export function replaceNode(root: FrameNode, nodeId: string, newNode: SceneNode): FrameNode {
  const tree = clone(root);
  const parent = findParent(tree, nodeId);
  if (!parent) throw new Error(`Node "${nodeId}" not found`);
  const idx = parent.children.findIndex((c) => c.id === nodeId);
  parent.children[idx] = newNode;
  return tree;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scene-graph/operations.test.ts`
Expected: PASS — all 10 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/scene-graph/operations.ts tests/scene-graph/operations.test.ts
git commit -m "feat: add scene graph operations (insert, update, move, delete, replace)"
```

---

### Task 5: Serialization (JSON load/save with validation)

**Files:**
- Create: `src/scene-graph/schema.ts`
- Create: `src/scene-graph/serialize.ts`
- Create: `tests/scene-graph/serialize.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/scene-graph/serialize.test.ts
import { describe, it, expect } from "vitest";
import { serializeGraph, deserializeGraph } from "../../src/scene-graph/serialize.js";
import { createFrame, createText, createImage } from "../../src/scene-graph/node-factory.js";
import { writeFileSync, readFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const TMP_DIR = join(import.meta.dirname, "../../.test-tmp");

describe("Serialization", () => {
  function makeGraph() {
    const headline = createText({ id: "h1", name: "Headline", characters: "Test", width: 300, height: 50 });
    return createFrame({ id: "root", name: "Banner", width: 1200, height: 675, children: [headline] });
  }

  it("serializeGraph produces valid JSON string", () => {
    const graph = makeGraph();
    const json = serializeGraph(graph);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("FRAME");
    expect(parsed.children).toHaveLength(1);
  });

  it("deserializeGraph restores from JSON string", () => {
    const graph = makeGraph();
    const json = serializeGraph(graph);
    const restored = deserializeGraph(json);
    expect(restored.id).toBe("root");
    expect(restored.type).toBe("FRAME");
    expect(restored.children[0].type).toBe("TEXT");
  });

  it("deserializeGraph throws on invalid JSON", () => {
    expect(() => deserializeGraph("not json")).toThrow();
  });

  it("deserializeGraph throws on invalid node structure", () => {
    expect(() => deserializeGraph(JSON.stringify({ type: "INVALID", id: "x" }))).toThrow();
  });

  it("roundtrips through file write/read", () => {
    mkdirSync(TMP_DIR, { recursive: true });
    const path = join(TMP_DIR, "test-banner.json");
    const graph = makeGraph();
    writeFileSync(path, serializeGraph(graph));
    const loaded = deserializeGraph(readFileSync(path, "utf-8"));
    expect(loaded.name).toBe("Banner");
    rmSync(TMP_DIR, { recursive: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scene-graph/serialize.test.ts`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement zod schemas**

```typescript
// src/scene-graph/schema.ts
import { z } from "zod";

const colorSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
  a: z.number().min(0).max(1),
});

const solidPaintSchema = z.object({
  type: z.literal("SOLID"),
  color: colorSchema,
  opacity: z.number().optional(),
});

const colorStopSchema = z.object({
  position: z.number().min(0).max(1),
  color: colorSchema,
});

const gradientPaintSchema = z.object({
  type: z.enum(["GRADIENT_LINEAR", "GRADIENT_RADIAL"]),
  stops: z.array(colorStopSchema),
  opacity: z.number().optional(),
});

const imagePaintSchema = z.object({
  type: z.literal("IMAGE"),
  source: z.string(),
  scaleMode: z.enum(["FILL", "FIT", "CROP", "TILE"]).optional(),
  opacity: z.number().optional(),
});

const paintSchema = z.discriminatedUnion("type", [solidPaintSchema, gradientPaintSchema, imagePaintSchema]);

const dropShadowSchema = z.object({
  type: z.literal("DROP_SHADOW"),
  color: colorSchema,
  offset: z.object({ x: z.number(), y: z.number() }),
  radius: z.number(),
  visible: z.boolean().optional(),
});

const blurSchema = z.object({
  type: z.literal("LAYER_BLUR"),
  radius: z.number(),
  visible: z.boolean().optional(),
});

const effectSchema = z.discriminatedUnion("type", [dropShadowSchema, blurSchema]);

const typeStyleSchema = z.object({
  fontFamily: z.string(),
  fontSize: z.number(),
  fontWeight: z.number(),
  textAlignHorizontal: z.enum(["LEFT", "CENTER", "RIGHT"]),
  textAlignVertical: z.enum(["TOP", "CENTER", "BOTTOM"]),
  lineHeightPx: z.number(),
  letterSpacing: z.number(),
});

const baseNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  opacity: z.number(),
  visible: z.boolean(),
  fills: z.array(paintSchema),
  strokes: z.array(paintSchema),
  effects: z.array(effectSchema),
});

const textNodeSchema = baseNodeSchema.extend({
  type: z.literal("TEXT"),
  characters: z.string(),
  style: typeStyleSchema,
});

const rectangleNodeSchema = baseNodeSchema.extend({
  type: z.literal("RECTANGLE"),
  cornerRadius: z.number(),
});

const imageNodeSchema = baseNodeSchema.extend({
  type: z.literal("IMAGE"),
  source: z.string(),
  fit: z.enum(["cover", "contain", "fill"]),
});

// Frame is recursive — use z.lazy
const sceneNodeSchema: z.ZodType = z.lazy(() =>
  z.discriminatedUnion("type", [frameNodeSchema, textNodeSchema, rectangleNodeSchema, imageNodeSchema])
);

const frameNodeSchema = baseNodeSchema.extend({
  type: z.literal("FRAME"),
  cornerRadius: z.number(),
  clipsContent: z.boolean(),
  layoutMode: z.enum(["NONE", "HORIZONTAL", "VERTICAL"]),
  primaryAxisAlignItems: z.enum(["MIN", "CENTER", "MAX", "SPACE_BETWEEN"]),
  counterAxisAlignItems: z.enum(["MIN", "CENTER", "MAX", "SPACE_BETWEEN"]),
  primaryAxisSizingMode: z.enum(["FIXED", "HUG", "FILL"]),
  counterAxisSizingMode: z.enum(["FIXED", "HUG", "FILL"]),
  paddingLeft: z.number(),
  paddingRight: z.number(),
  paddingTop: z.number(),
  paddingBottom: z.number(),
  itemSpacing: z.number(),
  children: z.array(sceneNodeSchema),
});

export { frameNodeSchema, sceneNodeSchema };
```

- [ ] **Step 4: Implement serialize/deserialize**

```typescript
// src/scene-graph/serialize.ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/scene-graph/serialize.test.ts`
Expected: PASS — all 5 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/scene-graph/schema.ts src/scene-graph/serialize.ts tests/scene-graph/serialize.test.ts
git commit -m "feat: add scene graph serialization with zod validation"
```

---

### Task 6: Barrel export

**Files:**
- Create: `src/scene-graph/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// src/scene-graph/index.ts
export * from "./types.js";
export * from "./node-factory.js";
export * from "./operations.js";
export * from "./serialize.js";
```

- [ ] **Step 2: Verify all tests still pass**

Run: `npx vitest run`
Expected: PASS — all tests from Tasks 2-5 pass

- [ ] **Step 3: Commit**

```bash
git add src/scene-graph/index.ts
git commit -m "feat: add scene graph barrel export"
```

---

### Task 7: Template archetypes

**Files:**
- Create: `src/templates/types.ts`
- Create: `src/templates/hero-device.json`
- Create: `src/templates/split.json`
- Create: `src/templates/announcement.json`
- Create: `src/templates/minimal.json`
- Create: `src/templates/index.ts`
- Create: `tests/templates/templates.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/templates/templates.test.ts
import { describe, it, expect } from "vitest";
import { loadTemplate, listTemplates } from "../../src/templates/index.js";
import { deserializeGraph } from "../../src/scene-graph/serialize.js";
import { findNode } from "../../src/scene-graph/operations.js";

describe("Template archetypes", () => {
  it("listTemplates returns all 4 templates", () => {
    const templates = listTemplates();
    expect(templates).toHaveLength(4);
    const names = templates.map((t) => t.id);
    expect(names).toContain("hero-device");
    expect(names).toContain("split");
    expect(names).toContain("announcement");
    expect(names).toContain("minimal");
  });

  it("each template has required metadata", () => {
    for (const tmpl of listTemplates()) {
      expect(tmpl.id).toBeTruthy();
      expect(tmpl.name).toBeTruthy();
      expect(tmpl.description).toBeTruthy();
      expect(tmpl.slots).toBeDefined();
      expect(Array.isArray(tmpl.slots)).toBe(true);
      expect(tmpl.slots.length).toBeGreaterThan(0);
    }
  });

  it("loadTemplate returns a valid scene graph for hero-device", () => {
    const graph = loadTemplate("hero-device");
    expect(graph.type).toBe("FRAME");
    expect(graph.name).toBe("Banner");
    // Should validate without throwing
    const json = JSON.stringify(graph);
    const restored = deserializeGraph(json);
    expect(restored.type).toBe("FRAME");
  });

  it("loadTemplate returns a valid scene graph for split", () => {
    const graph = loadTemplate("split");
    expect(graph.type).toBe("FRAME");
  });

  it("loadTemplate returns a valid scene graph for announcement", () => {
    const graph = loadTemplate("announcement");
    expect(graph.type).toBe("FRAME");
  });

  it("loadTemplate returns a valid scene graph for minimal", () => {
    const graph = loadTemplate("minimal");
    expect(graph.type).toBe("FRAME");
  });

  it("hero-device template has expected slots", () => {
    const meta = listTemplates().find((t) => t.id === "hero-device")!;
    const slotNames = meta.slots.map((s) => s.name);
    expect(slotNames).toContain("headline");
    expect(slotNames).toContain("device-mockup");
  });

  it("templates have placeholder node IDs matching slot names", () => {
    for (const tmpl of listTemplates()) {
      const graph = loadTemplate(tmpl.id);
      for (const slot of tmpl.slots) {
        const node = findNode(graph, slot.nodeId);
        expect(node, `Slot "${slot.name}" (nodeId: ${slot.nodeId}) not found in template "${tmpl.id}"`).toBeDefined();
      }
    }
  });

  it("loadTemplate throws for unknown template", () => {
    expect(() => loadTemplate("nonexistent")).toThrow("not found");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/templates/templates.test.ts`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Create template metadata types**

```typescript
// src/templates/types.ts
export interface TemplateSlot {
  name: string;
  nodeId: string;
  nodeType: "FRAME" | "TEXT" | "IMAGE" | "RECTANGLE";
  description: string;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  slots: TemplateSlot[];
}
```

- [ ] **Step 4: Create hero-device template**

```json
// src/templates/hero-device.json
{
  "id": "root",
  "type": "FRAME",
  "name": "Banner",
  "x": 0, "y": 0, "width": 1200, "height": 675,
  "fills": [{ "type": "SOLID", "color": { "r": 0.96, "g": 0.96, "b": 0.97, "a": 1 } }],
  "strokes": [], "effects": [],
  "cornerRadius": 0, "opacity": 1, "visible": true,
  "clipsContent": true,
  "layoutMode": "VERTICAL",
  "primaryAxisAlignItems": "CENTER",
  "counterAxisAlignItems": "CENTER",
  "primaryAxisSizingMode": "FIXED",
  "counterAxisSizingMode": "FIXED",
  "paddingLeft": 60, "paddingRight": 60, "paddingTop": 48, "paddingBottom": 48,
  "itemSpacing": 32,
  "children": [
    {
      "id": "headline",
      "type": "TEXT",
      "name": "Headline",
      "x": 0, "y": 0, "width": 800, "height": 60,
      "fills": [{ "type": "SOLID", "color": { "r": 0.1, "g": 0.1, "b": 0.12, "a": 1 } }],
      "strokes": [], "effects": [],
      "opacity": 1, "visible": true,
      "characters": "Your Headline Here",
      "style": {
        "fontFamily": "Inter", "fontSize": 48, "fontWeight": 700,
        "textAlignHorizontal": "CENTER", "textAlignVertical": "TOP",
        "lineHeightPx": 58, "letterSpacing": -1
      }
    },
    {
      "id": "device-mockup",
      "type": "IMAGE",
      "name": "DeviceMockup",
      "x": 0, "y": 0, "width": 300, "height": 400,
      "fills": [], "strokes": [], "effects": [],
      "opacity": 1, "visible": true,
      "source": "",
      "fit": "contain"
    },
    {
      "id": "cta",
      "type": "FRAME",
      "name": "CTA",
      "x": 0, "y": 0, "width": 200, "height": 48,
      "fills": [{ "type": "SOLID", "color": { "r": 0.42, "g": 0.36, "b": 0.9, "a": 1 } }],
      "strokes": [], "effects": [],
      "cornerRadius": 8, "opacity": 1, "visible": true,
      "clipsContent": false,
      "layoutMode": "HORIZONTAL",
      "primaryAxisAlignItems": "CENTER",
      "counterAxisAlignItems": "CENTER",
      "primaryAxisSizingMode": "HUG",
      "counterAxisSizingMode": "HUG",
      "paddingLeft": 24, "paddingRight": 24, "paddingTop": 12, "paddingBottom": 12,
      "itemSpacing": 0,
      "children": [
        {
          "id": "cta-text",
          "type": "TEXT",
          "name": "CTAText",
          "x": 0, "y": 0, "width": 150, "height": 24,
          "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1, "a": 1 } }],
          "strokes": [], "effects": [],
          "opacity": 1, "visible": true,
          "characters": "Get Started",
          "style": {
            "fontFamily": "Inter", "fontSize": 16, "fontWeight": 600,
            "textAlignHorizontal": "CENTER", "textAlignVertical": "CENTER",
            "lineHeightPx": 24, "letterSpacing": 0
          }
        }
      ]
    }
  ]
}
```

- [ ] **Step 5: Create split template**

```json
// src/templates/split.json
{
  "id": "root",
  "type": "FRAME",
  "name": "Banner",
  "x": 0, "y": 0, "width": 1200, "height": 675,
  "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1, "a": 1 } }],
  "strokes": [], "effects": [],
  "cornerRadius": 0, "opacity": 1, "visible": true,
  "clipsContent": true,
  "layoutMode": "HORIZONTAL",
  "primaryAxisAlignItems": "SPACE_BETWEEN",
  "counterAxisAlignItems": "CENTER",
  "primaryAxisSizingMode": "FIXED",
  "counterAxisSizingMode": "FIXED",
  "paddingLeft": 60, "paddingRight": 60, "paddingTop": 48, "paddingBottom": 48,
  "itemSpacing": 40,
  "children": [
    {
      "id": "copy-group",
      "type": "FRAME",
      "name": "CopyGroup",
      "x": 0, "y": 0, "width": 500, "height": 400,
      "fills": [], "strokes": [], "effects": [],
      "cornerRadius": 0, "opacity": 1, "visible": true,
      "clipsContent": false,
      "layoutMode": "VERTICAL",
      "primaryAxisAlignItems": "MIN",
      "counterAxisAlignItems": "MIN",
      "primaryAxisSizingMode": "FIXED",
      "counterAxisSizingMode": "FIXED",
      "paddingLeft": 0, "paddingRight": 0, "paddingTop": 0, "paddingBottom": 0,
      "itemSpacing": 20,
      "children": [
        {
          "id": "headline",
          "type": "TEXT",
          "name": "Headline",
          "x": 0, "y": 0, "width": 500, "height": 60,
          "fills": [{ "type": "SOLID", "color": { "r": 0.1, "g": 0.1, "b": 0.12, "a": 1 } }],
          "strokes": [], "effects": [],
          "opacity": 1, "visible": true,
          "characters": "Your Headline Here",
          "style": {
            "fontFamily": "Inter", "fontSize": 42, "fontWeight": 700,
            "textAlignHorizontal": "LEFT", "textAlignVertical": "TOP",
            "lineHeightPx": 50, "letterSpacing": -0.5
          }
        },
        {
          "id": "subtext",
          "type": "TEXT",
          "name": "Subtext",
          "x": 0, "y": 0, "width": 500, "height": 48,
          "fills": [{ "type": "SOLID", "color": { "r": 0.4, "g": 0.4, "b": 0.45, "a": 1 } }],
          "strokes": [], "effects": [],
          "opacity": 1, "visible": true,
          "characters": "Supporting text goes here",
          "style": {
            "fontFamily": "Inter", "fontSize": 18, "fontWeight": 400,
            "textAlignHorizontal": "LEFT", "textAlignVertical": "TOP",
            "lineHeightPx": 28, "letterSpacing": 0
          }
        },
        {
          "id": "cta",
          "type": "FRAME",
          "name": "CTA",
          "x": 0, "y": 0, "width": 180, "height": 48,
          "fills": [{ "type": "SOLID", "color": { "r": 0.42, "g": 0.36, "b": 0.9, "a": 1 } }],
          "strokes": [], "effects": [],
          "cornerRadius": 8, "opacity": 1, "visible": true,
          "clipsContent": false,
          "layoutMode": "HORIZONTAL",
          "primaryAxisAlignItems": "CENTER",
          "counterAxisAlignItems": "CENTER",
          "primaryAxisSizingMode": "HUG",
          "counterAxisSizingMode": "HUG",
          "paddingLeft": 24, "paddingRight": 24, "paddingTop": 12, "paddingBottom": 12,
          "itemSpacing": 0,
          "children": [
            {
              "id": "cta-text",
              "type": "TEXT",
              "name": "CTAText",
              "x": 0, "y": 0, "width": 130, "height": 24,
              "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1, "a": 1 } }],
              "strokes": [], "effects": [],
              "opacity": 1, "visible": true,
              "characters": "Learn More",
              "style": {
                "fontFamily": "Inter", "fontSize": 16, "fontWeight": 600,
                "textAlignHorizontal": "CENTER", "textAlignVertical": "CENTER",
                "lineHeightPx": 24, "letterSpacing": 0
              }
            }
          ]
        }
      ]
    },
    {
      "id": "hero-image",
      "type": "IMAGE",
      "name": "HeroImage",
      "x": 0, "y": 0, "width": 500, "height": 500,
      "fills": [], "strokes": [], "effects": [],
      "opacity": 1, "visible": true,
      "source": "",
      "fit": "cover"
    }
  ]
}
```

- [ ] **Step 6: Create announcement template**

```json
// src/templates/announcement.json
{
  "id": "root",
  "type": "FRAME",
  "name": "Banner",
  "x": 0, "y": 0, "width": 1200, "height": 675,
  "fills": [{ "type": "GRADIENT_LINEAR", "stops": [
    { "position": 0, "color": { "r": 0.15, "g": 0.1, "b": 0.35, "a": 1 } },
    { "position": 1, "color": { "r": 0.05, "g": 0.05, "b": 0.15, "a": 1 } }
  ] }],
  "strokes": [], "effects": [],
  "cornerRadius": 0, "opacity": 1, "visible": true,
  "clipsContent": true,
  "layoutMode": "VERTICAL",
  "primaryAxisAlignItems": "CENTER",
  "counterAxisAlignItems": "CENTER",
  "primaryAxisSizingMode": "FIXED",
  "counterAxisSizingMode": "FIXED",
  "paddingLeft": 80, "paddingRight": 80, "paddingTop": 60, "paddingBottom": 60,
  "itemSpacing": 24,
  "children": [
    {
      "id": "logo",
      "type": "IMAGE",
      "name": "Logo",
      "x": 0, "y": 0, "width": 120, "height": 120,
      "fills": [], "strokes": [], "effects": [],
      "opacity": 1, "visible": true,
      "source": "",
      "fit": "contain"
    },
    {
      "id": "headline",
      "type": "TEXT",
      "name": "Headline",
      "x": 0, "y": 0, "width": 800, "height": 70,
      "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1, "a": 1 } }],
      "strokes": [], "effects": [],
      "opacity": 1, "visible": true,
      "characters": "Announcement Headline",
      "style": {
        "fontFamily": "Inter", "fontSize": 56, "fontWeight": 700,
        "textAlignHorizontal": "CENTER", "textAlignVertical": "TOP",
        "lineHeightPx": 68, "letterSpacing": -1
      }
    },
    {
      "id": "subtext",
      "type": "TEXT",
      "name": "Subtext",
      "x": 0, "y": 0, "width": 600, "height": 32,
      "fills": [{ "type": "SOLID", "color": { "r": 0.7, "g": 0.7, "b": 0.8, "a": 1 } }],
      "strokes": [], "effects": [],
      "opacity": 1, "visible": true,
      "characters": "Supporting details here",
      "style": {
        "fontFamily": "Inter", "fontSize": 20, "fontWeight": 400,
        "textAlignHorizontal": "CENTER", "textAlignVertical": "TOP",
        "lineHeightPx": 30, "letterSpacing": 0
      }
    },
    {
      "id": "date",
      "type": "TEXT",
      "name": "Date",
      "x": 0, "y": 0, "width": 300, "height": 24,
      "fills": [{ "type": "SOLID", "color": { "r": 0.5, "g": 0.5, "b": 0.6, "a": 1 } }],
      "strokes": [], "effects": [],
      "opacity": 1, "visible": true,
      "characters": "April 2026",
      "style": {
        "fontFamily": "Inter", "fontSize": 16, "fontWeight": 500,
        "textAlignHorizontal": "CENTER", "textAlignVertical": "TOP",
        "lineHeightPx": 24, "letterSpacing": 1
      }
    }
  ]
}
```

- [ ] **Step 7: Create minimal template**

```json
// src/templates/minimal.json
{
  "id": "root",
  "type": "FRAME",
  "name": "Banner",
  "x": 0, "y": 0, "width": 1200, "height": 675,
  "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1, "a": 1 } }],
  "strokes": [], "effects": [],
  "cornerRadius": 0, "opacity": 1, "visible": true,
  "clipsContent": true,
  "layoutMode": "HORIZONTAL",
  "primaryAxisAlignItems": "SPACE_BETWEEN",
  "counterAxisAlignItems": "CENTER",
  "primaryAxisSizingMode": "FIXED",
  "counterAxisSizingMode": "FIXED",
  "paddingLeft": 60, "paddingRight": 60, "paddingTop": 48, "paddingBottom": 48,
  "itemSpacing": 40,
  "children": [
    {
      "id": "left-group",
      "type": "FRAME",
      "name": "LeftGroup",
      "x": 0, "y": 0, "width": 500, "height": 300,
      "fills": [], "strokes": [], "effects": [],
      "cornerRadius": 0, "opacity": 1, "visible": true,
      "clipsContent": false,
      "layoutMode": "VERTICAL",
      "primaryAxisAlignItems": "MIN",
      "counterAxisAlignItems": "MIN",
      "primaryAxisSizingMode": "FIXED",
      "counterAxisSizingMode": "FIXED",
      "paddingLeft": 0, "paddingRight": 0, "paddingTop": 0, "paddingBottom": 0,
      "itemSpacing": 20,
      "children": [
        {
          "id": "logo",
          "type": "IMAGE",
          "name": "Logo",
          "x": 0, "y": 0, "width": 48, "height": 48,
          "fills": [], "strokes": [], "effects": [],
          "opacity": 1, "visible": true,
          "source": "",
          "fit": "contain"
        },
        {
          "id": "headline",
          "type": "TEXT",
          "name": "Headline",
          "x": 0, "y": 0, "width": 500, "height": 60,
          "fills": [{ "type": "SOLID", "color": { "r": 0.1, "g": 0.1, "b": 0.12, "a": 1 } }],
          "strokes": [], "effects": [],
          "opacity": 1, "visible": true,
          "characters": "Your Headline Here",
          "style": {
            "fontFamily": "Inter", "fontSize": 40, "fontWeight": 700,
            "textAlignHorizontal": "LEFT", "textAlignVertical": "TOP",
            "lineHeightPx": 48, "letterSpacing": -0.5
          }
        },
        {
          "id": "cta",
          "type": "FRAME",
          "name": "CTA",
          "x": 0, "y": 0, "width": 160, "height": 44,
          "fills": [{ "type": "SOLID", "color": { "r": 0.1, "g": 0.1, "b": 0.12, "a": 1 } }],
          "strokes": [], "effects": [],
          "cornerRadius": 6, "opacity": 1, "visible": true,
          "clipsContent": false,
          "layoutMode": "HORIZONTAL",
          "primaryAxisAlignItems": "CENTER",
          "counterAxisAlignItems": "CENTER",
          "primaryAxisSizingMode": "HUG",
          "counterAxisSizingMode": "HUG",
          "paddingLeft": 20, "paddingRight": 20, "paddingTop": 10, "paddingBottom": 10,
          "itemSpacing": 0,
          "children": [
            {
              "id": "cta-text",
              "type": "TEXT",
              "name": "CTAText",
              "x": 0, "y": 0, "width": 120, "height": 24,
              "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1, "a": 1 } }],
              "strokes": [], "effects": [],
              "opacity": 1, "visible": true,
              "characters": "Get Started",
              "style": {
                "fontFamily": "Inter", "fontSize": 14, "fontWeight": 600,
                "textAlignHorizontal": "CENTER", "textAlignVertical": "CENTER",
                "lineHeightPx": 20, "letterSpacing": 0
              }
            }
          ]
        }
      ]
    },
    {
      "id": "accent-illustration",
      "type": "IMAGE",
      "name": "AccentIllustration",
      "x": 0, "y": 0, "width": 400, "height": 400,
      "fills": [], "strokes": [], "effects": [],
      "opacity": 1, "visible": true,
      "source": "",
      "fit": "contain"
    }
  ]
}
```

- [ ] **Step 8: Create template loader**

```typescript
// src/templates/index.ts
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
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx vitest run tests/templates/templates.test.ts`
Expected: PASS — all 9 tests pass

- [ ] **Step 10: Run full test suite**

Run: `npx vitest run`
Expected: PASS — all tests across all files pass

- [ ] **Step 11: Commit**

```bash
git add src/templates/ tests/templates/
git commit -m "feat: add 4 template archetypes (hero-device, split, announcement, minimal)"
```
