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
