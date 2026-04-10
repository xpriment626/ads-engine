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
