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
