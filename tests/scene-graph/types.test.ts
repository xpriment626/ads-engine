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
