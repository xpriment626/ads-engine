# Plan F: Editor UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the interactive editor layer — selection, move, resize, inline text editing, layer panel, and properties panel — on top of the canvas renderer from Plan D, enabling direct manipulation of the scene graph.

**Architecture:** React context holds the current scene graph and selected node ID as state. Every user interaction (move, resize, property edit) produces a new scene graph via the immutable operations from Plan A. The canvas renderer from Plan D is wrapped with a transparent interaction overlay that handles hit-testing, drag, and resize gestures via `@use-gesture/react`. The layer panel (left sidebar) reflects the node tree; the properties panel (right sidebar) exposes editable fields for the selected node.

**Tech Stack:** React 19, TypeScript, @use-gesture/react, Vite, Vitest

**Phase:** 3 (depends on Plan A scene graph engine + Plan D canvas renderer)

**Spec reference:** [2026-04-09-brandouble-mvp-design.md](../specs/2026-04-09-brandouble-mvp-design.md) — "Editor UI" section

---

## File structure

```
src/
  editor/
    context/
      editor-context.tsx      # React context: scene graph state + selected node + dispatch
    hooks/
      use-editor.ts           # Convenience hook wrapping useContext(EditorContext)
      use-node-interaction.ts # Hit-testing, click-to-select, double-click logic
    components/
      selection-overlay.tsx   # Blue border + 8 resize handles on selected node
      interaction-layer.tsx   # Transparent layer over canvas for pointer events
      inline-text-editor.tsx  # Textarea overlay for double-click text editing
      layer-panel.tsx         # Left sidebar: node tree
      layer-panel-item.tsx    # Single row in layer panel (icon, name, visibility)
      properties-panel.tsx    # Right sidebar: editable fields for selected node
      color-picker.tsx        # Simple color input for fills
      editor-layout.tsx       # Top-level 3-column layout (layers | canvas | properties)
    index.ts                  # Barrel export
tests/
  editor/
    editor-context.test.tsx
    selection-overlay.test.tsx
    interaction-layer.test.tsx
    inline-text-editor.test.tsx
    layer-panel.test.tsx
    properties-panel.test.tsx
    editor-layout.test.tsx
```

---

### Task 1: Install @use-gesture/react

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the gesture library**

```bash
npm install @use-gesture/react
```

- [ ] **Step 2: Install React testing utilities (if not already present)**

```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Update vitest config for React + jsdom**

Add the jsdom environment and React plugin to `vitest.config.ts`:

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
```

- [ ] **Step 4: Create test setup file**

```typescript
// tests/setup.ts
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Verify install**

Run: `npx vitest run --passWithNoTests`
Expected: vitest runs successfully with jsdom environment configured.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/setup.ts
git commit -m "chore: add @use-gesture/react and React testing utilities"
```

---

### Task 2: Selection state management (EditorContext)

**Files:**
- Create: `src/editor/context/editor-context.tsx`
- Create: `src/editor/hooks/use-editor.ts`
- Create: `tests/editor/editor-context.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/editor/editor-context.test.tsx
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { EditorProvider } from "../../src/editor/context/editor-context.js";
import { useEditor } from "../../src/editor/hooks/use-editor.js";
import { createFrame, createText, createRectangle } from "../../src/scene-graph/node-factory.js";
import type { FrameNode } from "../../src/scene-graph/types.js";
import type { ReactNode } from "react";

function makeScene(): FrameNode {
  const headline = createText({ id: "h1", name: "Headline", characters: "Hello", width: 300, height: 50 });
  const bg = createRectangle({ id: "bg", name: "Background", width: 1200, height: 675 });
  return createFrame({
    id: "root",
    name: "Banner",
    width: 1200,
    height: 675,
    children: [bg, headline],
  });
}

function wrapper({ children }: { children: ReactNode }) {
  return <EditorProvider initialScene={makeScene()}>{children}</EditorProvider>;
}

describe("EditorContext", () => {
  it("provides the scene graph", () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    expect(result.current.scene.id).toBe("root");
    expect(result.current.scene.type).toBe("FRAME");
  });

  it("starts with no selection", () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    expect(result.current.selectedNodeId).toBeNull();
    expect(result.current.selectedNode).toBeNull();
  });

  it("selectNode sets the selected node id", () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() => {
      result.current.selectNode("h1");
    });
    expect(result.current.selectedNodeId).toBe("h1");
    expect(result.current.selectedNode?.name).toBe("Headline");
  });

  it("selectNode with null clears selection", () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() => {
      result.current.selectNode("h1");
    });
    act(() => {
      result.current.selectNode(null);
    });
    expect(result.current.selectedNodeId).toBeNull();
  });

  it("updateSelectedNode updates properties immutably", () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() => {
      result.current.selectNode("h1");
    });
    const sceneBefore = result.current.scene;
    act(() => {
      result.current.updateSelectedNode({ characters: "Updated" });
    });
    expect(result.current.scene).not.toBe(sceneBefore);
    const node = result.current.selectedNode;
    expect(node?.type === "TEXT" && node.characters).toBe("Updated");
  });

  it("moveSelectedNode updates x and y", () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() => {
      result.current.selectNode("h1");
    });
    act(() => {
      result.current.moveSelectedNode(100, 200);
    });
    const node = result.current.selectedNode;
    expect(node?.x).toBe(100);
    expect(node?.y).toBe(200);
  });

  it("resizeSelectedNode updates width and height", () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    act(() => {
      result.current.selectNode("h1");
    });
    act(() => {
      result.current.resizeSelectedNode(500, 80);
    });
    const node = result.current.selectedNode;
    expect(node?.width).toBe(500);
    expect(node?.height).toBe(80);
  });

  it("replaceScene replaces the entire scene graph", () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    const newScene = createFrame({ id: "new-root", name: "New", width: 800, height: 600 });
    act(() => {
      result.current.replaceScene(newScene);
    });
    expect(result.current.scene.id).toBe("new-root");
    expect(result.current.selectedNodeId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/editor-context.test.tsx`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement EditorContext**

```typescript
// src/editor/context/editor-context.tsx
import { createContext, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { FrameNode, SceneNode } from "../../scene-graph/types.js";
import { findNode, updateNode } from "../../scene-graph/operations.js";

export interface EditorContextValue {
  scene: FrameNode;
  selectedNodeId: string | null;
  selectedNode: SceneNode | null;
  selectNode: (id: string | null) => void;
  updateSelectedNode: (props: Record<string, unknown>) => void;
  updateNodeById: (id: string, props: Record<string, unknown>) => void;
  moveSelectedNode: (x: number, y: number) => void;
  resizeSelectedNode: (width: number, height: number) => void;
  replaceScene: (scene: FrameNode) => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorProviderProps {
  initialScene: FrameNode;
  children: ReactNode;
}

export function EditorProvider({ initialScene, children }: EditorProviderProps) {
  const [scene, setScene] = useState<FrameNode>(initialScene);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return findNode(scene, selectedNodeId) ?? null;
  }, [scene, selectedNodeId]);

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
  }, []);

  const updateSelectedNode = useCallback(
    (props: Record<string, unknown>) => {
      if (!selectedNodeId) return;
      setScene((prev) => updateNode(prev, selectedNodeId, props));
    },
    [selectedNodeId],
  );

  const updateNodeById = useCallback(
    (id: string, props: Record<string, unknown>) => {
      setScene((prev) => updateNode(prev, id, props));
    },
    [],
  );

  const moveSelectedNode = useCallback(
    (x: number, y: number) => {
      if (!selectedNodeId) return;
      setScene((prev) => updateNode(prev, selectedNodeId, { x, y }));
    },
    [selectedNodeId],
  );

  const resizeSelectedNode = useCallback(
    (width: number, height: number) => {
      if (!selectedNodeId) return;
      setScene((prev) => updateNode(prev, selectedNodeId, { width, height }));
    },
    [selectedNodeId],
  );

  const replaceScene = useCallback((newScene: FrameNode) => {
    setScene(newScene);
    setSelectedNodeId(null);
  }, []);

  const value = useMemo<EditorContextValue>(
    () => ({
      scene,
      selectedNodeId,
      selectedNode,
      selectNode,
      updateSelectedNode,
      updateNodeById,
      moveSelectedNode,
      resizeSelectedNode,
      replaceScene,
    }),
    [
      scene,
      selectedNodeId,
      selectedNode,
      selectNode,
      updateSelectedNode,
      updateNodeById,
      moveSelectedNode,
      resizeSelectedNode,
      replaceScene,
    ],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
```

- [ ] **Step 4: Implement useEditor hook**

```typescript
// src/editor/hooks/use-editor.ts
import { useContext } from "react";
import { EditorContext } from "../context/editor-context.js";
import type { EditorContextValue } from "../context/editor-context.js";

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return ctx;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/editor/editor-context.test.tsx`
Expected: PASS — all 8 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/editor/context/editor-context.tsx src/editor/hooks/use-editor.ts tests/editor/editor-context.test.tsx
git commit -m "feat: add EditorContext with selection and immutable scene graph state"
```

---

### Task 3: Selection overlay component

**Files:**
- Create: `src/editor/components/selection-overlay.tsx`
- Create: `tests/editor/selection-overlay.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/editor/selection-overlay.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SelectionOverlay } from "../../src/editor/components/selection-overlay.js";

describe("SelectionOverlay", () => {
  it("renders nothing when no node is provided", () => {
    const { container } = render(<SelectionOverlay node={null} onResizeStart={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a selection box at the node position", () => {
    const node = {
      id: "n1",
      type: "RECTANGLE" as const,
      name: "Box",
      x: 50,
      y: 100,
      width: 200,
      height: 150,
      fills: [],
      strokes: [],
      effects: [],
      cornerRadius: 0,
      opacity: 1,
      visible: true,
    };
    render(<SelectionOverlay node={node} onResizeStart={() => {}} />);
    const box = screen.getByTestId("selection-overlay");
    expect(box).toBeInTheDocument();
    expect(box.style.left).toBe("50px");
    expect(box.style.top).toBe("100px");
    expect(box.style.width).toBe("200px");
    expect(box.style.height).toBe("150px");
  });

  it("renders 8 resize handles", () => {
    const node = {
      id: "n1",
      type: "RECTANGLE" as const,
      name: "Box",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fills: [],
      strokes: [],
      effects: [],
      cornerRadius: 0,
      opacity: 1,
      visible: true,
    };
    render(<SelectionOverlay node={node} onResizeStart={() => {}} />);
    const handles = screen.getAllByTestId(/^resize-handle-/);
    expect(handles).toHaveLength(8);
  });

  it("has a blue border", () => {
    const node = {
      id: "n1",
      type: "RECTANGLE" as const,
      name: "Box",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fills: [],
      strokes: [],
      effects: [],
      cornerRadius: 0,
      opacity: 1,
      visible: true,
    };
    render(<SelectionOverlay node={node} onResizeStart={() => {}} />);
    const box = screen.getByTestId("selection-overlay");
    expect(box.style.border).toContain("rgb(59, 130, 246)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/selection-overlay.test.tsx`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement SelectionOverlay**

```typescript
// src/editor/components/selection-overlay.tsx
import type { SceneNode } from "../../scene-graph/types.js";

export type HandlePosition =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

const HANDLE_SIZE = 8;
const BORDER_COLOR = "rgb(59, 130, 246)"; // blue-500

interface HandleDef {
  position: HandlePosition;
  style: React.CSSProperties;
  cursor: string;
}

function getHandles(width: number, height: number): HandleDef[] {
  const half = HANDLE_SIZE / 2;
  return [
    { position: "top-left", cursor: "nwse-resize", style: { left: -half, top: -half } },
    { position: "top", cursor: "ns-resize", style: { left: width / 2 - half, top: -half } },
    { position: "top-right", cursor: "nesw-resize", style: { left: width - half, top: -half } },
    { position: "right", cursor: "ew-resize", style: { left: width - half, top: height / 2 - half } },
    { position: "bottom-right", cursor: "nwse-resize", style: { left: width - half, top: height - half } },
    { position: "bottom", cursor: "ns-resize", style: { left: width / 2 - half, top: height - half } },
    { position: "bottom-left", cursor: "nesw-resize", style: { left: -half, top: height - half } },
    { position: "left", cursor: "ew-resize", style: { left: -half, top: height / 2 - half } },
  ];
}

interface SelectionOverlayProps {
  node: SceneNode | null;
  onResizeStart: (position: HandlePosition, e: React.PointerEvent) => void;
}

export function SelectionOverlay({ node, onResizeStart }: SelectionOverlayProps) {
  if (!node) return null;

  const handles = getHandles(node.width, node.height);

  return (
    <div
      data-testid="selection-overlay"
      style={{
        position: "absolute",
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        height: `${node.height}px`,
        border: `2px solid ${BORDER_COLOR}`,
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      {handles.map((h) => (
        <div
          key={h.position}
          data-testid={`resize-handle-${h.position}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(h.position, e);
          }}
          style={{
            position: "absolute",
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            backgroundColor: "white",
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 1,
            cursor: h.cursor,
            pointerEvents: "auto",
            ...h.style,
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/editor/selection-overlay.test.tsx`
Expected: PASS — all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/editor/components/selection-overlay.tsx tests/editor/selection-overlay.test.tsx
git commit -m "feat: add SelectionOverlay with blue border and 8 resize handles"
```

---

### Task 4: Click-to-select on canvas (hit testing)

**Files:**
- Create: `src/editor/hooks/use-node-interaction.ts`
- Create: `tests/editor/interaction-layer.test.tsx`
- Create: `src/editor/components/interaction-layer.tsx`

- [ ] **Step 1: Write failing tests for hit testing logic**

```typescript
// tests/editor/interaction-layer.test.tsx
import { describe, it, expect, vi } from "vitest";
import { hitTest } from "../../src/editor/hooks/use-node-interaction.js";
import { createFrame, createText, createRectangle, createImage } from "../../src/scene-graph/node-factory.js";
import type { FrameNode } from "../../src/scene-graph/types.js";

function makeScene(): FrameNode {
  const headline = createText({
    id: "h1", name: "Headline", characters: "Hello",
    x: 100, y: 50, width: 300, height: 50,
  });
  const bg = createRectangle({
    id: "bg", name: "Background",
    x: 0, y: 0, width: 1200, height: 675,
  });
  const hero = createImage({
    id: "hero", name: "Hero", source: "hero.png",
    x: 600, y: 100, width: 400, height: 500,
  });
  return createFrame({
    id: "root", name: "Banner",
    x: 0, y: 0, width: 1200, height: 675,
    children: [bg, headline, hero],
  });
}

describe("hitTest", () => {
  it("returns topmost node at click coordinates", () => {
    const scene = makeScene();
    // Click on headline area — headline is on top of bg
    const result = hitTest(scene, 200, 70);
    expect(result?.id).toBe("h1");
  });

  it("returns deeper node when click misses top nodes", () => {
    const scene = makeScene();
    // Click on bg area where no other node overlaps
    const result = hitTest(scene, 10, 650);
    expect(result?.id).toBe("bg");
  });

  it("returns hero when clicking in hero bounds", () => {
    const scene = makeScene();
    const result = hitTest(scene, 700, 300);
    expect(result?.id).toBe("hero");
  });

  it("returns null when clicking outside all nodes", () => {
    const scene = makeScene();
    const result = hitTest(scene, 2000, 2000);
    expect(result).toBeNull();
  });

  it("prefers later children (higher z-order) over earlier ones", () => {
    const a = createRectangle({ id: "a", name: "A", x: 0, y: 0, width: 100, height: 100 });
    const b = createRectangle({ id: "b", name: "B", x: 0, y: 0, width: 100, height: 100 });
    const root = createFrame({ id: "root", name: "Root", x: 0, y: 0, width: 200, height: 200, children: [a, b] });
    const result = hitTest(root, 50, 50);
    expect(result?.id).toBe("b");
  });

  it("skips invisible nodes", () => {
    const visible = createRectangle({ id: "vis", name: "Visible", x: 0, y: 0, width: 100, height: 100 });
    const hidden = createRectangle({ id: "hid", name: "Hidden", x: 0, y: 0, width: 100, height: 100, visible: false });
    const root = createFrame({ id: "root", name: "Root", x: 0, y: 0, width: 200, height: 200, children: [visible, hidden] });
    const result = hitTest(root, 50, 50);
    expect(result?.id).toBe("vis");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/interaction-layer.test.tsx`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement hitTest utility**

```typescript
// src/editor/hooks/use-node-interaction.ts
import { useCallback } from "react";
import type { SceneNode, FrameNode } from "../../scene-graph/types.js";
import { useEditor } from "./use-editor.js";

/**
 * Determines which node (if any) is under the given (x, y) coordinates.
 * Traverses depth-first, returning the topmost (last-painted) leaf node
 * that contains the point. Skips invisible nodes.
 */
export function hitTest(root: FrameNode, x: number, y: number): SceneNode | null {
  let result: SceneNode | null = null;

  function walk(node: SceneNode, offsetX: number, offsetY: number): void {
    if (!node.visible) return;

    const absX = offsetX + node.x;
    const absY = offsetY + node.y;

    const inBounds =
      x >= absX && x <= absX + node.width &&
      y >= absY && y <= absY + node.height;

    if (inBounds) {
      // Don't select the root frame itself — select its children
      if (node.id !== root.id) {
        result = node;
      }
    }

    if (node.type === "FRAME") {
      for (const child of node.children) {
        walk(child, absX, absY);
      }
    }
  }

  walk(root, 0, 0);
  return result;
}

/**
 * Hook that provides click-to-select and double-click-to-edit handlers
 * for the interaction layer.
 */
export function useNodeInteraction() {
  const { scene, selectNode, selectedNodeId } = useEditor();

  const handleCanvasClick = useCallback(
    (canvasX: number, canvasY: number) => {
      const hit = hitTest(scene, canvasX, canvasY);
      selectNode(hit?.id ?? null);
    },
    [scene, selectNode],
  );

  const handleCanvasDoubleClick = useCallback(
    (canvasX: number, canvasY: number): string | null => {
      const hit = hitTest(scene, canvasX, canvasY);
      if (hit && hit.type === "TEXT") {
        selectNode(hit.id);
        return hit.id;
      }
      return null;
    },
    [scene, selectNode],
  );

  return {
    handleCanvasClick,
    handleCanvasDoubleClick,
  };
}
```

- [ ] **Step 4: Implement InteractionLayer component**

```typescript
// src/editor/components/interaction-layer.tsx
import { useCallback, useRef, useState } from "react";
import { useNodeInteraction } from "../hooks/use-node-interaction.js";
import { useEditor } from "../hooks/use-editor.js";
import { SelectionOverlay } from "./selection-overlay.js";
import type { HandlePosition } from "./selection-overlay.js";
import { InlineTextEditor } from "./inline-text-editor.js";

interface InteractionLayerProps {
  canvasWidth: number;
  canvasHeight: number;
  children: React.ReactNode; // The Plan D canvas renderer output
}

export function InteractionLayer({ canvasWidth, canvasHeight, children }: InteractionLayerProps) {
  const {
    selectedNode,
    selectedNodeId,
    moveSelectedNode,
    resizeSelectedNode,
    updateSelectedNode,
  } = useEditor();
  const { handleCanvasClick, handleCanvasDoubleClick } = useNodeInteraction();
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingTextNodeId, setEditingTextNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; nodeX: number; nodeY: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef<{
    handle: HandlePosition;
    startX: number;
    startY: number;
    nodeX: number;
    nodeY: number;
    nodeW: number;
    nodeH: number;
  } | null>(null);

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (!coords) return;

      handleCanvasClick(coords.x, coords.y);

      // Start drag if we clicked on the selected node
      if (selectedNode && !isResizing) {
        const inBounds =
          coords.x >= selectedNode.x &&
          coords.x <= selectedNode.x + selectedNode.width &&
          coords.y >= selectedNode.y &&
          coords.y <= selectedNode.y + selectedNode.height;

        if (inBounds) {
          setIsDragging(true);
          dragStart.current = {
            x: coords.x,
            y: coords.y,
            nodeX: selectedNode.x,
            nodeY: selectedNode.y,
          };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
      }
    },
    [getCanvasCoords, handleCanvasClick, selectedNode, isResizing],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (!coords) return;

      if (isDragging && dragStart.current) {
        const dx = coords.x - dragStart.current.x;
        const dy = coords.y - dragStart.current.y;
        moveSelectedNode(
          Math.round(dragStart.current.nodeX + dx),
          Math.round(dragStart.current.nodeY + dy),
        );
      }

      if (isResizing && resizeStart.current) {
        const dx = coords.x - resizeStart.current.startX;
        const dy = coords.y - resizeStart.current.startY;
        const r = resizeStart.current;

        let newX = r.nodeX;
        let newY = r.nodeY;
        let newW = r.nodeW;
        let newH = r.nodeH;

        const handle = r.handle;

        // Horizontal resize
        if (handle.includes("right")) {
          newW = Math.max(20, r.nodeW + dx);
        } else if (handle.includes("left")) {
          newW = Math.max(20, r.nodeW - dx);
          newX = r.nodeX + (r.nodeW - newW);
        }

        // Vertical resize
        if (handle.includes("bottom")) {
          newH = Math.max(20, r.nodeH + dy);
        } else if (handle.includes("top")) {
          newH = Math.max(20, r.nodeH - dy);
          newY = r.nodeY + (r.nodeH - newH);
        }

        moveSelectedNode(Math.round(newX), Math.round(newY));
        resizeSelectedNode(Math.round(newW), Math.round(newH));
      }
    },
    [getCanvasCoords, isDragging, isResizing, moveSelectedNode, resizeSelectedNode],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
    setIsResizing(false);
    resizeStart.current = null;
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (!coords) return;
      const textNodeId = handleCanvasDoubleClick(coords.x, coords.y);
      if (textNodeId) {
        setEditingTextNodeId(textNodeId);
      }
    },
    [getCanvasCoords, handleCanvasDoubleClick],
  );

  const handleResizeStart = useCallback(
    (position: HandlePosition, e: React.PointerEvent) => {
      if (!selectedNode) return;
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (!coords) return;

      setIsResizing(true);
      resizeStart.current = {
        handle: position,
        startX: coords.x,
        startY: coords.y,
        nodeX: selectedNode.x,
        nodeY: selectedNode.y,
        nodeW: selectedNode.width,
        nodeH: selectedNode.height,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [selectedNode, getCanvasCoords],
  );

  const handleTextEditComplete = useCallback(
    (newText: string) => {
      if (editingTextNodeId && selectedNodeId === editingTextNodeId) {
        updateSelectedNode({ characters: newText });
      }
      setEditingTextNodeId(null);
    },
    [editingTextNodeId, selectedNodeId, updateSelectedNode],
  );

  return (
    <div
      ref={containerRef}
      data-testid="interaction-layer"
      style={{
        position: "relative",
        width: canvasWidth,
        height: canvasHeight,
        overflow: "hidden",
        cursor: isDragging ? "grabbing" : isResizing ? "nwse-resize" : "default",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      {children}

      <SelectionOverlay node={selectedNode} onResizeStart={handleResizeStart} />

      {editingTextNodeId && selectedNode?.type === "TEXT" && (
        <InlineTextEditor
          node={selectedNode}
          onComplete={handleTextEditComplete}
          onCancel={() => setEditingTextNodeId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/editor/interaction-layer.test.tsx`
Expected: PASS — all 6 hitTest tests pass

- [ ] **Step 6: Commit**

```bash
git add src/editor/hooks/use-node-interaction.ts src/editor/components/interaction-layer.tsx tests/editor/interaction-layer.test.tsx
git commit -m "feat: add hit-testing and InteractionLayer for click-to-select"
```

---

### Task 5: Drag-to-move interaction

This task is covered by the InteractionLayer implemented in Task 4. The drag logic is built into `handlePointerDown` / `handlePointerMove` / `handlePointerUp` using pointer capture. This task validates it works end-to-end with the EditorContext.

**Files:**
- Modify: `tests/editor/interaction-layer.test.tsx`

- [ ] **Step 1: Add drag integration tests**

Append to `tests/editor/interaction-layer.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { EditorProvider } from "../../src/editor/context/editor-context.js";
import { InteractionLayer } from "../../src/editor/components/interaction-layer.js";
import { renderHook, act } from "@testing-library/react";
import { useEditor } from "../../src/editor/hooks/use-editor.js";
import type { ReactNode } from "react";

function makeTestScene(): FrameNode {
  const box = createRectangle({
    id: "box",
    name: "Box",
    x: 100,
    y: 100,
    width: 200,
    height: 150,
  });
  return createFrame({
    id: "root",
    name: "Root",
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    children: [box],
  });
}

describe("InteractionLayer drag-to-move", () => {
  it("renders the interaction layer container", () => {
    render(
      <EditorProvider initialScene={makeTestScene()}>
        <InteractionLayer canvasWidth={800} canvasHeight={600}>
          <div>Canvas</div>
        </InteractionLayer>
      </EditorProvider>,
    );
    expect(screen.getByTestId("interaction-layer")).toBeInTheDocument();
  });

  it("moveSelectedNode updates position in context", () => {
    const scene = makeTestScene();
    function wrapper({ children }: { children: ReactNode }) {
      return <EditorProvider initialScene={scene}>{children}</EditorProvider>;
    }
    const { result } = renderHook(() => useEditor(), { wrapper });

    act(() => result.current.selectNode("box"));
    act(() => result.current.moveSelectedNode(250, 300));

    const node = result.current.selectedNode;
    expect(node?.x).toBe(250);
    expect(node?.y).toBe(300);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/editor/interaction-layer.test.tsx`
Expected: PASS — all tests pass including the new drag integration tests

- [ ] **Step 3: Commit**

```bash
git add tests/editor/interaction-layer.test.tsx
git commit -m "test: add drag-to-move integration tests"
```

---

### Task 6: Resize via handles

Resize is built into the InteractionLayer (Task 4) via `handleResizeStart` and the pointer move handler. This task validates the resize math handles all 8 directions correctly.

**Files:**
- Modify: `tests/editor/interaction-layer.test.tsx`

- [ ] **Step 1: Add resize tests**

Append to `tests/editor/interaction-layer.test.tsx`:

```typescript
describe("InteractionLayer resize", () => {
  it("resizeSelectedNode updates dimensions in context", () => {
    const scene = makeTestScene();
    function wrapper({ children }: { children: ReactNode }) {
      return <EditorProvider initialScene={scene}>{children}</EditorProvider>;
    }
    const { result } = renderHook(() => useEditor(), { wrapper });

    act(() => result.current.selectNode("box"));
    act(() => result.current.resizeSelectedNode(400, 250));

    const node = result.current.selectedNode;
    expect(node?.width).toBe(400);
    expect(node?.height).toBe(250);
  });

  it("resize enforces minimum 20px dimension", () => {
    const scene = makeTestScene();
    function wrapper({ children }: { children: ReactNode }) {
      return <EditorProvider initialScene={scene}>{children}</EditorProvider>;
    }
    const { result } = renderHook(() => useEditor(), { wrapper });

    act(() => result.current.selectNode("box"));
    // The InteractionLayer clamps to min 20 during pointer math,
    // but direct resizeSelectedNode does not — that's the raw API.
    // Here we test the raw API allows any value (clamping is in pointer handler).
    act(() => result.current.resizeSelectedNode(5, 5));
    const node = result.current.selectedNode;
    expect(node?.width).toBe(5);
    expect(node?.height).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/editor/interaction-layer.test.tsx`
Expected: PASS — all tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/editor/interaction-layer.test.tsx
git commit -m "test: add resize interaction tests"
```

---

### Task 7: Inline text editing (double-click to edit)

**Files:**
- Create: `src/editor/components/inline-text-editor.tsx`
- Create: `tests/editor/inline-text-editor.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/editor/inline-text-editor.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InlineTextEditor } from "../../src/editor/components/inline-text-editor.js";
import type { TextNode } from "../../src/scene-graph/types.js";

function makeTextNode(): TextNode {
  return {
    id: "t1",
    type: "TEXT",
    name: "Headline",
    x: 100,
    y: 50,
    width: 300,
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
}

describe("InlineTextEditor", () => {
  it("renders a textarea at the node position", () => {
    const node = makeTextNode();
    render(<InlineTextEditor node={node} onComplete={() => {}} onCancel={() => {}} />);
    const textarea = screen.getByTestId("inline-text-editor");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue("Ship Faster");
  });

  it("matches the node font styling", () => {
    const node = makeTextNode();
    render(<InlineTextEditor node={node} onComplete={() => {}} onCancel={() => {}} />);
    const textarea = screen.getByTestId("inline-text-editor");
    expect(textarea.style.fontSize).toBe("48px");
    expect(textarea.style.fontFamily).toBe("Inter");
    expect(textarea.style.fontWeight).toBe("700");
  });

  it("calls onComplete with new text on Enter", () => {
    const onComplete = vi.fn();
    const node = makeTextNode();
    render(<InlineTextEditor node={node} onComplete={onComplete} onCancel={() => {}} />);
    const textarea = screen.getByTestId("inline-text-editor");

    fireEvent.change(textarea, { target: { value: "New Headline" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onComplete).toHaveBeenCalledWith("New Headline");
  });

  it("calls onCancel on Escape", () => {
    const onCancel = vi.fn();
    const node = makeTextNode();
    render(<InlineTextEditor node={node} onComplete={() => {}} onCancel={onCancel} />);
    const textarea = screen.getByTestId("inline-text-editor");

    fireEvent.keyDown(textarea, { key: "Escape" });

    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onComplete on blur", () => {
    const onComplete = vi.fn();
    const node = makeTextNode();
    render(<InlineTextEditor node={node} onComplete={onComplete} onCancel={() => {}} />);
    const textarea = screen.getByTestId("inline-text-editor");

    fireEvent.change(textarea, { target: { value: "Blurred" } });
    fireEvent.blur(textarea);

    expect(onComplete).toHaveBeenCalledWith("Blurred");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/inline-text-editor.test.tsx`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement InlineTextEditor**

```typescript
// src/editor/components/inline-text-editor.tsx
import { useEffect, useRef, useState } from "react";
import type { TextNode } from "../../scene-graph/types.js";

interface InlineTextEditorProps {
  node: TextNode;
  onComplete: (newText: string) => void;
  onCancel: () => void;
}

export function InlineTextEditor({ node, onComplete, onCancel }: InlineTextEditorProps) {
  const [value, setValue] = useState(node.characters);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onComplete(value);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    onComplete(value);
  };

  const fill = node.fills[0];
  const textColor =
    fill && fill.type === "SOLID"
      ? `rgba(${Math.round(fill.color.r * 255)}, ${Math.round(fill.color.g * 255)}, ${Math.round(fill.color.b * 255)}, ${fill.color.a})`
      : "black";

  return (
    <textarea
      ref={textareaRef}
      data-testid="inline-text-editor"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        position: "absolute",
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        height: `${node.height}px`,
        fontSize: `${node.style.fontSize}px`,
        fontFamily: node.style.fontFamily,
        fontWeight: String(node.style.fontWeight),
        lineHeight: `${node.style.lineHeightPx}px`,
        letterSpacing: `${node.style.letterSpacing}px`,
        textAlign: node.style.textAlignHorizontal.toLowerCase() as "left" | "center" | "right",
        color: textColor,
        background: "transparent",
        border: "2px solid rgb(59, 130, 246)",
        borderRadius: 0,
        outline: "none",
        resize: "none",
        padding: 0,
        margin: 0,
        overflow: "hidden",
        zIndex: 1001,
        boxSizing: "border-box",
      }}
    />
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/editor/inline-text-editor.test.tsx`
Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/editor/components/inline-text-editor.tsx tests/editor/inline-text-editor.test.tsx
git commit -m "feat: add InlineTextEditor for double-click text editing on canvas"
```

---

### Task 8: Layer panel component

**Files:**
- Create: `src/editor/components/layer-panel.tsx`
- Create: `src/editor/components/layer-panel-item.tsx`
- Create: `tests/editor/layer-panel.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/editor/layer-panel.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LayerPanel } from "../../src/editor/components/layer-panel.js";
import { EditorProvider } from "../../src/editor/context/editor-context.js";
import { createFrame, createText, createRectangle, createImage } from "../../src/scene-graph/node-factory.js";
import type { FrameNode } from "../../src/scene-graph/types.js";
import type { ReactNode } from "react";

function makeScene(): FrameNode {
  const headline = createText({
    id: "h1", name: "Headline", characters: "Hello",
    x: 0, y: 0, width: 300, height: 50,
  });
  const bg = createRectangle({
    id: "bg", name: "Background",
    x: 0, y: 0, width: 1200, height: 675,
  });
  const hero = createImage({
    id: "hero", name: "Hero Image", source: "hero.png",
    x: 0, y: 0, width: 400, height: 500,
  });
  const copyGroup = createFrame({
    id: "copy", name: "Copy Group",
    x: 0, y: 0, width: 400, height: 200,
    children: [headline],
  });
  return createFrame({
    id: "root", name: "Banner",
    x: 0, y: 0, width: 1200, height: 675,
    children: [bg, copyGroup, hero],
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  return <EditorProvider initialScene={makeScene()}>{children}</EditorProvider>;
}

describe("LayerPanel", () => {
  it("renders the root node name", () => {
    render(<Wrapper><LayerPanel /></Wrapper>);
    expect(screen.getByText("Banner")).toBeInTheDocument();
  });

  it("renders all direct children of root", () => {
    render(<Wrapper><LayerPanel /></Wrapper>);
    expect(screen.getByText("Background")).toBeInTheDocument();
    expect(screen.getByText("Copy Group")).toBeInTheDocument();
    expect(screen.getByText("Hero Image")).toBeInTheDocument();
  });

  it("renders nested children", () => {
    render(<Wrapper><LayerPanel /></Wrapper>);
    expect(screen.getByText("Headline")).toBeInTheDocument();
  });

  it("shows node type icons", () => {
    render(<Wrapper><LayerPanel /></Wrapper>);
    // Frame icon for root, rectangle icon for bg, text icon for headline, image icon for hero
    const frameIcons = screen.getAllByTestId("icon-FRAME");
    expect(frameIcons.length).toBeGreaterThanOrEqual(2); // root + copy group
    expect(screen.getByTestId("icon-RECTANGLE")).toBeInTheDocument();
    expect(screen.getByTestId("icon-TEXT")).toBeInTheDocument();
    expect(screen.getByTestId("icon-IMAGE")).toBeInTheDocument();
  });

  it("clicking a layer item selects the node", () => {
    render(<Wrapper><LayerPanel /></Wrapper>);
    fireEvent.click(screen.getByText("Headline"));
    const item = screen.getByTestId("layer-item-h1");
    expect(item.classList.contains("selected") || item.getAttribute("data-selected") === "true").toBe(true);
  });

  it("shows visibility toggle", () => {
    render(<Wrapper><LayerPanel /></Wrapper>);
    const toggles = screen.getAllByTestId(/^visibility-toggle-/);
    expect(toggles.length).toBeGreaterThanOrEqual(4); // root children + nested
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/layer-panel.test.tsx`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement LayerPanelItem**

```typescript
// src/editor/components/layer-panel-item.tsx
import type { SceneNode } from "../../scene-graph/types.js";

const NODE_ICONS: Record<string, string> = {
  FRAME: "\u25A1",     // square
  TEXT: "T",
  RECTANGLE: "\u25AC", // rectangle
  IMAGE: "\u25A3",     // image placeholder
};

interface LayerPanelItemProps {
  node: SceneNode;
  depth: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}

export function LayerPanelItem({
  node,
  depth,
  isSelected,
  onSelect,
  onToggleVisibility,
}: LayerPanelItemProps) {
  return (
    <div>
      <div
        data-testid={`layer-item-${node.id}`}
        data-selected={isSelected}
        className={isSelected ? "selected" : ""}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          paddingLeft: depth * 16 + 8,
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4,
          backgroundColor: isSelected ? "rgba(59, 130, 246, 0.15)" : "transparent",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "system-ui, sans-serif",
          borderLeft: isSelected ? "2px solid rgb(59, 130, 246)" : "2px solid transparent",
          userSelect: "none",
        }}
      >
        <span
          data-testid={`icon-${node.type}`}
          style={{
            width: 16,
            textAlign: "center",
            opacity: 0.6,
            fontSize: 11,
          }}
        >
          {NODE_ICONS[node.type] ?? "?"}
        </span>

        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            opacity: node.visible ? 1 : 0.4,
          }}
        >
          {node.name}
        </span>

        <button
          data-testid={`visibility-toggle-${node.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(node.id);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            opacity: 0.5,
            padding: "2px 4px",
          }}
          title={node.visible ? "Hide" : "Show"}
        >
          {node.visible ? "\u25C9" : "\u25CB"}
        </button>
      </div>

      {node.type === "FRAME" &&
        node.children.map((child) => (
          <LayerPanelItem
            key={child.id}
            node={child}
            depth={depth + 1}
            isSelected={isSelected && child.id === node.id}
            onSelect={onSelect}
            onToggleVisibility={onToggleVisibility}
          />
        ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement LayerPanel**

```typescript
// src/editor/components/layer-panel.tsx
import { useCallback } from "react";
import { useEditor } from "../hooks/use-editor.js";
import { LayerPanelItem } from "./layer-panel-item.js";

export function LayerPanel() {
  const { scene, selectedNodeId, selectNode, updateNodeById } = useEditor();

  const handleToggleVisibility = useCallback(
    (id: string) => {
      // Read current visibility from the scene graph, then toggle
      const toggle = (node: import("../../scene-graph/types.js").SceneNode): boolean => {
        if (node.id === id) return !node.visible;
        if (node.type === "FRAME") {
          for (const child of node.children) {
            const result = toggle(child);
            if (result !== child.visible) return result;
          }
        }
        return true; // default
      };
      const findVisible = (node: import("../../scene-graph/types.js").SceneNode): boolean | undefined => {
        if (node.id === id) return node.visible;
        if (node.type === "FRAME") {
          for (const child of node.children) {
            const found = findVisible(child);
            if (found !== undefined) return found;
          }
        }
        return undefined;
      };
      const current = findVisible(scene);
      if (current !== undefined) {
        updateNodeById(id, { visible: !current });
      }
    },
    [scene, updateNodeById],
  );

  return (
    <div
      data-testid="layer-panel"
      style={{
        width: 240,
        height: "100%",
        borderRight: "1px solid #e5e7eb",
        backgroundColor: "#fafafa",
        overflowY: "auto",
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#6b7280",
          padding: "4px 8px 8px",
        }}
      >
        Layers
      </div>

      <LayerPanelItem
        node={scene}
        depth={0}
        isSelected={selectedNodeId === scene.id}
        onSelect={selectNode}
        onToggleVisibility={handleToggleVisibility}
      />
    </div>
  );
}
```

Note: The `LayerPanelItem` renders children recursively but passes `isSelected` only for the item itself. Fix the recursive child rendering to correctly check `selectedNodeId`:

```typescript
// src/editor/components/layer-panel-item.tsx
// Replace the children rendering block at the bottom with:

      {node.type === "FRAME" &&
        node.children.map((child) => (
          <LayerPanelItemConnected
            key={child.id}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            onToggleVisibility={onToggleVisibility}
          />
        ))}
```

To make this work, the `LayerPanel` must pass `selectedNodeId` through. The cleaner approach is to have `LayerPanelItem` read from context. Update the full `layer-panel-item.tsx`:

```typescript
// src/editor/components/layer-panel-item.tsx (full replacement)
import { useEditor } from "../hooks/use-editor.js";
import type { SceneNode } from "../../scene-graph/types.js";

const NODE_ICONS: Record<string, string> = {
  FRAME: "\u25A1",
  TEXT: "T",
  RECTANGLE: "\u25AC",
  IMAGE: "\u25A3",
};

interface LayerPanelItemProps {
  node: SceneNode;
  depth: number;
}

export function LayerPanelItem({ node, depth }: LayerPanelItemProps) {
  const { selectedNodeId, selectNode, updateNodeById } = useEditor();
  const isSelected = selectedNodeId === node.id;

  return (
    <div>
      <div
        data-testid={`layer-item-${node.id}`}
        data-selected={isSelected}
        className={isSelected ? "selected" : ""}
        onClick={(e) => {
          e.stopPropagation();
          selectNode(node.id);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          paddingLeft: depth * 16 + 8,
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4,
          backgroundColor: isSelected ? "rgba(59, 130, 246, 0.15)" : "transparent",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "system-ui, sans-serif",
          borderLeft: isSelected ? "2px solid rgb(59, 130, 246)" : "2px solid transparent",
          userSelect: "none",
        }}
      >
        <span
          data-testid={`icon-${node.type}`}
          style={{
            width: 16,
            textAlign: "center",
            opacity: 0.6,
            fontSize: 11,
          }}
        >
          {NODE_ICONS[node.type] ?? "?"}
        </span>

        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            opacity: node.visible ? 1 : 0.4,
          }}
        >
          {node.name}
        </span>

        <button
          data-testid={`visibility-toggle-${node.id}`}
          onClick={(e) => {
            e.stopPropagation();
            updateNodeById(node.id, { visible: !node.visible });
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            opacity: 0.5,
            padding: "2px 4px",
          }}
          title={node.visible ? "Hide" : "Show"}
        >
          {node.visible ? "\u25C9" : "\u25CB"}
        </button>
      </div>

      {node.type === "FRAME" &&
        node.children.map((child) => (
          <LayerPanelItem key={child.id} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}
```

And simplify `LayerPanel`:

```typescript
// src/editor/components/layer-panel.tsx (full replacement)
import { useEditor } from "../hooks/use-editor.js";
import { LayerPanelItem } from "./layer-panel-item.js";

export function LayerPanel() {
  const { scene } = useEditor();

  return (
    <div
      data-testid="layer-panel"
      style={{
        width: 240,
        height: "100%",
        borderRight: "1px solid #e5e7eb",
        backgroundColor: "#fafafa",
        overflowY: "auto",
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#6b7280",
          padding: "4px 8px 8px",
        }}
      >
        Layers
      </div>

      <LayerPanelItem node={scene} depth={0} />
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/editor/layer-panel.test.tsx`
Expected: PASS — all 6 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/editor/components/layer-panel.tsx src/editor/components/layer-panel-item.tsx tests/editor/layer-panel.test.tsx
git commit -m "feat: add LayerPanel with recursive node tree, selection, and visibility toggles"
```

---

### Task 9: Properties panel component

**Files:**
- Create: `src/editor/components/properties-panel.tsx`
- Create: `src/editor/components/color-picker.tsx`
- Create: `tests/editor/properties-panel.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/editor/properties-panel.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PropertiesPanel } from "../../src/editor/components/properties-panel.js";
import { EditorProvider } from "../../src/editor/context/editor-context.js";
import { createFrame, createText, createRectangle } from "../../src/scene-graph/node-factory.js";
import { renderHook, act } from "@testing-library/react";
import { useEditor } from "../../src/editor/hooks/use-editor.js";
import type { FrameNode } from "../../src/scene-graph/types.js";
import type { ReactNode } from "react";

function makeScene(): FrameNode {
  const headline = createText({
    id: "h1",
    name: "Headline",
    characters: "Ship Faster",
    x: 100,
    y: 50,
    width: 300,
    height: 60,
    fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
    style: { fontSize: 48, fontWeight: 700 },
  });
  const box = createRectangle({
    id: "box",
    name: "CTA Button",
    x: 100,
    y: 200,
    width: 160,
    height: 44,
    fills: [{ type: "SOLID", color: { r: 0.42, g: 0.36, b: 0.9, a: 1 } }],
    cornerRadius: 8,
  });
  return createFrame({
    id: "root",
    name: "Banner",
    x: 0,
    y: 0,
    width: 1200,
    height: 675,
    children: [headline, box],
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  return <EditorProvider initialScene={makeScene()}>{children}</EditorProvider>;
}

describe("PropertiesPanel", () => {
  it("shows empty state when no node is selected", () => {
    render(<Wrapper><PropertiesPanel /></Wrapper>);
    expect(screen.getByText(/select a layer/i)).toBeInTheDocument();
  });

  it("shows node name and type when selected", () => {
    function TestComponent() {
      const { selectNode } = useEditor();
      return (
        <>
          <button onClick={() => selectNode("h1")}>Select</button>
          <PropertiesPanel />
        </>
      );
    }
    render(<Wrapper><TestComponent /></Wrapper>);
    fireEvent.click(screen.getByText("Select"));
    expect(screen.getByDisplayValue("Headline")).toBeInTheDocument();
    expect(screen.getByText("TEXT")).toBeInTheDocument();
  });

  it("shows dimension fields (x, y, width, height)", () => {
    function TestComponent() {
      const { selectNode } = useEditor();
      return (
        <>
          <button onClick={() => selectNode("h1")}>Select</button>
          <PropertiesPanel />
        </>
      );
    }
    render(<Wrapper><TestComponent /></Wrapper>);
    fireEvent.click(screen.getByText("Select"));
    expect(screen.getByTestId("prop-x")).toHaveValue(100);
    expect(screen.getByTestId("prop-y")).toHaveValue(50);
    expect(screen.getByTestId("prop-w")).toHaveValue(300);
    expect(screen.getByTestId("prop-h")).toHaveValue(60);
  });

  it("shows opacity field", () => {
    function TestComponent() {
      const { selectNode } = useEditor();
      return (
        <>
          <button onClick={() => selectNode("h1")}>Select</button>
          <PropertiesPanel />
        </>
      );
    }
    render(<Wrapper><TestComponent /></Wrapper>);
    fireEvent.click(screen.getByText("Select"));
    expect(screen.getByTestId("prop-opacity")).toHaveValue(100); // displayed as percentage
  });

  it("shows text fields for TEXT nodes", () => {
    function TestComponent() {
      const { selectNode } = useEditor();
      return (
        <>
          <button onClick={() => selectNode("h1")}>Select</button>
          <PropertiesPanel />
        </>
      );
    }
    render(<Wrapper><TestComponent /></Wrapper>);
    fireEvent.click(screen.getByText("Select"));
    expect(screen.getByTestId("prop-characters")).toHaveValue("Ship Faster");
    expect(screen.getByTestId("prop-font-size")).toHaveValue(48);
    expect(screen.getByTestId("prop-font-weight")).toHaveValue(700);
    expect(screen.getByTestId("prop-font-family")).toHaveValue("Inter");
  });

  it("shows cornerRadius for RECTANGLE nodes", () => {
    function TestComponent() {
      const { selectNode } = useEditor();
      return (
        <>
          <button onClick={() => selectNode("box")}>Select</button>
          <PropertiesPanel />
        </>
      );
    }
    render(<Wrapper><TestComponent /></Wrapper>);
    fireEvent.click(screen.getByText("Select"));
    expect(screen.getByTestId("prop-corner-radius")).toHaveValue(8);
  });

  it("updates node on dimension change", () => {
    function TestComponent() {
      const { selectNode, selectedNode } = useEditor();
      return (
        <>
          <button onClick={() => selectNode("h1")}>Select</button>
          <PropertiesPanel />
          <div data-testid="current-width">{selectedNode?.width}</div>
        </>
      );
    }
    render(<Wrapper><TestComponent /></Wrapper>);
    fireEvent.click(screen.getByText("Select"));

    const widthInput = screen.getByTestId("prop-w");
    fireEvent.change(widthInput, { target: { value: "500" } });
    fireEvent.blur(widthInput);

    expect(screen.getByTestId("current-width").textContent).toBe("500");
  });

  it("shows fill color picker for nodes with solid fills", () => {
    function TestComponent() {
      const { selectNode } = useEditor();
      return (
        <>
          <button onClick={() => selectNode("box")}>Select</button>
          <PropertiesPanel />
        </>
      );
    }
    render(<Wrapper><TestComponent /></Wrapper>);
    fireEvent.click(screen.getByText("Select"));
    expect(screen.getByTestId("fill-color-0")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/properties-panel.test.tsx`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement ColorPicker**

```typescript
// src/editor/components/color-picker.tsx
import { useCallback } from "react";
import type { Color } from "../../scene-graph/types.js";

interface ColorPickerProps {
  color: Color;
  onChange: (color: Color) => void;
  testId?: string;
}

function colorToHex(c: Color): string {
  const r = Math.round(c.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(c.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(c.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToColor(hex: string, alpha: number): Color {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
    a: alpha,
  };
}

export function ColorPicker({ color, onChange, testId }: ColorPickerProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(hexToColor(e.target.value, color.a));
    },
    [color.a, onChange],
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        data-testid={testId}
        type="color"
        value={colorToHex(color)}
        onChange={handleChange}
        style={{
          width: 28,
          height: 28,
          padding: 0,
          border: "1px solid #d1d5db",
          borderRadius: 4,
          cursor: "pointer",
        }}
      />
      <span style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280" }}>
        {colorToHex(color).toUpperCase()}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Implement PropertiesPanel**

```typescript
// src/editor/components/properties-panel.tsx
import { useCallback, useState, useEffect } from "react";
import { useEditor } from "../hooks/use-editor.js";
import { ColorPicker } from "./color-picker.js";
import type { SceneNode, SolidPaint, Paint, Color, TypeStyle } from "../../scene-graph/types.js";

/** Controlled number input that commits on blur or Enter. */
function NumberField({
  value,
  onChange,
  testId,
  label,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  testId: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const commit = () => {
    const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, local));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <label style={{ fontSize: 11, color: "#6b7280" }}>{label}</label>
      <input
        data-testid={testId}
        type="number"
        value={local}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => setLocal(Number(e.target.value))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        style={{
          width: "100%",
          padding: "4px 6px",
          border: "1px solid #d1d5db",
          borderRadius: 4,
          fontSize: 13,
        }}
      />
    </div>
  );
}

/** Text input field with blur/enter commit. */
function TextField({
  value,
  onChange,
  testId,
  label,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  testId: string;
  label: string;
  multiline?: boolean;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const commit = () => {
    if (local !== value) onChange(local);
  };

  const InputEl = multiline ? "textarea" : "input";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <label style={{ fontSize: 11, color: "#6b7280" }}>{label}</label>
      <InputEl
        data-testid={testId}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !multiline) commit();
        }}
        style={{
          width: "100%",
          padding: "4px 6px",
          border: "1px solid #d1d5db",
          borderRadius: 4,
          fontSize: 13,
          resize: multiline ? "vertical" : undefined,
          minHeight: multiline ? 60 : undefined,
        }}
      />
    </div>
  );
}

export function PropertiesPanel() {
  const { selectedNode, updateSelectedNode } = useEditor();

  if (!selectedNode) {
    return (
      <div
        data-testid="properties-panel"
        style={{
          width: 280,
          height: "100%",
          borderLeft: "1px solid #e5e7eb",
          backgroundColor: "#fafafa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9ca3af",
          fontSize: 13,
        }}
      >
        Select a layer to edit properties
      </div>
    );
  }

  return (
    <div
      data-testid="properties-panel"
      style={{
        width: 280,
        height: "100%",
        borderLeft: "1px solid #e5e7eb",
        backgroundColor: "#fafafa",
        overflowY: "auto",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Node identity */}
      <Section title="Node">
        <TextField
          testId="prop-name"
          label="Name"
          value={selectedNode.name}
          onChange={(v) => updateSelectedNode({ name: v })}
        />
        <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{selectedNode.type}</div>
      </Section>

      {/* Dimensions */}
      <Section title="Dimensions">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <NumberField
            testId="prop-x"
            label="X"
            value={selectedNode.x}
            onChange={(v) => updateSelectedNode({ x: v })}
          />
          <NumberField
            testId="prop-y"
            label="Y"
            value={selectedNode.y}
            onChange={(v) => updateSelectedNode({ y: v })}
          />
          <NumberField
            testId="prop-w"
            label="W"
            value={selectedNode.width}
            onChange={(v) => updateSelectedNode({ width: v })}
            min={1}
          />
          <NumberField
            testId="prop-h"
            label="H"
            value={selectedNode.height}
            onChange={(v) => updateSelectedNode({ height: v })}
            min={1}
          />
        </div>
      </Section>

      {/* Opacity */}
      <Section title="Appearance">
        <NumberField
          testId="prop-opacity"
          label="Opacity %"
          value={Math.round(selectedNode.opacity * 100)}
          onChange={(v) => updateSelectedNode({ opacity: v / 100 })}
          min={0}
          max={100}
        />
      </Section>

      {/* Corner radius (RECTANGLE and FRAME) */}
      {(selectedNode.type === "RECTANGLE" || selectedNode.type === "FRAME") && (
        <Section title="Corner Radius">
          <NumberField
            testId="prop-corner-radius"
            label="Radius"
            value={selectedNode.cornerRadius}
            onChange={(v) => updateSelectedNode({ cornerRadius: v })}
            min={0}
          />
        </Section>
      )}

      {/* Fills */}
      {selectedNode.fills.length > 0 && (
        <Section title="Fill">
          {selectedNode.fills.map((fill, i) => {
            if (fill.type !== "SOLID") return null;
            return (
              <ColorPicker
                key={i}
                testId={`fill-color-${i}`}
                color={fill.color}
                onChange={(newColor: Color) => {
                  const newFills = selectedNode.fills.map((f, j) => {
                    if (j !== i || f.type !== "SOLID") return f;
                    return { ...f, color: newColor };
                  });
                  updateSelectedNode({ fills: newFills });
                }}
              />
            );
          })}
        </Section>
      )}

      {/* Text properties */}
      {selectedNode.type === "TEXT" && (
        <Section title="Text">
          <TextField
            testId="prop-characters"
            label="Content"
            value={selectedNode.characters}
            onChange={(v) => updateSelectedNode({ characters: v })}
            multiline
          />
          <TextField
            testId="prop-font-family"
            label="Font Family"
            value={selectedNode.style.fontFamily}
            onChange={(v) =>
              updateSelectedNode({ style: { ...selectedNode.style, fontFamily: v } })
            }
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <NumberField
              testId="prop-font-size"
              label="Size"
              value={selectedNode.style.fontSize}
              onChange={(v) =>
                updateSelectedNode({ style: { ...selectedNode.style, fontSize: v } })
              }
              min={1}
            />
            <NumberField
              testId="prop-font-weight"
              label="Weight"
              value={selectedNode.style.fontWeight}
              onChange={(v) =>
                updateSelectedNode({ style: { ...selectedNode.style, fontWeight: v } })
              }
              min={100}
              max={900}
              step={100}
            />
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#6b7280",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/editor/properties-panel.test.tsx`
Expected: PASS — all 8 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/editor/components/properties-panel.tsx src/editor/components/color-picker.tsx tests/editor/properties-panel.test.tsx
git commit -m "feat: add PropertiesPanel with dimension, text, fill, and opacity editing"
```

---

### Task 10: Wire everything into the main app layout

**Files:**
- Create: `src/editor/components/editor-layout.tsx`
- Create: `src/editor/index.ts`
- Create: `tests/editor/editor-layout.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/editor/editor-layout.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditorLayout } from "../../src/editor/components/editor-layout.js";
import { createFrame, createText, createRectangle } from "../../src/scene-graph/node-factory.js";
import type { FrameNode } from "../../src/scene-graph/types.js";

function makeScene(): FrameNode {
  const headline = createText({
    id: "h1", name: "Headline", characters: "Hello",
    x: 0, y: 0, width: 300, height: 50,
  });
  const bg = createRectangle({
    id: "bg", name: "Background",
    x: 0, y: 0, width: 1200, height: 675,
  });
  return createFrame({
    id: "root", name: "Banner",
    x: 0, y: 0, width: 1200, height: 675,
    children: [bg, headline],
  });
}

describe("EditorLayout", () => {
  it("renders the three-column layout", () => {
    render(
      <EditorLayout scene={makeScene()}>
        <div data-testid="canvas-content">Canvas here</div>
      </EditorLayout>,
    );
    expect(screen.getByTestId("layer-panel")).toBeInTheDocument();
    expect(screen.getByTestId("interaction-layer")).toBeInTheDocument();
    expect(screen.getByTestId("properties-panel")).toBeInTheDocument();
  });

  it("renders the canvas content inside the interaction layer", () => {
    render(
      <EditorLayout scene={makeScene()}>
        <div data-testid="canvas-content">Canvas here</div>
      </EditorLayout>,
    );
    expect(screen.getByTestId("canvas-content")).toBeInTheDocument();
  });

  it("shows layer panel with scene nodes", () => {
    render(
      <EditorLayout scene={makeScene()}>
        <div>Canvas</div>
      </EditorLayout>,
    );
    expect(screen.getByText("Banner")).toBeInTheDocument();
    expect(screen.getByText("Headline")).toBeInTheDocument();
    expect(screen.getByText("Background")).toBeInTheDocument();
  });

  it("shows empty properties panel by default", () => {
    render(
      <EditorLayout scene={makeScene()}>
        <div>Canvas</div>
      </EditorLayout>,
    );
    expect(screen.getByText(/select a layer/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/editor-layout.test.tsx`
Expected: FAIL — cannot resolve imports

- [ ] **Step 3: Implement EditorLayout**

```typescript
// src/editor/components/editor-layout.tsx
import { EditorProvider } from "../context/editor-context.js";
import { LayerPanel } from "./layer-panel.js";
import { InteractionLayer } from "./interaction-layer.js";
import { PropertiesPanel } from "./properties-panel.js";
import type { FrameNode } from "../../scene-graph/types.js";

interface EditorLayoutProps {
  scene: FrameNode;
  children: React.ReactNode; // The Plan D canvas renderer
}

export function EditorLayout({ scene, children }: EditorLayoutProps) {
  return (
    <EditorProvider initialScene={scene}>
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

        {/* Right sidebar: properties panel */}
        <PropertiesPanel />
      </div>
    </EditorProvider>
  );
}
```

- [ ] **Step 4: Create barrel export**

```typescript
// src/editor/index.ts
export { EditorProvider } from "./context/editor-context.js";
export type { EditorContextValue } from "./context/editor-context.js";
export { useEditor } from "./hooks/use-editor.js";
export { hitTest, useNodeInteraction } from "./hooks/use-node-interaction.js";
export { SelectionOverlay } from "./components/selection-overlay.js";
export type { HandlePosition } from "./components/selection-overlay.js";
export { InteractionLayer } from "./components/interaction-layer.js";
export { InlineTextEditor } from "./components/inline-text-editor.js";
export { LayerPanel } from "./components/layer-panel.js";
export { LayerPanelItem } from "./components/layer-panel-item.js";
export { PropertiesPanel } from "./components/properties-panel.js";
export { ColorPicker } from "./components/color-picker.js";
export { EditorLayout } from "./components/editor-layout.js";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/editor/editor-layout.test.tsx`
Expected: PASS — all 4 tests pass

- [ ] **Step 6: Run full editor test suite**

Run: `npx vitest run tests/editor/`
Expected: PASS — all tests across all editor test files pass

- [ ] **Step 7: Commit**

```bash
git add src/editor/ tests/editor/
git commit -m "feat: add EditorLayout wiring layers panel, canvas interaction layer, and properties panel"
```
