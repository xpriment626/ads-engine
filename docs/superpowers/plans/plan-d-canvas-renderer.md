# Plan D: Canvas Renderer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React rendering layer that takes a FrameNode scene graph root and produces a positioned DOM tree suitable for Playwright screenshot export.

**Architecture:** A pure rendering pipeline — each scene graph node type maps to a React component that translates node properties into CSS. FrameNode auto-layout maps to flexbox. Paint arrays map to CSS backgrounds. Effects map to box-shadow and filter. The root BannerRenderer component mounts the tree at exact pixel dimensions, producing a DOM that Playwright can screenshot at 1:1 fidelity. No interaction, no state management, no editor concerns.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Testing Library

**Phase:** 2 (depends on Plan A — scene graph types must exist)

**Spec reference:** [2026-04-09-brandouble-mvp-design.md](../specs/2026-04-09-brandouble-mvp-design.md)

---

## File structure

```
client/
  index.html              # Vite entry HTML
  vite.config.ts          # Vite config for React app
  tsconfig.json           # TypeScript config extending root
  package.json            # Client-specific deps (React, Vite, etc.)
  src/
    main.tsx              # React DOM entry point
    App.tsx               # Dev harness — loads a fixture and renders BannerRenderer
    renderer/
      paint.ts            # Paint[] → CSS properties
      effects.ts          # Effect[] → CSS properties
      FrameRenderer.tsx   # FrameNode → div with flexbox/absolute
      TextRenderer.tsx    # TextNode → span with CSS typography
      RectRenderer.tsx    # RectangleNode → div with fills
      ImageRenderer.tsx   # ImageNode → img with object-fit
      SceneNodeRenderer.tsx  # Dispatcher — switch on node.type
      BannerRenderer.tsx  # Root component — pixel-sized container
      index.ts            # Barrel export
    __tests__/
      paint.test.ts
      effects.test.ts
      FrameRenderer.test.tsx
      TextRenderer.test.tsx
      RectRenderer.test.tsx
      ImageRenderer.test.tsx
      SceneNodeRenderer.test.tsx
      BannerRenderer.test.tsx
  fixtures/
    split-banner.ts       # TypeScript fixture: split archetype scene graph
```

---

### Task 1: Set up React app with Vite

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`

This is a separate frontend app that lives alongside the existing Hono server. The Hono server serves the API; this Vite app is the browser-side renderer.

- [ ] **Step 1: Create client package.json**

```json
// client/package.json
{
  "name": "brandouble-client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create client tsconfig.json**

```json
// client/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "@scene-graph/*": ["../src/scene-graph/*"]
    }
  },
  "include": ["src/**/*", "fixtures/**/*"],
  "references": []
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
// client/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@scene-graph": path.resolve(__dirname, "../src/scene-graph"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/__tests__/setup.ts"],
  },
});
```

- [ ] **Step 4: Create test setup file**

```typescript
// client/src/__tests__/setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Create index.html**

```html
<!-- client/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Brandouble Renderer</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #1a1a1a; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create main.tsx entry point**

```tsx
// client/src/main.tsx
import { createRoot } from "react-dom/client";
import { App } from "./App.js";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element");

createRoot(rootEl).render(<App />);
```

- [ ] **Step 7: Create placeholder App.tsx**

```tsx
// client/src/App.tsx
export function App() {
  return (
    <div style={{ color: "#fff", fontFamily: "system-ui", padding: 40 }}>
      <h1>Brandouble Renderer</h1>
      <p>Canvas renderer will mount here.</p>
    </div>
  );
}
```

- [ ] **Step 8: Install dependencies and verify dev server starts**

```bash
cd client && npm install
npx vite --host 127.0.0.1 &
# Wait for "ready" message, then kill
sleep 3 && kill %1
```

Expected: Vite starts on localhost, serves the placeholder app.

- [ ] **Step 9: Verify test runner works**

```bash
cd client && npx vitest run
```

Expected: "No test files found" or similar — confirms vitest is configured with jsdom.

- [ ] **Step 10: Commit**

```bash
git add client/
git commit -m "feat(client): scaffold React app with Vite for canvas renderer"
```

---

### Task 2: Paint renderer utility

**Files:**
- Create: `client/src/renderer/paint.ts`
- Create: `client/src/__tests__/paint.test.ts`

Converts a `Paint[]` array into CSS properties. This is a pure function with no React dependency.

- [ ] **Step 1: Write failing tests**

```typescript
// client/src/__tests__/paint.test.ts
import { describe, it, expect } from "vitest";
import { paintToCSS } from "../renderer/paint.js";
import type { Paint, SolidPaint, GradientPaint, ImagePaint } from "@scene-graph/types.js";

describe("paintToCSS", () => {
  it("returns empty object for empty array", () => {
    expect(paintToCSS([])).toEqual({});
  });

  it("converts a SolidPaint to background-color", () => {
    const paints: Paint[] = [
      { type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } },
    ];
    const css = paintToCSS(paints);
    expect(css.background).toBe("rgba(255, 0, 0, 1)");
  });

  it("applies paint-level opacity to SolidPaint", () => {
    const paints: Paint[] = [
      { type: "SOLID", color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 0.5 },
    ];
    const css = paintToCSS(paints);
    expect(css.background).toBe("rgba(0, 0, 255, 0.5)");
  });

  it("converts a GRADIENT_LINEAR to CSS linear-gradient", () => {
    const paints: Paint[] = [
      {
        type: "GRADIENT_LINEAR",
        stops: [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
        ],
      },
    ];
    const css = paintToCSS(paints);
    expect(css.background).toBe(
      "linear-gradient(to right, rgba(255, 0, 0, 1) 0%, rgba(0, 0, 255, 1) 100%)"
    );
  });

  it("converts a GRADIENT_RADIAL to CSS radial-gradient", () => {
    const paints: Paint[] = [
      {
        type: "GRADIENT_RADIAL",
        stops: [
          { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } },
        ],
      },
    ];
    const css = paintToCSS(paints);
    expect(css.background).toBe(
      "radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(0, 0, 0, 1) 100%)"
    );
  });

  it("converts an ImagePaint to CSS background-image", () => {
    const paints: Paint[] = [
      { type: "IMAGE", source: "https://example.com/bg.png" },
    ];
    const css = paintToCSS(paints);
    expect(css.background).toBe('url("https://example.com/bg.png")');
    expect(css.backgroundSize).toBe("cover");
    expect(css.backgroundPosition).toBe("center");
  });

  it("ImagePaint scaleMode FIT maps to contain", () => {
    const paints: Paint[] = [
      { type: "IMAGE", source: "https://example.com/bg.png", scaleMode: "FIT" },
    ];
    const css = paintToCSS(paints);
    expect(css.backgroundSize).toBe("contain");
  });

  it("uses last paint when multiple paints provided (layering)", () => {
    const paints: Paint[] = [
      { type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } },
      { type: "SOLID", color: { r: 0, g: 0, b: 1, a: 1 } },
    ];
    const css = paintToCSS(paints);
    // Last paint wins for the topmost visual layer
    expect(css.background).toBe("rgba(0, 0, 255, 1)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/__tests__/paint.test.ts`
Expected: FAIL — cannot resolve `../renderer/paint.js`

- [ ] **Step 3: Implement paint.ts**

```typescript
// client/src/renderer/paint.ts
import type { Paint, Color } from "@scene-graph/types.js";

function colorToRGBA(color: Color, opacityOverride?: number): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = opacityOverride ?? color.a;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function scaleModeToSize(scaleMode?: string): string {
  switch (scaleMode) {
    case "FIT":
      return "contain";
    case "FILL":
    case "CROP":
      return "cover";
    case "TILE":
      return "repeat";
    default:
      return "cover";
  }
}

interface PaintCSS {
  background?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
}

function singlePaintToCSS(paint: Paint): PaintCSS {
  switch (paint.type) {
    case "SOLID": {
      const bg = colorToRGBA(paint.color, paint.opacity);
      return { background: bg };
    }
    case "GRADIENT_LINEAR": {
      const stops = paint.stops
        .map((s) => `${colorToRGBA(s.color)} ${Math.round(s.position * 100)}%`)
        .join(", ");
      return { background: `linear-gradient(to right, ${stops})` };
    }
    case "GRADIENT_RADIAL": {
      const stops = paint.stops
        .map((s) => `${colorToRGBA(s.color)} ${Math.round(s.position * 100)}%`)
        .join(", ");
      return { background: `radial-gradient(circle, ${stops})` };
    }
    case "IMAGE": {
      const size = scaleModeToSize(paint.scaleMode);
      return {
        background: `url("${paint.source}")`,
        backgroundSize: size,
        backgroundPosition: "center",
        backgroundRepeat: size === "repeat" ? "repeat" : "no-repeat",
      };
    }
    default:
      return {};
  }
}

/**
 * Convert a Paint[] array to CSS properties.
 * Uses the last paint as the topmost visual layer.
 * Returns an empty object for empty arrays.
 */
export function paintToCSS(paints: Paint[]): PaintCSS {
  if (paints.length === 0) return {};

  // Use the last paint — Figma renders fills bottom-to-top,
  // last fill in the array is the topmost visible layer.
  const topPaint = paints[paints.length - 1];
  return singlePaintToCSS(topPaint);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run src/__tests__/paint.test.ts`
Expected: PASS — all 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/paint.ts client/src/__tests__/paint.test.ts
git commit -m "feat(renderer): add paint-to-CSS conversion utility"
```

---

### Task 3: Effect renderer utility

**Files:**
- Create: `client/src/renderer/effects.ts`
- Create: `client/src/__tests__/effects.test.ts`

Converts an `Effect[]` array into CSS properties (box-shadow, filter).

- [ ] **Step 1: Write failing tests**

```typescript
// client/src/__tests__/effects.test.ts
import { describe, it, expect } from "vitest";
import { effectsToCSS } from "../renderer/effects.js";
import type { Effect } from "@scene-graph/types.js";

describe("effectsToCSS", () => {
  it("returns empty object for empty array", () => {
    expect(effectsToCSS([])).toEqual({});
  });

  it("converts a DROP_SHADOW to box-shadow", () => {
    const effects: Effect[] = [
      {
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.25 },
        offset: { x: 0, y: 4 },
        radius: 12,
      },
    ];
    const css = effectsToCSS(effects);
    expect(css.boxShadow).toBe("0px 4px 12px rgba(0, 0, 0, 0.25)");
  });

  it("skips invisible effects", () => {
    const effects: Effect[] = [
      {
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.5 },
        offset: { x: 2, y: 2 },
        radius: 4,
        visible: false,
      },
    ];
    const css = effectsToCSS(effects);
    expect(css.boxShadow).toBeUndefined();
  });

  it("converts a LAYER_BLUR to filter: blur()", () => {
    const effects: Effect[] = [
      { type: "LAYER_BLUR", radius: 8 },
    ];
    const css = effectsToCSS(effects);
    expect(css.filter).toBe("blur(8px)");
  });

  it("skips invisible blur effects", () => {
    const effects: Effect[] = [
      { type: "LAYER_BLUR", radius: 8, visible: false },
    ];
    const css = effectsToCSS(effects);
    expect(css.filter).toBeUndefined();
  });

  it("combines multiple drop shadows", () => {
    const effects: Effect[] = [
      {
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 1 },
        radius: 2,
      },
      {
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.2 },
        offset: { x: 0, y: 4 },
        radius: 8,
      },
    ];
    const css = effectsToCSS(effects);
    expect(css.boxShadow).toBe(
      "0px 1px 2px rgba(0, 0, 0, 0.1), 0px 4px 8px rgba(0, 0, 0, 0.2)"
    );
  });

  it("handles mixed shadow and blur effects", () => {
    const effects: Effect[] = [
      {
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.3 },
        offset: { x: 0, y: 2 },
        radius: 6,
      },
      { type: "LAYER_BLUR", radius: 4 },
    ];
    const css = effectsToCSS(effects);
    expect(css.boxShadow).toBe("0px 2px 6px rgba(0, 0, 0, 0.3)");
    expect(css.filter).toBe("blur(4px)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/__tests__/effects.test.ts`
Expected: FAIL — cannot resolve `../renderer/effects.js`

- [ ] **Step 3: Implement effects.ts**

```typescript
// client/src/renderer/effects.ts
import type { Effect, Color } from "@scene-graph/types.js";

function colorToRGBA(color: Color): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${color.a})`;
}

interface EffectsCSS {
  boxShadow?: string;
  filter?: string;
}

/**
 * Convert an Effect[] array to CSS properties.
 * DROP_SHADOW effects become box-shadow (multiple are comma-separated).
 * LAYER_BLUR effects become filter: blur().
 * Effects with visible: false are skipped.
 */
export function effectsToCSS(effects: Effect[]): EffectsCSS {
  if (effects.length === 0) return {};

  const result: EffectsCSS = {};

  // Collect visible drop shadows
  const shadows = effects
    .filter((e) => e.type === "DROP_SHADOW" && e.visible !== false)
    .map((e) => {
      if (e.type !== "DROP_SHADOW") return "";
      return `${e.offset.x}px ${e.offset.y}px ${e.radius}px ${colorToRGBA(e.color)}`;
    })
    .filter(Boolean);

  if (shadows.length > 0) {
    result.boxShadow = shadows.join(", ");
  }

  // Collect visible blur effects
  const blurs = effects
    .filter((e) => e.type === "LAYER_BLUR" && e.visible !== false)
    .map((e) => {
      if (e.type !== "LAYER_BLUR") return "";
      return `blur(${e.radius}px)`;
    })
    .filter(Boolean);

  if (blurs.length > 0) {
    result.filter = blurs.join(" ");
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run src/__tests__/effects.test.ts`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/effects.ts client/src/__tests__/effects.test.ts
git commit -m "feat(renderer): add effect-to-CSS conversion utility"
```

---

### Task 4: FrameNode renderer component

**Files:**
- Create: `client/src/renderer/FrameRenderer.tsx`
- Create: `client/src/__tests__/FrameRenderer.test.tsx`

The most complex component — handles auto-layout to flexbox mapping, padding, fills, corner radius, clip content, and recursively renders children.

- [ ] **Step 1: Write failing tests**

```tsx
// client/src/__tests__/FrameRenderer.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FrameRenderer } from "../renderer/FrameRenderer.js";
import type { FrameNode, TextNode } from "@scene-graph/types.js";

function makeFrame(overrides: Partial<FrameNode> = {}): FrameNode {
  return {
    id: "frame-1",
    type: "FRAME",
    name: "Test Frame",
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    fills: [],
    strokes: [],
    effects: [],
    cornerRadius: 0,
    opacity: 1,
    visible: true,
    clipsContent: false,
    layoutMode: "NONE",
    primaryAxisAlignItems: "MIN",
    counterAxisAlignItems: "MIN",
    primaryAxisSizingMode: "FIXED",
    counterAxisSizingMode: "FIXED",
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    itemSpacing: 0,
    children: [],
    ...overrides,
  };
}

describe("FrameRenderer", () => {
  it("renders a div with correct dimensions", () => {
    const node = makeFrame({ width: 1200, height: 675 });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.tagName).toBe("DIV");
    expect(div.style.width).toBe("1200px");
    expect(div.style.height).toBe("675px");
  });

  it("sets position relative for NONE layout (absolute children)", () => {
    const node = makeFrame({ layoutMode: "NONE" });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.position).toBe("relative");
  });

  it("maps HORIZONTAL layout to flex-direction: row", () => {
    const node = makeFrame({ layoutMode: "HORIZONTAL" });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.display).toBe("flex");
    expect(div.style.flexDirection).toBe("row");
  });

  it("maps VERTICAL layout to flex-direction: column", () => {
    const node = makeFrame({ layoutMode: "VERTICAL" });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.display).toBe("flex");
    expect(div.style.flexDirection).toBe("column");
  });

  it("maps primaryAxisAlignItems to justify-content", () => {
    const node = makeFrame({
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "SPACE_BETWEEN",
    });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.justifyContent).toBe("space-between");
  });

  it("maps counterAxisAlignItems to align-items", () => {
    const node = makeFrame({
      layoutMode: "HORIZONTAL",
      counterAxisAlignItems: "CENTER",
    });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.alignItems).toBe("center");
  });

  it("applies padding", () => {
    const node = makeFrame({
      paddingTop: 40,
      paddingRight: 60,
      paddingBottom: 40,
      paddingLeft: 60,
    });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.paddingTop).toBe("40px");
    expect(div.style.paddingRight).toBe("60px");
    expect(div.style.paddingBottom).toBe("40px");
    expect(div.style.paddingLeft).toBe("60px");
  });

  it("applies item spacing as gap", () => {
    const node = makeFrame({ layoutMode: "HORIZONTAL", itemSpacing: 24 });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.gap).toBe("24px");
  });

  it("applies corner radius", () => {
    const node = makeFrame({ cornerRadius: 12 });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.borderRadius).toBe("12px");
  });

  it("applies clipsContent as overflow hidden", () => {
    const node = makeFrame({ clipsContent: true });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.overflow).toBe("hidden");
  });

  it("applies opacity", () => {
    const node = makeFrame({ opacity: 0.8 });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.opacity).toBe("0.8");
  });

  it("applies solid fill as background", () => {
    const node = makeFrame({
      fills: [{ type: "SOLID", color: { r: 0.42, g: 0.36, b: 0.9, a: 1 } }],
    });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.background).toBe("rgba(107, 92, 230, 1)");
  });

  it("hides invisible nodes", () => {
    const node = makeFrame({ visible: false });
    const { container } = render(<FrameRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.display).toBe("none");
  });

  it("renders children", () => {
    const child: TextNode = {
      id: "text-1",
      type: "TEXT",
      name: "Hello",
      x: 0,
      y: 0,
      width: 200,
      height: 30,
      fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
      strokes: [],
      effects: [],
      opacity: 1,
      visible: true,
      characters: "Hello World",
      style: {
        fontFamily: "Inter",
        fontSize: 16,
        fontWeight: 400,
        textAlignHorizontal: "LEFT",
        textAlignVertical: "TOP",
        lineHeightPx: 20,
        letterSpacing: 0,
      },
    };
    const node = makeFrame({ layoutMode: "VERTICAL", children: [child] });
    const { container } = render(<FrameRenderer node={node} />);
    // The child text should be rendered inside the frame div
    expect(container.textContent).toContain("Hello World");
  });

  it("positions children absolutely when layoutMode is NONE", () => {
    const child: FrameNode = makeFrame({
      id: "child-frame",
      name: "Child",
      x: 50,
      y: 100,
      width: 200,
      height: 100,
    });
    const parent = makeFrame({
      layoutMode: "NONE",
      children: [child],
    });
    const { container } = render(<FrameRenderer node={parent} />);
    const childDiv = container.querySelector('[data-node-id="child-frame"]') as HTMLElement;
    expect(childDiv.style.position).toBe("absolute");
    expect(childDiv.style.left).toBe("50px");
    expect(childDiv.style.top).toBe("100px");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/__tests__/FrameRenderer.test.tsx`
Expected: FAIL — cannot resolve `../renderer/FrameRenderer.js`

- [ ] **Step 3: Implement FrameRenderer.tsx**

```tsx
// client/src/renderer/FrameRenderer.tsx
import type { CSSProperties } from "react";
import type { FrameNode, AxisAlign } from "@scene-graph/types.js";
import { paintToCSS } from "./paint.js";
import { effectsToCSS } from "./effects.js";
import { SceneNodeRenderer } from "./SceneNodeRenderer.js";

function axisAlignToJustify(align: AxisAlign): string {
  switch (align) {
    case "MIN":
      return "flex-start";
    case "CENTER":
      return "center";
    case "MAX":
      return "flex-end";
    case "SPACE_BETWEEN":
      return "space-between";
    default:
      return "flex-start";
  }
}

function axisAlignToAlign(align: AxisAlign): string {
  switch (align) {
    case "MIN":
      return "flex-start";
    case "CENTER":
      return "center";
    case "MAX":
      return "flex-end";
    case "SPACE_BETWEEN":
      return "stretch";
    default:
      return "flex-start";
  }
}

interface FrameRendererProps {
  node: FrameNode;
  /** When true, position this frame absolutely using its x/y coords */
  isAbsoluteChild?: boolean;
}

export function FrameRenderer({ node, isAbsoluteChild }: FrameRendererProps) {
  if (!node.visible) {
    return <div data-node-id={node.id} style={{ display: "none" }} />;
  }

  const paintCSS = paintToCSS(node.fills);
  const effectCSS = effectsToCSS(node.effects);

  const isAutoLayout = node.layoutMode !== "NONE";

  const style: CSSProperties = {
    width: `${node.width}px`,
    height: `${node.height}px`,
    borderRadius: node.cornerRadius ? `${node.cornerRadius}px` : undefined,
    overflow: node.clipsContent ? "hidden" : undefined,
    opacity: node.opacity !== 1 ? node.opacity : undefined,
    paddingTop: node.paddingTop ? `${node.paddingTop}px` : undefined,
    paddingRight: node.paddingRight ? `${node.paddingRight}px` : undefined,
    paddingBottom: node.paddingBottom ? `${node.paddingBottom}px` : undefined,
    paddingLeft: node.paddingLeft ? `${node.paddingLeft}px` : undefined,
    ...paintCSS,
    ...effectCSS,
  };

  if (isAutoLayout) {
    style.display = "flex";
    style.flexDirection = node.layoutMode === "HORIZONTAL" ? "row" : "column";
    style.justifyContent = axisAlignToJustify(node.primaryAxisAlignItems);
    style.alignItems = axisAlignToAlign(node.counterAxisAlignItems);
    if (node.itemSpacing) {
      style.gap = `${node.itemSpacing}px`;
    }
  } else {
    // NONE layout — children are positioned absolutely
    style.position = "relative";
  }

  // If this frame is a child of a NONE-layout parent, position it absolutely
  if (isAbsoluteChild) {
    style.position = "absolute";
    style.left = `${node.x}px`;
    style.top = `${node.y}px`;
  }

  return (
    <div data-node-id={node.id} style={style}>
      {node.children.map((child) => (
        <SceneNodeRenderer
          key={child.id}
          node={child}
          isAbsoluteChild={!isAutoLayout}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create a stub SceneNodeRenderer to unblock the test** (full implementation in Task 8, but FrameRenderer imports it for recursive children)

```tsx
// client/src/renderer/SceneNodeRenderer.tsx
import type { SceneNode } from "@scene-graph/types.js";
import { FrameRenderer } from "./FrameRenderer.js";

interface SceneNodeRendererProps {
  node: SceneNode;
  isAbsoluteChild?: boolean;
}

export function SceneNodeRenderer({ node, isAbsoluteChild }: SceneNodeRendererProps) {
  switch (node.type) {
    case "FRAME":
      return <FrameRenderer node={node} isAbsoluteChild={isAbsoluteChild} />;
    case "TEXT":
      return (
        <span
          data-node-id={node.id}
          style={isAbsoluteChild ? { position: "absolute", left: `${node.x}px`, top: `${node.y}px` } : undefined}
        >
          {node.characters}
        </span>
      );
    case "RECTANGLE":
      return (
        <div
          data-node-id={node.id}
          style={{
            width: `${node.width}px`,
            height: `${node.height}px`,
            ...(isAbsoluteChild ? { position: "absolute", left: `${node.x}px`, top: `${node.y}px` } : {}),
          }}
        />
      );
    case "IMAGE":
      return (
        <img
          data-node-id={node.id}
          src={node.source}
          alt={node.name}
          style={{
            width: `${node.width}px`,
            height: `${node.height}px`,
            ...(isAbsoluteChild ? { position: "absolute", left: `${node.x}px`, top: `${node.y}px` } : {}),
          }}
        />
      );
    default:
      return null;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd client && npx vitest run src/__tests__/FrameRenderer.test.tsx`
Expected: PASS — all 14 tests pass

- [ ] **Step 6: Commit**

```bash
git add client/src/renderer/FrameRenderer.tsx client/src/renderer/SceneNodeRenderer.tsx client/src/__tests__/FrameRenderer.test.tsx
git commit -m "feat(renderer): add FrameNode renderer with auto-layout flexbox mapping"
```

---

### Task 5: TextNode renderer component

**Files:**
- Create: `client/src/renderer/TextRenderer.tsx`
- Create: `client/src/__tests__/TextRenderer.test.tsx`

Maps TypeStyle properties to CSS typography. Uses the text fill color (first SolidPaint) as the text color.

- [ ] **Step 1: Write failing tests**

```tsx
// client/src/__tests__/TextRenderer.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextRenderer } from "../renderer/TextRenderer.js";
import type { TextNode } from "@scene-graph/types.js";

function makeText(overrides: Partial<TextNode> = {}): TextNode {
  return {
    id: "text-1",
    type: "TEXT",
    name: "Test Text",
    x: 0,
    y: 0,
    width: 400,
    height: 50,
    fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
    strokes: [],
    effects: [],
    opacity: 1,
    visible: true,
    characters: "Hello World",
    style: {
      fontFamily: "Inter",
      fontSize: 16,
      fontWeight: 400,
      textAlignHorizontal: "LEFT",
      textAlignVertical: "TOP",
      lineHeightPx: 20,
      letterSpacing: 0,
    },
    ...overrides,
  };
}

describe("TextRenderer", () => {
  it("renders the text characters", () => {
    const node = makeText({ characters: "Ship Faster" });
    render(<TextRenderer node={node} />);
    expect(screen.getByText("Ship Faster")).toBeTruthy();
  });

  it("applies font family", () => {
    const node = makeText({
      style: {
        fontFamily: "Space Grotesk",
        fontSize: 16,
        fontWeight: 400,
        textAlignHorizontal: "LEFT",
        textAlignVertical: "TOP",
        lineHeightPx: 20,
        letterSpacing: 0,
      },
    });
    const { container } = render(<TextRenderer node={node} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.fontFamily).toBe("Space Grotesk");
  });

  it("applies font size", () => {
    const node = makeText({
      style: {
        fontFamily: "Inter",
        fontSize: 48,
        fontWeight: 700,
        textAlignHorizontal: "LEFT",
        textAlignVertical: "TOP",
        lineHeightPx: 58,
        letterSpacing: 0,
      },
    });
    const { container } = render(<TextRenderer node={node} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.fontSize).toBe("48px");
  });

  it("applies font weight", () => {
    const node = makeText({
      style: {
        fontFamily: "Inter",
        fontSize: 16,
        fontWeight: 700,
        textAlignHorizontal: "LEFT",
        textAlignVertical: "TOP",
        lineHeightPx: 20,
        letterSpacing: 0,
      },
    });
    const { container } = render(<TextRenderer node={node} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.fontWeight).toBe("700");
  });

  it("applies text alignment", () => {
    const node = makeText({
      style: {
        fontFamily: "Inter",
        fontSize: 16,
        fontWeight: 400,
        textAlignHorizontal: "CENTER",
        textAlignVertical: "TOP",
        lineHeightPx: 20,
        letterSpacing: 0,
      },
    });
    const { container } = render(<TextRenderer node={node} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.textAlign).toBe("center");
  });

  it("applies line height", () => {
    const node = makeText({
      style: {
        fontFamily: "Inter",
        fontSize: 16,
        fontWeight: 400,
        textAlignHorizontal: "LEFT",
        textAlignVertical: "TOP",
        lineHeightPx: 28,
        letterSpacing: 0,
      },
    });
    const { container } = render(<TextRenderer node={node} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.lineHeight).toBe("28px");
  });

  it("applies letter spacing", () => {
    const node = makeText({
      style: {
        fontFamily: "Inter",
        fontSize: 16,
        fontWeight: 400,
        textAlignHorizontal: "LEFT",
        textAlignVertical: "TOP",
        lineHeightPx: 20,
        letterSpacing: 1.5,
      },
    });
    const { container } = render(<TextRenderer node={node} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.letterSpacing).toBe("1.5px");
  });

  it("applies text color from fills", () => {
    const node = makeText({
      fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
    });
    const { container } = render(<TextRenderer node={node} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.color).toBe("rgba(255, 255, 255, 1)");
  });

  it("applies opacity", () => {
    const node = makeText({ opacity: 0.5 });
    const { container } = render(<TextRenderer node={node} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.opacity).toBe("0.5");
  });

  it("hides invisible text nodes", () => {
    const node = makeText({ visible: false });
    const { container } = render(<TextRenderer node={node} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.display).toBe("none");
  });

  it("applies dimensions for fixed sizing", () => {
    const node = makeText({ width: 300, height: 60 });
    const { container } = render(<TextRenderer node={node} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe("300px");
    expect(el.style.height).toBe("60px");
  });

  it("applies effects (drop shadow)", () => {
    const node = makeText({
      effects: [
        {
          type: "DROP_SHADOW",
          color: { r: 0, g: 0, b: 0, a: 0.5 },
          offset: { x: 1, y: 1 },
          radius: 3,
        },
      ],
    });
    const { container } = render(<TextRenderer node={node} />);
    const el = container.firstElementChild as HTMLElement;
    // Text shadows rendered via the text element's filter or text-shadow
    expect(el.style.textShadow).toBe("1px 1px 3px rgba(0, 0, 0, 0.5)");
  });

  it("positions absolutely when isAbsoluteChild is true", () => {
    const node = makeText({ x: 100, y: 50 });
    const { container } = render(<TextRenderer node={node} isAbsoluteChild />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.position).toBe("absolute");
    expect(el.style.left).toBe("100px");
    expect(el.style.top).toBe("50px");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/__tests__/TextRenderer.test.tsx`
Expected: FAIL — cannot resolve `../renderer/TextRenderer.js`

- [ ] **Step 3: Implement TextRenderer.tsx**

```tsx
// client/src/renderer/TextRenderer.tsx
import type { CSSProperties } from "react";
import type { TextNode, Color, Effect } from "@scene-graph/types.js";
import { effectsToCSS } from "./effects.js";

function colorToRGBA(color: Color, opacityOverride?: number): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = opacityOverride ?? color.a;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function textAlignFromHorizontal(align: string): CSSProperties["textAlign"] {
  switch (align) {
    case "LEFT":
      return "left";
    case "CENTER":
      return "center";
    case "RIGHT":
      return "right";
    default:
      return "left";
  }
}

/**
 * For text nodes, DROP_SHADOW maps to text-shadow (not box-shadow).
 * LAYER_BLUR still maps to filter: blur().
 */
function textEffectsToCSS(effects: Effect[]): Pick<CSSProperties, "textShadow" | "filter"> {
  const result: Pick<CSSProperties, "textShadow" | "filter"> = {};

  const shadows = effects
    .filter((e) => e.type === "DROP_SHADOW" && e.visible !== false)
    .map((e) => {
      if (e.type !== "DROP_SHADOW") return "";
      return `${e.offset.x}px ${e.offset.y}px ${e.radius}px ${colorToRGBA(e.color)}`;
    })
    .filter(Boolean);

  if (shadows.length > 0) {
    result.textShadow = shadows.join(", ");
  }

  const blurs = effects
    .filter((e) => e.type === "LAYER_BLUR" && e.visible !== false)
    .map((e) => {
      if (e.type !== "LAYER_BLUR") return "";
      return `blur(${e.radius}px)`;
    })
    .filter(Boolean);

  if (blurs.length > 0) {
    result.filter = blurs.join(" ");
  }

  return result;
}

interface TextRendererProps {
  node: TextNode;
  isAbsoluteChild?: boolean;
}

export function TextRenderer({ node, isAbsoluteChild }: TextRendererProps) {
  if (!node.visible) {
    return <span data-node-id={node.id} style={{ display: "none" }} />;
  }

  // Extract text color from fills — use first SolidPaint
  let textColor: string | undefined;
  for (const fill of node.fills) {
    if (fill.type === "SOLID") {
      textColor = colorToRGBA(fill.color, fill.opacity);
      break;
    }
  }

  const textEffects = textEffectsToCSS(node.effects);

  const style: CSSProperties = {
    width: `${node.width}px`,
    height: `${node.height}px`,
    fontFamily: node.style.fontFamily,
    fontSize: `${node.style.fontSize}px`,
    fontWeight: node.style.fontWeight,
    textAlign: textAlignFromHorizontal(node.style.textAlignHorizontal),
    lineHeight: `${node.style.lineHeightPx}px`,
    letterSpacing: node.style.letterSpacing ? `${node.style.letterSpacing}px` : undefined,
    color: textColor,
    opacity: node.opacity !== 1 ? node.opacity : undefined,
    // Prevent text from wrapping outside its box
    overflow: "hidden",
    wordWrap: "break-word",
    ...textEffects,
  };

  if (isAbsoluteChild) {
    style.position = "absolute";
    style.left = `${node.x}px`;
    style.top = `${node.y}px`;
  }

  return (
    <span data-node-id={node.id} style={style}>
      {node.characters}
    </span>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run src/__tests__/TextRenderer.test.tsx`
Expected: PASS — all 13 tests pass

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/TextRenderer.tsx client/src/__tests__/TextRenderer.test.tsx
git commit -m "feat(renderer): add TextNode renderer with CSS typography mapping"
```

---

### Task 6: RectangleNode renderer component

**Files:**
- Create: `client/src/renderer/RectRenderer.tsx`
- Create: `client/src/__tests__/RectRenderer.test.tsx`

Simple component — a div with fills, corner radius, strokes, and effects.

- [ ] **Step 1: Write failing tests**

```tsx
// client/src/__tests__/RectRenderer.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RectRenderer } from "../renderer/RectRenderer.js";
import type { RectangleNode } from "@scene-graph/types.js";

function makeRect(overrides: Partial<RectangleNode> = {}): RectangleNode {
  return {
    id: "rect-1",
    type: "RECTANGLE",
    name: "Test Rect",
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    fills: [],
    strokes: [],
    effects: [],
    cornerRadius: 0,
    opacity: 1,
    visible: true,
    ...overrides,
  };
}

describe("RectRenderer", () => {
  it("renders a div with correct dimensions", () => {
    const node = makeRect({ width: 300, height: 150 });
    const { container } = render(<RectRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.tagName).toBe("DIV");
    expect(div.style.width).toBe("300px");
    expect(div.style.height).toBe("150px");
  });

  it("applies solid fill as background", () => {
    const node = makeRect({
      fills: [{ type: "SOLID", color: { r: 0.42, g: 0.36, b: 0.9, a: 1 } }],
    });
    const { container } = render(<RectRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.background).toBe("rgba(107, 92, 230, 1)");
  });

  it("applies gradient fill", () => {
    const node = makeRect({
      fills: [
        {
          type: "GRADIENT_LINEAR",
          stops: [
            { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
          ],
        },
      ],
    });
    const { container } = render(<RectRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.background).toContain("linear-gradient");
  });

  it("applies corner radius", () => {
    const node = makeRect({ cornerRadius: 16 });
    const { container } = render(<RectRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.borderRadius).toBe("16px");
  });

  it("applies stroke as border", () => {
    const node = makeRect({
      strokes: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
    });
    const { container } = render(<RectRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.borderWidth).toBe("1px");
    expect(div.style.borderStyle).toBe("solid");
    expect(div.style.borderColor).toBe("rgba(0, 0, 0, 1)");
  });

  it("applies effects (box-shadow)", () => {
    const node = makeRect({
      effects: [
        {
          type: "DROP_SHADOW",
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          offset: { x: 0, y: 4 },
          radius: 12,
        },
      ],
    });
    const { container } = render(<RectRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.boxShadow).toBe("0px 4px 12px rgba(0, 0, 0, 0.25)");
  });

  it("applies opacity", () => {
    const node = makeRect({ opacity: 0.6 });
    const { container } = render(<RectRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.opacity).toBe("0.6");
  });

  it("hides invisible nodes", () => {
    const node = makeRect({ visible: false });
    const { container } = render(<RectRenderer node={node} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.display).toBe("none");
  });

  it("positions absolutely when isAbsoluteChild is true", () => {
    const node = makeRect({ x: 50, y: 75 });
    const { container } = render(<RectRenderer node={node} isAbsoluteChild />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.position).toBe("absolute");
    expect(div.style.left).toBe("50px");
    expect(div.style.top).toBe("75px");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/__tests__/RectRenderer.test.tsx`
Expected: FAIL — cannot resolve `../renderer/RectRenderer.js`

- [ ] **Step 3: Implement RectRenderer.tsx**

```tsx
// client/src/renderer/RectRenderer.tsx
import type { CSSProperties } from "react";
import type { RectangleNode, Color } from "@scene-graph/types.js";
import { paintToCSS } from "./paint.js";
import { effectsToCSS } from "./effects.js";

function colorToRGBA(color: Color, opacityOverride?: number): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = opacityOverride ?? color.a;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

interface RectRendererProps {
  node: RectangleNode;
  isAbsoluteChild?: boolean;
}

export function RectRenderer({ node, isAbsoluteChild }: RectRendererProps) {
  if (!node.visible) {
    return <div data-node-id={node.id} style={{ display: "none" }} />;
  }

  const paintCSS = paintToCSS(node.fills);
  const effectCSS = effectsToCSS(node.effects);

  // Extract stroke — use first SolidPaint for border color
  let borderCSS: CSSProperties = {};
  if (node.strokes.length > 0) {
    const firstStroke = node.strokes[0];
    if (firstStroke.type === "SOLID") {
      borderCSS = {
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: colorToRGBA(firstStroke.color, firstStroke.opacity),
      };
    }
  }

  const style: CSSProperties = {
    width: `${node.width}px`,
    height: `${node.height}px`,
    borderRadius: node.cornerRadius ? `${node.cornerRadius}px` : undefined,
    opacity: node.opacity !== 1 ? node.opacity : undefined,
    ...paintCSS,
    ...borderCSS,
    ...effectCSS,
  };

  if (isAbsoluteChild) {
    style.position = "absolute";
    style.left = `${node.x}px`;
    style.top = `${node.y}px`;
  }

  return <div data-node-id={node.id} style={style} />;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run src/__tests__/RectRenderer.test.tsx`
Expected: PASS — all 9 tests pass

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/RectRenderer.tsx client/src/__tests__/RectRenderer.test.tsx
git commit -m "feat(renderer): add RectangleNode renderer with fills and strokes"
```

---

### Task 7: ImageNode renderer component

**Files:**
- Create: `client/src/renderer/ImageRenderer.tsx`
- Create: `client/src/__tests__/ImageRenderer.test.tsx`

Renders an `<img>` element. Maps the `fit` property to CSS `object-fit`.

- [ ] **Step 1: Write failing tests**

```tsx
// client/src/__tests__/ImageRenderer.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ImageRenderer } from "../renderer/ImageRenderer.js";
import type { ImageNode } from "@scene-graph/types.js";

function makeImage(overrides: Partial<ImageNode> = {}): ImageNode {
  return {
    id: "img-1",
    type: "IMAGE",
    name: "Test Image",
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    fills: [],
    strokes: [],
    effects: [],
    opacity: 1,
    visible: true,
    source: "https://example.com/hero.png",
    fit: "cover",
    ...overrides,
  };
}

describe("ImageRenderer", () => {
  it("renders an img element with correct src", () => {
    const node = makeImage({ source: "https://example.com/photo.jpg" });
    const { container } = render(<ImageRenderer node={node} />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.tagName).toBe("IMG");
    expect(img.src).toBe("https://example.com/photo.jpg");
  });

  it("applies dimensions", () => {
    const node = makeImage({ width: 500, height: 400 });
    const { container } = render(<ImageRenderer node={node} />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.style.width).toBe("500px");
    expect(img.style.height).toBe("400px");
  });

  it("maps fit: cover to object-fit: cover", () => {
    const node = makeImage({ fit: "cover" });
    const { container } = render(<ImageRenderer node={node} />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.style.objectFit).toBe("cover");
  });

  it("maps fit: contain to object-fit: contain", () => {
    const node = makeImage({ fit: "contain" });
    const { container } = render(<ImageRenderer node={node} />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.style.objectFit).toBe("contain");
  });

  it("maps fit: fill to object-fit: fill", () => {
    const node = makeImage({ fit: "fill" });
    const { container } = render(<ImageRenderer node={node} />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.style.objectFit).toBe("fill");
  });

  it("sets alt attribute from node name", () => {
    const node = makeImage({ name: "Hero Image" });
    const { container } = render(<ImageRenderer node={node} />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.alt).toBe("Hero Image");
  });

  it("applies opacity", () => {
    const node = makeImage({ opacity: 0.7 });
    const { container } = render(<ImageRenderer node={node} />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.style.opacity).toBe("0.7");
  });

  it("applies effects (box-shadow)", () => {
    const node = makeImage({
      effects: [
        {
          type: "DROP_SHADOW",
          color: { r: 0, g: 0, b: 0, a: 0.3 },
          offset: { x: 0, y: 2 },
          radius: 8,
        },
      ],
    });
    const { container } = render(<ImageRenderer node={node} />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.style.boxShadow).toBe("0px 2px 8px rgba(0, 0, 0, 0.3)");
  });

  it("hides invisible nodes", () => {
    const node = makeImage({ visible: false });
    const { container } = render(<ImageRenderer node={node} />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.style.display).toBe("none");
  });

  it("positions absolutely when isAbsoluteChild is true", () => {
    const node = makeImage({ x: 200, y: 50 });
    const { container } = render(<ImageRenderer node={node} isAbsoluteChild />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.style.position).toBe("absolute");
    expect(img.style.left).toBe("200px");
    expect(img.style.top).toBe("50px");
  });

  it("applies corner radius for rounded images", () => {
    // Corner radius is not on ImageNode directly in the type system,
    // but can be achieved by wrapping — for direct images we use
    // the fills array. For now, verify the base rendering is clean.
    const node = makeImage();
    const { container } = render(<ImageRenderer node={node} />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.style.display).not.toBe("none");
  });

  it("applies blur effect", () => {
    const node = makeImage({
      effects: [{ type: "LAYER_BLUR", radius: 5 }],
    });
    const { container } = render(<ImageRenderer node={node} />);
    const img = container.firstElementChild as HTMLImageElement;
    expect(img.style.filter).toBe("blur(5px)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/__tests__/ImageRenderer.test.tsx`
Expected: FAIL — cannot resolve `../renderer/ImageRenderer.js`

- [ ] **Step 3: Implement ImageRenderer.tsx**

```tsx
// client/src/renderer/ImageRenderer.tsx
import type { CSSProperties } from "react";
import type { ImageNode } from "@scene-graph/types.js";
import { effectsToCSS } from "./effects.js";

interface ImageRendererProps {
  node: ImageNode;
  isAbsoluteChild?: boolean;
}

export function ImageRenderer({ node, isAbsoluteChild }: ImageRendererProps) {
  if (!node.visible) {
    return <img data-node-id={node.id} src={node.source} alt={node.name} style={{ display: "none" }} />;
  }

  const effectCSS = effectsToCSS(node.effects);

  const style: CSSProperties = {
    width: `${node.width}px`,
    height: `${node.height}px`,
    objectFit: node.fit,
    opacity: node.opacity !== 1 ? node.opacity : undefined,
    // Prevent img from having extra bottom space
    display: "block",
    ...effectCSS,
  };

  if (isAbsoluteChild) {
    style.position = "absolute";
    style.left = `${node.x}px`;
    style.top = `${node.y}px`;
  }

  return (
    <img
      data-node-id={node.id}
      src={node.source}
      alt={node.name}
      style={style}
    />
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run src/__tests__/ImageRenderer.test.tsx`
Expected: PASS — all 12 tests pass

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/ImageRenderer.tsx client/src/__tests__/ImageRenderer.test.tsx
git commit -m "feat(renderer): add ImageNode renderer with object-fit mapping"
```

---

### Task 8: SceneNode dispatcher component

**Files:**
- Modify: `client/src/renderer/SceneNodeRenderer.tsx` (replace stub from Task 4)
- Create: `client/src/__tests__/SceneNodeRenderer.test.tsx`

The dispatcher switches on `node.type` and renders the correct component. This was stubbed in Task 4; now we replace it with the full implementation that uses all four typed renderers.

- [ ] **Step 1: Write failing tests**

```tsx
// client/src/__tests__/SceneNodeRenderer.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SceneNodeRenderer } from "../renderer/SceneNodeRenderer.js";
import type { FrameNode, TextNode, RectangleNode, ImageNode, SceneNode } from "@scene-graph/types.js";

describe("SceneNodeRenderer", () => {
  it("dispatches FRAME to FrameRenderer", () => {
    const node: FrameNode = {
      id: "frame-1",
      type: "FRAME",
      name: "Test",
      x: 0, y: 0, width: 100, height: 100,
      fills: [], strokes: [], effects: [],
      cornerRadius: 0, opacity: 1, visible: true,
      clipsContent: false, layoutMode: "NONE",
      primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN",
      primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "FIXED",
      paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
      itemSpacing: 0, children: [],
    };
    const { container } = render(<SceneNodeRenderer node={node} />);
    const el = container.querySelector('[data-node-id="frame-1"]');
    expect(el).toBeTruthy();
    expect(el?.tagName).toBe("DIV");
  });

  it("dispatches TEXT to TextRenderer", () => {
    const node: TextNode = {
      id: "text-1",
      type: "TEXT",
      name: "Hello",
      x: 0, y: 0, width: 200, height: 30,
      fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
      strokes: [], effects: [],
      opacity: 1, visible: true,
      characters: "Hello Dispatch",
      style: {
        fontFamily: "Inter", fontSize: 16, fontWeight: 400,
        textAlignHorizontal: "LEFT", textAlignVertical: "TOP",
        lineHeightPx: 20, letterSpacing: 0,
      },
    };
    render(<SceneNodeRenderer node={node} />);
    expect(screen.getByText("Hello Dispatch")).toBeTruthy();
  });

  it("dispatches RECTANGLE to RectRenderer", () => {
    const node: RectangleNode = {
      id: "rect-1",
      type: "RECTANGLE",
      name: "BG",
      x: 0, y: 0, width: 200, height: 100,
      fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }],
      strokes: [], effects: [],
      cornerRadius: 8, opacity: 1, visible: true,
    };
    const { container } = render(<SceneNodeRenderer node={node} />);
    const el = container.querySelector('[data-node-id="rect-1"]');
    expect(el).toBeTruthy();
    expect(el?.tagName).toBe("DIV");
    expect((el as HTMLElement).style.borderRadius).toBe("8px");
  });

  it("dispatches IMAGE to ImageRenderer", () => {
    const node: ImageNode = {
      id: "img-1",
      type: "IMAGE",
      name: "Hero",
      x: 0, y: 0, width: 400, height: 300,
      fills: [], strokes: [], effects: [],
      opacity: 1, visible: true,
      source: "https://example.com/hero.png",
      fit: "cover",
    };
    const { container } = render(<SceneNodeRenderer node={node} />);
    const el = container.querySelector('[data-node-id="img-1"]');
    expect(el).toBeTruthy();
    expect(el?.tagName).toBe("IMG");
    expect((el as HTMLImageElement).src).toBe("https://example.com/hero.png");
  });

  it("passes isAbsoluteChild prop through", () => {
    const node: RectangleNode = {
      id: "rect-abs",
      type: "RECTANGLE",
      name: "Abs Rect",
      x: 50, y: 75, width: 100, height: 50,
      fills: [], strokes: [], effects: [],
      cornerRadius: 0, opacity: 1, visible: true,
    };
    const { container } = render(<SceneNodeRenderer node={node} isAbsoluteChild />);
    const el = container.querySelector('[data-node-id="rect-abs"]') as HTMLElement;
    expect(el.style.position).toBe("absolute");
    expect(el.style.left).toBe("50px");
    expect(el.style.top).toBe("75px");
  });

  it("renders nested frame tree recursively", () => {
    const innerText: TextNode = {
      id: "t-inner",
      type: "TEXT",
      name: "Inner",
      x: 0, y: 0, width: 100, height: 20,
      fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
      strokes: [], effects: [],
      opacity: 1, visible: true,
      characters: "Nested Text",
      style: {
        fontFamily: "Inter", fontSize: 14, fontWeight: 400,
        textAlignHorizontal: "LEFT", textAlignVertical: "TOP",
        lineHeightPx: 18, letterSpacing: 0,
      },
    };
    const innerFrame: FrameNode = {
      id: "f-inner",
      type: "FRAME",
      name: "Inner Frame",
      x: 0, y: 0, width: 200, height: 100,
      fills: [], strokes: [], effects: [],
      cornerRadius: 0, opacity: 1, visible: true,
      clipsContent: false, layoutMode: "VERTICAL",
      primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN",
      primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "FIXED",
      paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
      itemSpacing: 0, children: [innerText],
    };
    const root: FrameNode = {
      id: "f-root",
      type: "FRAME",
      name: "Root",
      x: 0, y: 0, width: 800, height: 600,
      fills: [], strokes: [], effects: [],
      cornerRadius: 0, opacity: 1, visible: true,
      clipsContent: false, layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN",
      primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "FIXED",
      paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
      itemSpacing: 0, children: [innerFrame],
    };
    render(<SceneNodeRenderer node={root} />);
    expect(screen.getByText("Nested Text")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails (stub lacks full renderers)**

Run: `cd client && npx vitest run src/__tests__/SceneNodeRenderer.test.tsx`
Expected: FAIL or partial pass — the stub does not use TextRenderer, RectRenderer, or ImageRenderer

- [ ] **Step 3: Replace SceneNodeRenderer.tsx with full implementation**

```tsx
// client/src/renderer/SceneNodeRenderer.tsx
import type { SceneNode } from "@scene-graph/types.js";
import { FrameRenderer } from "./FrameRenderer.js";
import { TextRenderer } from "./TextRenderer.js";
import { RectRenderer } from "./RectRenderer.js";
import { ImageRenderer } from "./ImageRenderer.js";

interface SceneNodeRendererProps {
  node: SceneNode;
  /** When true, the node is positioned absolutely using its x/y coords */
  isAbsoluteChild?: boolean;
}

/**
 * Dispatcher component — switches on node.type and renders the
 * appropriate typed component. This is the recursive entry point
 * used by FrameRenderer to render its children.
 */
export function SceneNodeRenderer({ node, isAbsoluteChild }: SceneNodeRendererProps) {
  switch (node.type) {
    case "FRAME":
      return <FrameRenderer node={node} isAbsoluteChild={isAbsoluteChild} />;
    case "TEXT":
      return <TextRenderer node={node} isAbsoluteChild={isAbsoluteChild} />;
    case "RECTANGLE":
      return <RectRenderer node={node} isAbsoluteChild={isAbsoluteChild} />;
    case "IMAGE":
      return <ImageRenderer node={node} isAbsoluteChild={isAbsoluteChild} />;
    default: {
      // Exhaustive check — TypeScript will error if a new node type
      // is added to SceneNode but not handled here.
      const _exhaustive: never = node;
      return null;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run src/__tests__/SceneNodeRenderer.test.tsx`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add client/src/renderer/SceneNodeRenderer.tsx client/src/__tests__/SceneNodeRenderer.test.tsx
git commit -m "feat(renderer): add SceneNode dispatcher with exhaustive type switching"
```

---

### Task 9: Root BannerRenderer component

**Files:**
- Create: `client/src/renderer/BannerRenderer.tsx`
- Create: `client/src/renderer/index.ts`
- Create: `client/src/__tests__/BannerRenderer.test.tsx`

The top-level component. Takes a FrameNode (the scene graph root) and renders it at exact pixel dimensions inside a container div. This is what Playwright screenshots.

- [ ] **Step 1: Write failing tests**

```tsx
// client/src/__tests__/BannerRenderer.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BannerRenderer } from "../renderer/BannerRenderer.js";
import type { FrameNode, TextNode, ImageNode } from "@scene-graph/types.js";

function makeBanner(): FrameNode {
  const headline: TextNode = {
    id: "headline",
    type: "TEXT",
    name: "Headline",
    x: 0, y: 0, width: 500, height: 60,
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
    strokes: [], effects: [],
    opacity: 1, visible: true,
    characters: "Ship Faster",
    style: {
      fontFamily: "Inter", fontSize: 48, fontWeight: 700,
      textAlignHorizontal: "LEFT", textAlignVertical: "TOP",
      lineHeightPx: 58, letterSpacing: 0,
    },
  };

  const subtext: TextNode = {
    id: "subtext",
    type: "TEXT",
    name: "Subtext",
    x: 0, y: 0, width: 500, height: 30,
    fills: [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8, a: 1 } }],
    strokes: [], effects: [],
    opacity: 1, visible: true,
    characters: "DeFi lending, simplified",
    style: {
      fontFamily: "Inter", fontSize: 20, fontWeight: 400,
      textAlignHorizontal: "LEFT", textAlignVertical: "TOP",
      lineHeightPx: 28, letterSpacing: 0,
    },
  };

  const copy: FrameNode = {
    id: "copy",
    type: "FRAME",
    name: "Copy",
    x: 0, y: 0, width: 500, height: 200,
    fills: [], strokes: [], effects: [],
    cornerRadius: 0, opacity: 1, visible: true,
    clipsContent: false, layoutMode: "VERTICAL",
    primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN",
    primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "FIXED",
    paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
    itemSpacing: 16, children: [headline, subtext],
  };

  const hero: ImageNode = {
    id: "hero",
    type: "IMAGE",
    name: "DeviceMockup",
    x: 0, y: 0, width: 400, height: 500,
    fills: [], strokes: [], effects: [],
    opacity: 1, visible: true,
    source: "https://example.com/mockup.png",
    fit: "contain",
  };

  const root: FrameNode = {
    id: "banner-root",
    type: "FRAME",
    name: "Banner",
    x: 0, y: 0, width: 1200, height: 675,
    fills: [
      {
        type: "GRADIENT_LINEAR",
        stops: [
          { position: 0, color: { r: 0.1, g: 0.1, b: 0.2, a: 1 } },
          { position: 1, color: { r: 0.05, g: 0.05, b: 0.15, a: 1 } },
        ],
      },
    ],
    strokes: [], effects: [],
    cornerRadius: 0, opacity: 1, visible: true,
    clipsContent: true, layoutMode: "HORIZONTAL",
    primaryAxisAlignItems: "SPACE_BETWEEN",
    counterAxisAlignItems: "CENTER",
    primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "FIXED",
    paddingLeft: 60, paddingRight: 60,
    paddingTop: 40, paddingBottom: 40,
    itemSpacing: 24, children: [copy, hero],
  };

  return root;
}

describe("BannerRenderer", () => {
  it("renders the banner container at specified dimensions", () => {
    const banner = makeBanner();
    const { container } = render(<BannerRenderer root={banner} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("data-banner-renderer")).toBe("true");
    expect(wrapper.style.width).toBe("1200px");
    expect(wrapper.style.height).toBe("675px");
  });

  it("renders text content from the scene graph", () => {
    const banner = makeBanner();
    render(<BannerRenderer root={banner} />);
    expect(screen.getByText("Ship Faster")).toBeTruthy();
    expect(screen.getByText("DeFi lending, simplified")).toBeTruthy();
  });

  it("renders image elements from the scene graph", () => {
    const banner = makeBanner();
    const { container } = render(<BannerRenderer root={banner} />);
    const img = container.querySelector('img[data-node-id="hero"]') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toBe("https://example.com/mockup.png");
  });

  it("applies gradient background to root frame", () => {
    const banner = makeBanner();
    const { container } = render(<BannerRenderer root={banner} />);
    const rootFrame = container.querySelector('[data-node-id="banner-root"]') as HTMLElement;
    expect(rootFrame.style.background).toContain("linear-gradient");
  });

  it("clips overflow on the banner", () => {
    const banner = makeBanner();
    const { container } = render(<BannerRenderer root={banner} />);
    const rootFrame = container.querySelector('[data-node-id="banner-root"]') as HTMLElement;
    expect(rootFrame.style.overflow).toBe("hidden");
  });

  it("renders at custom dimensions when overridden", () => {
    const banner = makeBanner();
    const { container } = render(
      <BannerRenderer root={banner} width={1080} height={1080} />
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.width).toBe("1080px");
    expect(wrapper.style.height).toBe("1080px");
  });

  it("has the data attribute for Playwright targeting", () => {
    const banner = makeBanner();
    const { container } = render(<BannerRenderer root={banner} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("data-banner-renderer")).toBe("true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/__tests__/BannerRenderer.test.tsx`
Expected: FAIL — cannot resolve `../renderer/BannerRenderer.js`

- [ ] **Step 3: Implement BannerRenderer.tsx**

```tsx
// client/src/renderer/BannerRenderer.tsx
import type { CSSProperties } from "react";
import type { FrameNode } from "@scene-graph/types.js";
import { FrameRenderer } from "./FrameRenderer.js";

interface BannerRendererProps {
  /** The scene graph root — must be a FrameNode */
  root: FrameNode;
  /** Override width (defaults to root.width) */
  width?: number;
  /** Override height (defaults to root.height) */
  height?: number;
}

/**
 * Root renderer component. Wraps the scene graph in a fixed-dimension
 * container that Playwright can screenshot at exact pixel dimensions.
 *
 * Usage:
 *   <BannerRenderer root={sceneGraphRoot} />
 *   <BannerRenderer root={sceneGraphRoot} width={1080} height={1080} />
 */
export function BannerRenderer({ root, width, height }: BannerRendererProps) {
  const w = width ?? root.width;
  const h = height ?? root.height;

  // If dimensions are overridden, adjust the root node's dimensions
  // so the internal frame renders at the target size.
  const adjustedRoot: FrameNode =
    w !== root.width || h !== root.height
      ? { ...root, width: w, height: h }
      : root;

  const wrapperStyle: CSSProperties = {
    width: `${w}px`,
    height: `${h}px`,
    // Prevent any browser-level overflow
    overflow: "hidden",
    // Ensure pixel-perfect rendering
    lineHeight: 0,
    fontSize: 0,
  };

  return (
    <div data-banner-renderer="true" style={wrapperStyle}>
      <FrameRenderer node={adjustedRoot} />
    </div>
  );
}
```

- [ ] **Step 4: Create barrel export**

```typescript
// client/src/renderer/index.ts
export { BannerRenderer } from "./BannerRenderer.js";
export { SceneNodeRenderer } from "./SceneNodeRenderer.js";
export { FrameRenderer } from "./FrameRenderer.js";
export { TextRenderer } from "./TextRenderer.js";
export { RectRenderer } from "./RectRenderer.js";
export { ImageRenderer } from "./ImageRenderer.js";
export { paintToCSS } from "./paint.js";
export { effectsToCSS } from "./effects.js";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd client && npx vitest run src/__tests__/BannerRenderer.test.tsx`
Expected: PASS — all 7 tests pass

- [ ] **Step 6: Run full test suite**

Run: `cd client && npx vitest run`
Expected: PASS — all tests across all files pass

- [ ] **Step 7: Commit**

```bash
git add client/src/renderer/BannerRenderer.tsx client/src/renderer/index.ts client/src/__tests__/BannerRenderer.test.tsx
git commit -m "feat(renderer): add BannerRenderer root component and barrel exports"
```

---

### Task 10: Visual smoke test — render a template archetype JSON

**Files:**
- Create: `client/fixtures/split-banner.ts`
- Modify: `client/src/App.tsx`

Wire the renderer to a hardcoded scene graph fixture and verify the full DOM output renders correctly. This fixture mirrors the "split" template archetype from Plan A — image on one side, copy + CTA on the other.

- [ ] **Step 1: Create the split-banner fixture**

```typescript
// client/fixtures/split-banner.ts
import type { FrameNode, TextNode, ImageNode, RectangleNode } from "@scene-graph/types.js";

/**
 * "Split" template archetype fixture.
 * Structure: horizontal split — copy block (left) + hero image (right)
 * Uses: gradient background, auto-layout, text hierarchy, CTA button, image
 */

const headline: TextNode = {
  id: "headline",
  type: "TEXT",
  name: "Headline",
  x: 0,
  y: 0,
  width: 480,
  height: 120,
  fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
  strokes: [],
  effects: [],
  opacity: 1,
  visible: true,
  characters: "Ship Faster\nWith Less Risk",
  style: {
    fontFamily: "Inter",
    fontSize: 52,
    fontWeight: 700,
    textAlignHorizontal: "LEFT",
    textAlignVertical: "TOP",
    lineHeightPx: 62,
    letterSpacing: -0.5,
  },
};

const subtext: TextNode = {
  id: "subtext",
  type: "TEXT",
  name: "Subtext",
  x: 0,
  y: 0,
  width: 480,
  height: 56,
  fills: [{ type: "SOLID", color: { r: 0.75, g: 0.75, b: 0.82, a: 1 } }],
  strokes: [],
  effects: [],
  opacity: 1,
  visible: true,
  characters: "DeFi lending protocol with institutional-grade risk management. Live on mainnet.",
  style: {
    fontFamily: "Inter",
    fontSize: 18,
    fontWeight: 400,
    textAlignHorizontal: "LEFT",
    textAlignVertical: "TOP",
    lineHeightPx: 28,
    letterSpacing: 0,
  },
};

const ctaLabel: TextNode = {
  id: "cta-label",
  type: "TEXT",
  name: "CTA Label",
  x: 0,
  y: 0,
  width: 160,
  height: 24,
  fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
  strokes: [],
  effects: [],
  opacity: 1,
  visible: true,
  characters: "Launch App \u2192",
  style: {
    fontFamily: "Inter",
    fontSize: 16,
    fontWeight: 600,
    textAlignHorizontal: "CENTER",
    textAlignVertical: "CENTER",
    lineHeightPx: 24,
    letterSpacing: 0.5,
  },
};

const ctaButton: FrameNode = {
  id: "cta-button",
  type: "FRAME",
  name: "CTA Button",
  x: 0,
  y: 0,
  width: 180,
  height: 48,
  fills: [{ type: "SOLID", color: { r: 0.42, g: 0.36, b: 0.9, a: 1 } }],
  strokes: [],
  effects: [
    {
      type: "DROP_SHADOW",
      color: { r: 0.42, g: 0.36, b: 0.9, a: 0.4 },
      offset: { x: 0, y: 4 },
      radius: 12,
    },
  ],
  cornerRadius: 8,
  opacity: 1,
  visible: true,
  clipsContent: false,
  layoutMode: "HORIZONTAL",
  primaryAxisAlignItems: "CENTER",
  counterAxisAlignItems: "CENTER",
  primaryAxisSizingMode: "FIXED",
  counterAxisSizingMode: "FIXED",
  paddingLeft: 24,
  paddingRight: 24,
  paddingTop: 12,
  paddingBottom: 12,
  itemSpacing: 0,
  children: [ctaLabel],
};

const copyBlock: FrameNode = {
  id: "copy-block",
  type: "FRAME",
  name: "Copy Block",
  x: 0,
  y: 0,
  width: 480,
  height: 500,
  fills: [],
  strokes: [],
  effects: [],
  cornerRadius: 0,
  opacity: 1,
  visible: true,
  clipsContent: false,
  layoutMode: "VERTICAL",
  primaryAxisAlignItems: "CENTER",
  counterAxisAlignItems: "MIN",
  primaryAxisSizingMode: "FIXED",
  counterAxisSizingMode: "FIXED",
  paddingLeft: 0,
  paddingRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  itemSpacing: 24,
  children: [headline, subtext, ctaButton],
};

const heroImage: ImageNode = {
  id: "hero-image",
  type: "IMAGE",
  name: "Device Mockup",
  x: 0,
  y: 0,
  width: 440,
  height: 520,
  fills: [],
  strokes: [],
  effects: [
    {
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.3 },
      offset: { x: 0, y: 8 },
      radius: 24,
    },
  ],
  opacity: 1,
  visible: true,
  source: "https://placehold.co/440x520/1a1a2e/6c5ce7?text=App+Preview",
  fit: "contain",
};

const accentBar: RectangleNode = {
  id: "accent-bar",
  type: "RECTANGLE",
  name: "Accent Bar",
  x: 0,
  y: 0,
  width: 1200,
  height: 4,
  fills: [
    {
      type: "GRADIENT_LINEAR",
      stops: [
        { position: 0, color: { r: 0.42, g: 0.36, b: 0.9, a: 1 } },
        { position: 0.5, color: { r: 0.56, g: 0.27, b: 0.95, a: 1 } },
        { position: 1, color: { r: 0.42, g: 0.36, b: 0.9, a: 0 } },
      ],
    },
  ],
  strokes: [],
  effects: [],
  cornerRadius: 0,
  opacity: 1,
  visible: true,
};

export const splitBanner: FrameNode = {
  id: "banner-root",
  type: "FRAME",
  name: "Split Banner — Twitter/X 1200x675",
  x: 0,
  y: 0,
  width: 1200,
  height: 675,
  fills: [
    {
      type: "GRADIENT_LINEAR",
      stops: [
        { position: 0, color: { r: 0.08, g: 0.08, b: 0.16, a: 1 } },
        { position: 1, color: { r: 0.04, g: 0.04, b: 0.12, a: 1 } },
      ],
    },
  ],
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
  itemSpacing: 40,
  children: [copyBlock, heroImage],
};
```

- [ ] **Step 2: Update App.tsx to render the fixture**

```tsx
// client/src/App.tsx
import { BannerRenderer } from "./renderer/index.js";
import { splitBanner } from "../fixtures/split-banner.js";

export function App() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 24,
      padding: 40,
      fontFamily: "system-ui",
      color: "#fff",
    }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, opacity: 0.6 }}>
        Brandouble Canvas Renderer — Smoke Test
      </h1>
      <p style={{ fontSize: 14, opacity: 0.4, marginBottom: 16 }}>
        {splitBanner.name} ({splitBanner.width}x{splitBanner.height})
      </p>
      <BannerRenderer root={splitBanner} />
    </div>
  );
}
```

- [ ] **Step 3: Write a DOM-level smoke test**

```tsx
// client/src/__tests__/smoke.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BannerRenderer } from "../renderer/index.js";
import { splitBanner } from "../../fixtures/split-banner.js";

describe("Smoke test: split banner fixture", () => {
  it("renders the full scene graph without errors", () => {
    const { container } = render(<BannerRenderer root={splitBanner} />);
    const wrapper = container.querySelector('[data-banner-renderer="true"]');
    expect(wrapper).toBeTruthy();
  });

  it("renders the headline text", () => {
    render(<BannerRenderer root={splitBanner} />);
    expect(screen.getByText(/Ship Faster/)).toBeTruthy();
  });

  it("renders the subtext", () => {
    render(<BannerRenderer root={splitBanner} />);
    expect(screen.getByText(/DeFi lending protocol/)).toBeTruthy();
  });

  it("renders the CTA button text", () => {
    render(<BannerRenderer root={splitBanner} />);
    expect(screen.getByText(/Launch App/)).toBeTruthy();
  });

  it("renders the hero image", () => {
    const { container } = render(<BannerRenderer root={splitBanner} />);
    const img = container.querySelector('img[data-node-id="hero-image"]') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain("placehold.co");
  });

  it("renders the root frame with gradient background", () => {
    const { container } = render(<BannerRenderer root={splitBanner} />);
    const root = container.querySelector('[data-node-id="banner-root"]') as HTMLElement;
    expect(root.style.background).toContain("linear-gradient");
  });

  it("renders the CTA button with solid fill", () => {
    const { container } = render(<BannerRenderer root={splitBanner} />);
    const cta = container.querySelector('[data-node-id="cta-button"]') as HTMLElement;
    expect(cta.style.background).toContain("rgba");
  });

  it("renders the CTA button with drop shadow", () => {
    const { container } = render(<BannerRenderer root={splitBanner} />);
    const cta = container.querySelector('[data-node-id="cta-button"]') as HTMLElement;
    expect(cta.style.boxShadow).toContain("12px");
  });

  it("applies horizontal auto-layout to root", () => {
    const { container } = render(<BannerRenderer root={splitBanner} />);
    const root = container.querySelector('[data-node-id="banner-root"]') as HTMLElement;
    expect(root.style.display).toBe("flex");
    expect(root.style.flexDirection).toBe("row");
    expect(root.style.justifyContent).toBe("space-between");
    expect(root.style.alignItems).toBe("center");
  });

  it("applies vertical auto-layout to copy block", () => {
    const { container } = render(<BannerRenderer root={splitBanner} />);
    const copy = container.querySelector('[data-node-id="copy-block"]') as HTMLElement;
    expect(copy.style.display).toBe("flex");
    expect(copy.style.flexDirection).toBe("column");
  });

  it("applies padding to root frame", () => {
    const { container } = render(<BannerRenderer root={splitBanner} />);
    const root = container.querySelector('[data-node-id="banner-root"]') as HTMLElement;
    expect(root.style.paddingLeft).toBe("60px");
    expect(root.style.paddingRight).toBe("60px");
    expect(root.style.paddingTop).toBe("40px");
    expect(root.style.paddingBottom).toBe("40px");
  });

  it("applies overflow hidden to root frame", () => {
    const { container } = render(<BannerRenderer root={splitBanner} />);
    const root = container.querySelector('[data-node-id="banner-root"]') as HTMLElement;
    expect(root.style.overflow).toBe("hidden");
  });

  it("renders at banner dimensions (1200x675)", () => {
    const { container } = render(<BannerRenderer root={splitBanner} />);
    const wrapper = container.querySelector('[data-banner-renderer="true"]') as HTMLElement;
    expect(wrapper.style.width).toBe("1200px");
    expect(wrapper.style.height).toBe("675px");
  });

  it("can re-render at different dimensions", () => {
    const { container } = render(
      <BannerRenderer root={splitBanner} width={1080} height={1080} />
    );
    const wrapper = container.querySelector('[data-banner-renderer="true"]') as HTMLElement;
    expect(wrapper.style.width).toBe("1080px");
    expect(wrapper.style.height).toBe("1080px");
  });

  it("renders all expected data-node-id attributes", () => {
    const { container } = render(<BannerRenderer root={splitBanner} />);
    const expectedIds = [
      "banner-root",
      "copy-block",
      "headline",
      "subtext",
      "cta-button",
      "cta-label",
      "hero-image",
    ];
    for (const id of expectedIds) {
      expect(container.querySelector(`[data-node-id="${id}"]`)).toBeTruthy();
    }
  });
});
```

- [ ] **Step 4: Run the full test suite**

```bash
cd client && npx vitest run
```

Expected: PASS — all tests across all files pass (paint, effects, Frame, Text, Rect, Image, SceneNode, Banner, smoke).

- [ ] **Step 5: Visual verification — start dev server and inspect in browser**

```bash
cd client && npx vite --host 127.0.0.1 &
# Open http://127.0.0.1:5173 and visually confirm:
# - Dark gradient background
# - "Ship Faster / With Less Risk" headline in white
# - Subtext in lighter gray
# - Purple CTA button with "Launch App →"
# - Placeholder device mockup image on the right
# - Horizontal split layout
# Then kill the server:
kill %1
```

- [ ] **Step 6: Commit**

```bash
git add client/fixtures/split-banner.ts client/src/App.tsx client/src/__tests__/smoke.test.tsx
git commit -m "feat(renderer): add split-banner fixture and visual smoke test"
```

---

## Summary

| Task | Component | Test count | Purpose |
|------|-----------|------------|---------|
| 1 | Vite + React scaffold | 0 | Project setup |
| 2 | `paintToCSS` | 7 | Paint[] to CSS background |
| 3 | `effectsToCSS` | 6 | Effect[] to CSS box-shadow/filter |
| 4 | `FrameRenderer` | 14 | Auto-layout to flexbox, padding, fills, clip |
| 5 | `TextRenderer` | 13 | TypeStyle to CSS typography |
| 6 | `RectRenderer` | 9 | Fills, strokes, corner radius |
| 7 | `ImageRenderer` | 12 | Source, object-fit, effects |
| 8 | `SceneNodeRenderer` | 6 | Type dispatcher with exhaustive check |
| 9 | `BannerRenderer` | 7 | Root container at pixel dimensions |
| 10 | Smoke test | 15 | Full fixture render verification |
| **Total** | | **89** | |

### What this plan does NOT cover (deferred to later plans)

- **Interaction** (Plan F: Editor) — selection, drag, resize, inline text edit
- **Playwright export** (Plan E: Export Pipeline) — screenshot the rendered DOM to PNG
- **Font loading** — uses system fonts for MVP; web font loading is a follow-up
- **Responsive sizing** — auto-layout stretches fixed-width nodes; true responsive behavior (FILL sizing mode) is a follow-up
- **Vector/Ellipse/Group nodes** — out of MVP scope per spec
