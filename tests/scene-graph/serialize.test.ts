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
