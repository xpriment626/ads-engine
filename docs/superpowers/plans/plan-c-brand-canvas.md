# Plan C: Brand Canvas / Project Model

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the filesystem-backed project model, brand canvas asset management, canvas-to-LLM context serialization, and per-project generation history.

**Architecture:** Each project is a directory under `projects/` containing identity JSON, a canvas with uploaded assets and metadata, and a generation history. All persistence is filesystem-based (no database). Zod schemas validate all JSON at read/write boundaries. A context serializer produces a structured representation of the entire canvas that an LLM agent can consume as input to the composition pipeline.

**Tech Stack:** TypeScript, zod, Vitest

**Phase:** 1 (no dependencies — can run in parallel with Plans A and B)

**Spec reference:** [2026-04-09-brandouble-mvp-design.md](../specs/2026-04-09-brandouble-mvp-design.md)

---

## File structure

```
src/
  project/
    schemas.ts            # Zod schemas: ProjectConfig, AssetEntry, CanvasMetadata, etc.
    project-crud.ts       # create, read, list, delete projects
    asset-manager.ts      # add, remove, list, update canvas assets
    context-serializer.ts # serialize canvas → LLM-consumable context
    color-extract.ts      # extract dominant colors from images via sharp
    history.ts            # create, list, read generation history records
    index.ts              # Barrel export
tests/
  project/
    schemas.test.ts
    project-crud.test.ts
    asset-manager.test.ts
    context-serializer.test.ts
    color-extract.test.ts
    history.test.ts
```

---

### Task 1: Install sharp dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install sharp**

```bash
npm install sharp
npm install -D @types/sharp
```

- [ ] **Step 2: Verify installation**

```bash
node -e "const sharp = require('sharp'); console.log('sharp version:', sharp.versions.sharp)"
```

Expected: prints sharp version without errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add sharp for image color extraction"
```

---

### Task 2: Project schemas (Zod)

**Files:**
- Create: `src/project/schemas.ts`
- Create: `tests/project/schemas.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/project/schemas.test.ts
import { describe, it, expect } from "vitest";
import {
  ProjectConfigSchema,
  AssetEntrySchema,
  CanvasMetadataSchema,
  OutputSpecSchema,
  GenerationRecordSchema,
  type ProjectConfig,
  type AssetEntry,
  type CanvasMetadata,
  type OutputSpec,
  type GenerationRecord,
} from "../../src/project/schemas.js";

describe("ProjectConfigSchema", () => {
  it("parses a valid project config", () => {
    const input = {
      id: "acme-protocol",
      name: "Acme Protocol",
      description: "DeFi lending launching Q2",
      createdAt: "2026-04-08T00:00:00.000Z",
      updatedAt: "2026-04-08T00:00:00.000Z",
      outputSpecs: [
        { channel: "twitter", width: 1200, height: 675 },
        { channel: "linkedin", width: 1200, height: 627 },
      ],
    };
    const result = ProjectConfigSchema.parse(input);
    expect(result.id).toBe("acme-protocol");
    expect(result.outputSpecs).toHaveLength(2);
    expect(result.outputSpecs[0].channel).toBe("twitter");
  });

  it("rejects missing required fields", () => {
    expect(() => ProjectConfigSchema.parse({ id: "x" })).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      ProjectConfigSchema.parse({
        id: "x",
        name: "",
        createdAt: "2026-04-08T00:00:00.000Z",
        updatedAt: "2026-04-08T00:00:00.000Z",
        outputSpecs: [],
      })
    ).toThrow();
  });
});

describe("OutputSpecSchema", () => {
  it("parses a valid output spec", () => {
    const result = OutputSpecSchema.parse({
      channel: "instagram",
      width: 1080,
      height: 1080,
    });
    expect(result.channel).toBe("instagram");
    expect(result.width).toBe(1080);
  });

  it("rejects zero dimensions", () => {
    expect(() =>
      OutputSpecSchema.parse({ channel: "x", width: 0, height: 100 })
    ).toThrow();
  });

  it("accepts custom channel name", () => {
    const result = OutputSpecSchema.parse({
      channel: "custom-banner",
      width: 800,
      height: 400,
    });
    expect(result.channel).toBe("custom-banner");
  });
});

describe("AssetEntrySchema", () => {
  it("parses a valid asset entry", () => {
    const input = {
      id: "asset-001",
      filename: "logo.png",
      originalName: "acme-logo.png",
      mimeType: "image/png",
      addedAt: "2026-04-08T00:00:00.000Z",
      inferredType: "logo",
      notes: "Primary brand logo, use on light backgrounds",
      dominantColors: ["#6C5CE7", "#FFFFFF", "#1A1A2E"],
      width: 400,
      height: 120,
    };
    const result = AssetEntrySchema.parse(input);
    expect(result.id).toBe("asset-001");
    expect(result.inferredType).toBe("logo");
    expect(result.dominantColors).toHaveLength(3);
  });

  it("parses asset with minimal fields", () => {
    const input = {
      id: "asset-002",
      filename: "ref.jpg",
      originalName: "reference.jpg",
      mimeType: "image/jpeg",
      addedAt: "2026-04-08T00:00:00.000Z",
    };
    const result = AssetEntrySchema.parse(input);
    expect(result.inferredType).toBeUndefined();
    expect(result.notes).toBeUndefined();
    expect(result.dominantColors).toBeUndefined();
  });

  it("rejects missing filename", () => {
    expect(() =>
      AssetEntrySchema.parse({
        id: "x",
        originalName: "x.png",
        mimeType: "image/png",
        addedAt: "2026-04-08T00:00:00.000Z",
      })
    ).toThrow();
  });
});

describe("CanvasMetadataSchema", () => {
  it("parses valid canvas metadata", () => {
    const input = {
      assets: [
        {
          id: "asset-001",
          filename: "logo.png",
          originalName: "logo.png",
          mimeType: "image/png",
          addedAt: "2026-04-08T00:00:00.000Z",
          inferredType: "logo",
        },
      ],
      textNotes: [
        {
          id: "note-001",
          content: "Premium but approachable aesthetic",
          addedAt: "2026-04-08T00:00:00.000Z",
        },
      ],
      colorValues: [
        {
          id: "color-001",
          hex: "#6C5CE7",
          label: "Primary brand purple",
          addedAt: "2026-04-08T00:00:00.000Z",
        },
      ],
    };
    const result = CanvasMetadataSchema.parse(input);
    expect(result.assets).toHaveLength(1);
    expect(result.textNotes).toHaveLength(1);
    expect(result.colorValues).toHaveLength(1);
  });

  it("parses empty canvas", () => {
    const result = CanvasMetadataSchema.parse({
      assets: [],
      textNotes: [],
      colorValues: [],
    });
    expect(result.assets).toEqual([]);
  });
});

describe("GenerationRecordSchema", () => {
  it("parses a valid generation record", () => {
    const input = {
      id: "gen-001",
      createdAt: "2026-04-08T12:00:00.000Z",
      brief: {
        userPrompt: "Launch announcement banner for DeFi lending platform",
        canvasContext: "serialized canvas context string",
      },
      result: {
        agentReasoning: "Selected hero-device template for app launch...",
        modelChoices: [
          { purpose: "hero-illustration", model: "flux-2-pro" },
        ],
        status: "completed",
      },
      outputs: [
        {
          channel: "twitter",
          width: 1200,
          height: 675,
          sceneGraphFile: "banners/twitter-1200x675.json",
          renderFile: "renders/twitter-1200x675.png",
        },
      ],
    };
    const result = GenerationRecordSchema.parse(input);
    expect(result.id).toBe("gen-001");
    expect(result.result.status).toBe("completed");
    expect(result.outputs).toHaveLength(1);
  });

  it("parses a failed generation record", () => {
    const input = {
      id: "gen-002",
      createdAt: "2026-04-08T13:00:00.000Z",
      brief: {
        userPrompt: "Test",
        canvasContext: "",
      },
      result: {
        agentReasoning: "Canvas is empty, cannot generate.",
        modelChoices: [],
        status: "failed",
        error: "Insufficient canvas context",
      },
      outputs: [],
    };
    const result = GenerationRecordSchema.parse(input);
    expect(result.result.status).toBe("failed");
    expect(result.result.error).toBe("Insufficient canvas context");
  });

  it("rejects invalid status", () => {
    expect(() =>
      GenerationRecordSchema.parse({
        id: "gen-x",
        createdAt: "2026-04-08T00:00:00.000Z",
        brief: { userPrompt: "x", canvasContext: "" },
        result: {
          agentReasoning: "",
          modelChoices: [],
          status: "invalid-status",
        },
        outputs: [],
      })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/project/schemas.test.ts`
Expected: FAIL — cannot resolve imports from `../../src/project/schemas.js`

- [ ] **Step 3: Implement schemas**

```typescript
// src/project/schemas.ts
import { z } from "zod";

// --- Output spec ---

export const OutputSpecSchema = z.object({
  channel: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export type OutputSpec = z.infer<typeof OutputSpecSchema>;

// --- Project config ---

export const ProjectConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  outputSpecs: z.array(OutputSpecSchema),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

// --- Asset entry ---

export const AssetEntrySchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  addedAt: z.string().datetime(),
  inferredType: z
    .enum([
      "logo",
      "screenshot",
      "illustration",
      "icon",
      "photo",
      "reference-creative",
      "svg",
      "pdf",
      "other",
    ])
    .optional(),
  notes: z.string().optional(),
  dominantColors: z.array(z.string()).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type AssetEntry = z.infer<typeof AssetEntrySchema>;

// --- Text note (freeform context on the canvas) ---

export const TextNoteSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  addedAt: z.string().datetime(),
});

export type TextNote = z.infer<typeof TextNoteSchema>;

// --- Color value (explicit brand color on the canvas) ---

export const ColorValueSchema = z.object({
  id: z.string().min(1),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  label: z.string().optional(),
  addedAt: z.string().datetime(),
});

export type ColorValue = z.infer<typeof ColorValueSchema>;

// --- Canvas metadata ---

export const CanvasMetadataSchema = z.object({
  assets: z.array(AssetEntrySchema),
  textNotes: z.array(TextNoteSchema),
  colorValues: z.array(ColorValueSchema),
});

export type CanvasMetadata = z.infer<typeof CanvasMetadataSchema>;

// --- Generation record ---

export const GenerationBriefSchema = z.object({
  userPrompt: z.string(),
  canvasContext: z.string(),
});

export type GenerationBrief = z.infer<typeof GenerationBriefSchema>;

export const ModelChoiceSchema = z.object({
  purpose: z.string(),
  model: z.string(),
});

export type ModelChoice = z.infer<typeof ModelChoiceSchema>;

export const GenerationResultSchema = z.object({
  agentReasoning: z.string(),
  modelChoices: z.array(ModelChoiceSchema),
  status: z.enum(["completed", "failed", "in-progress"]),
  error: z.string().optional(),
});

export type GenerationResult = z.infer<typeof GenerationResultSchema>;

export const GenerationOutputSchema = z.object({
  channel: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sceneGraphFile: z.string(),
  renderFile: z.string().optional(),
});

export type GenerationOutput = z.infer<typeof GenerationOutputSchema>;

export const GenerationRecordSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  brief: GenerationBriefSchema,
  result: GenerationResultSchema,
  outputs: z.array(GenerationOutputSchema),
});

export type GenerationRecord = z.infer<typeof GenerationRecordSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/project/schemas.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/project/schemas.ts tests/project/schemas.test.ts
git commit -m "feat: add project model zod schemas (ProjectConfig, AssetEntry, CanvasMetadata, GenerationRecord)"
```

---

### Task 3: Project CRUD operations

**Files:**
- Create: `src/project/project-crud.ts`
- Create: `tests/project/project-crud.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/project/project-crud.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createProject,
  readProject,
  listProjects,
  deleteProject,
  updateProject,
} from "../../src/project/project-crud.js";
import type { OutputSpec } from "../../src/project/schemas.js";

const TEST_ROOT = join(import.meta.dirname, "../../.test-projects-crud");

beforeEach(() => {
  mkdirSync(TEST_ROOT, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
});

describe("createProject", () => {
  it("creates project directory with correct structure", () => {
    const config = createProject(TEST_ROOT, {
      name: "Acme Protocol",
      description: "DeFi lending",
      outputSpecs: [{ channel: "twitter", width: 1200, height: 675 }],
    });

    expect(config.id).toMatch(/^acme-protocol$/);
    expect(config.name).toBe("Acme Protocol");
    expect(config.outputSpecs).toHaveLength(1);

    const projectDir = join(TEST_ROOT, config.id);
    expect(existsSync(projectDir)).toBe(true);
    expect(existsSync(join(projectDir, "project.json"))).toBe(true);
    expect(existsSync(join(projectDir, "canvas", "assets"))).toBe(true);
    expect(existsSync(join(projectDir, "canvas", "metadata.json"))).toBe(true);
    expect(existsSync(join(projectDir, "history"))).toBe(true);
  });

  it("initializes empty canvas metadata", () => {
    const config = createProject(TEST_ROOT, {
      name: "Test Brand",
      outputSpecs: [],
    });

    const metaPath = join(TEST_ROOT, config.id, "canvas", "metadata.json");
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    expect(meta.assets).toEqual([]);
    expect(meta.textNotes).toEqual([]);
    expect(meta.colorValues).toEqual([]);
  });

  it("generates unique slug from name", () => {
    const c1 = createProject(TEST_ROOT, { name: "My Brand!", outputSpecs: [] });
    expect(c1.id).toBe("my-brand");
  });

  it("appends counter for duplicate slugs", () => {
    createProject(TEST_ROOT, { name: "Acme", outputSpecs: [] });
    const c2 = createProject(TEST_ROOT, { name: "Acme", outputSpecs: [] });
    expect(c2.id).toBe("acme-2");
  });

  it("rejects empty name", () => {
    expect(() =>
      createProject(TEST_ROOT, { name: "", outputSpecs: [] })
    ).toThrow();
  });
});

describe("readProject", () => {
  it("reads a previously created project", () => {
    createProject(TEST_ROOT, {
      name: "ReadTest",
      description: "for reading",
      outputSpecs: [{ channel: "linkedin", width: 1200, height: 627 }],
    });

    const config = readProject(TEST_ROOT, "readtest");
    expect(config.name).toBe("ReadTest");
    expect(config.description).toBe("for reading");
    expect(config.outputSpecs[0].channel).toBe("linkedin");
  });

  it("throws for nonexistent project", () => {
    expect(() => readProject(TEST_ROOT, "nope")).toThrow();
  });
});

describe("listProjects", () => {
  it("returns empty array for empty root", () => {
    expect(listProjects(TEST_ROOT)).toEqual([]);
  });

  it("returns all projects sorted by name", () => {
    createProject(TEST_ROOT, { name: "Zeta", outputSpecs: [] });
    createProject(TEST_ROOT, { name: "Alpha", outputSpecs: [] });
    createProject(TEST_ROOT, { name: "Mid", outputSpecs: [] });

    const list = listProjects(TEST_ROOT);
    expect(list).toHaveLength(3);
    expect(list[0].name).toBe("Alpha");
    expect(list[1].name).toBe("Mid");
    expect(list[2].name).toBe("Zeta");
  });
});

describe("updateProject", () => {
  it("updates project fields", () => {
    createProject(TEST_ROOT, {
      name: "Original",
      outputSpecs: [],
    });

    const updated = updateProject(TEST_ROOT, "original", {
      description: "Updated description",
      outputSpecs: [{ channel: "instagram", width: 1080, height: 1080 }],
    });

    expect(updated.description).toBe("Updated description");
    expect(updated.outputSpecs).toHaveLength(1);

    // Verify persisted
    const reread = readProject(TEST_ROOT, "original");
    expect(reread.description).toBe("Updated description");
  });

  it("updates updatedAt timestamp", () => {
    const created = createProject(TEST_ROOT, {
      name: "Timestamp",
      outputSpecs: [],
    });
    const originalUpdatedAt = created.updatedAt;

    // Small delay so timestamps differ
    const updated = updateProject(TEST_ROOT, "timestamp", {
      description: "changed",
    });
    expect(updated.updatedAt).not.toBe(originalUpdatedAt);
  });
});

describe("deleteProject", () => {
  it("deletes project directory", () => {
    createProject(TEST_ROOT, { name: "ToDelete", outputSpecs: [] });
    expect(existsSync(join(TEST_ROOT, "todelete"))).toBe(true);

    deleteProject(TEST_ROOT, "todelete");
    expect(existsSync(join(TEST_ROOT, "todelete"))).toBe(false);
  });

  it("throws for nonexistent project", () => {
    expect(() => deleteProject(TEST_ROOT, "ghost")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/project/project-crud.test.ts`
Expected: FAIL — cannot resolve imports from `../../src/project/project-crud.js`

- [ ] **Step 3: Implement project CRUD**

```typescript
// src/project/project-crud.ts
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import {
  ProjectConfigSchema,
  CanvasMetadataSchema,
  type ProjectConfig,
  type OutputSpec,
  type CanvasMetadata,
} from "./schemas.js";

// --- Helpers ---

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSlug(rootDir: string, base: string): string {
  if (!existsSync(join(rootDir, base))) return base;
  let counter = 2;
  while (existsSync(join(rootDir, `${base}-${counter}`))) {
    counter++;
  }
  return `${base}-${counter}`;
}

function writeJson(filePath: string, data: unknown): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

// --- Public API ---

export interface CreateProjectInput {
  name: string;
  description?: string;
  outputSpecs: OutputSpec[];
}

export function createProject(
  rootDir: string,
  input: CreateProjectInput
): ProjectConfig {
  if (!input.name || input.name.trim() === "") {
    throw new Error("Project name is required");
  }

  const baseSlug = slugify(input.name);
  if (!baseSlug) {
    throw new Error("Project name must contain at least one alphanumeric character");
  }

  const id = uniqueSlug(rootDir, baseSlug);
  const now = new Date().toISOString();

  const config: ProjectConfig = {
    id,
    name: input.name,
    description: input.description,
    createdAt: now,
    updatedAt: now,
    outputSpecs: input.outputSpecs,
  };

  // Validate with schema
  ProjectConfigSchema.parse(config);

  // Create directory structure
  const projectDir = join(rootDir, id);
  mkdirSync(projectDir, { recursive: true });
  mkdirSync(join(projectDir, "canvas", "assets"), { recursive: true });
  mkdirSync(join(projectDir, "history"), { recursive: true });

  // Write project.json
  writeJson(join(projectDir, "project.json"), config);

  // Write empty canvas metadata
  const emptyCanvas: CanvasMetadata = {
    assets: [],
    textNotes: [],
    colorValues: [],
  };
  writeJson(join(projectDir, "canvas", "metadata.json"), emptyCanvas);

  return config;
}

export function readProject(rootDir: string, projectId: string): ProjectConfig {
  const configPath = join(rootDir, projectId, "project.json");
  if (!existsSync(configPath)) {
    throw new Error(`Project "${projectId}" not found`);
  }
  return ProjectConfigSchema.parse(readJson(configPath));
}

export function listProjects(rootDir: string): ProjectConfig[] {
  if (!existsSync(rootDir)) return [];

  const entries = readdirSync(rootDir, { withFileTypes: true });
  const projects: ProjectConfig[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const configPath = join(rootDir, entry.name, "project.json");
    if (!existsSync(configPath)) continue;
    try {
      projects.push(ProjectConfigSchema.parse(readJson(configPath)));
    } catch {
      // Skip malformed projects
    }
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  outputSpecs?: OutputSpec[];
}

export function updateProject(
  rootDir: string,
  projectId: string,
  input: UpdateProjectInput
): ProjectConfig {
  const current = readProject(rootDir, projectId);

  const updated: ProjectConfig = {
    ...current,
    name: input.name ?? current.name,
    description: input.description ?? current.description,
    outputSpecs: input.outputSpecs ?? current.outputSpecs,
    updatedAt: new Date().toISOString(),
  };

  ProjectConfigSchema.parse(updated);

  const configPath = join(rootDir, projectId, "project.json");
  writeJson(configPath, updated);

  return updated;
}

export function deleteProject(rootDir: string, projectId: string): void {
  const projectDir = join(rootDir, projectId);
  if (!existsSync(projectDir)) {
    throw new Error(`Project "${projectId}" not found`);
  }
  rmSync(projectDir, { recursive: true, force: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/project/project-crud.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/project/project-crud.ts tests/project/project-crud.test.ts
git commit -m "feat: add project CRUD operations (create, read, list, update, delete)"
```

---

### Task 4: Asset management

**Files:**
- Create: `src/project/asset-manager.ts`
- Create: `tests/project/asset-manager.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/project/asset-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createProject } from "../../src/project/project-crud.js";
import {
  addAsset,
  removeAsset,
  listAssets,
  updateAssetMetadata,
  readCanvasMetadata,
  addTextNote,
  removeTextNote,
  addColorValue,
  removeColorValue,
} from "../../src/project/asset-manager.js";

const TEST_ROOT = join(import.meta.dirname, "../../.test-projects-assets");

let projectId: string;

beforeEach(() => {
  mkdirSync(TEST_ROOT, { recursive: true });
  const config = createProject(TEST_ROOT, {
    name: "Asset Test",
    outputSpecs: [],
  });
  projectId = config.id;
});

afterEach(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
});

describe("addAsset", () => {
  it("copies file to canvas/assets and creates metadata entry", () => {
    // Create a fake source file
    const srcFile = join(TEST_ROOT, "logo.png");
    writeFileSync(srcFile, Buffer.from("fake-png-data"));

    const entry = addAsset(TEST_ROOT, projectId, {
      sourcePath: srcFile,
      originalName: "acme-logo.png",
      mimeType: "image/png",
    });

    expect(entry.id).toMatch(/^asset-/);
    expect(entry.originalName).toBe("acme-logo.png");
    expect(entry.mimeType).toBe("image/png");

    // File was copied
    const destPath = join(
      TEST_ROOT,
      projectId,
      "canvas",
      "assets",
      entry.filename
    );
    expect(existsSync(destPath)).toBe(true);

    // Metadata was updated
    const meta = readCanvasMetadata(TEST_ROOT, projectId);
    expect(meta.assets).toHaveLength(1);
    expect(meta.assets[0].id).toBe(entry.id);
  });

  it("handles multiple assets", () => {
    const srcA = join(TEST_ROOT, "a.png");
    const srcB = join(TEST_ROOT, "b.jpg");
    writeFileSync(srcA, Buffer.from("a"));
    writeFileSync(srcB, Buffer.from("b"));

    addAsset(TEST_ROOT, projectId, {
      sourcePath: srcA,
      originalName: "a.png",
      mimeType: "image/png",
    });
    addAsset(TEST_ROOT, projectId, {
      sourcePath: srcB,
      originalName: "b.jpg",
      mimeType: "image/jpeg",
    });

    const meta = readCanvasMetadata(TEST_ROOT, projectId);
    expect(meta.assets).toHaveLength(2);
  });

  it("accepts optional inferred type and notes", () => {
    const srcFile = join(TEST_ROOT, "screen.png");
    writeFileSync(srcFile, Buffer.from("screen"));

    const entry = addAsset(TEST_ROOT, projectId, {
      sourcePath: srcFile,
      originalName: "app-screenshot.png",
      mimeType: "image/png",
      inferredType: "screenshot",
      notes: "Main product dashboard view",
    });

    expect(entry.inferredType).toBe("screenshot");
    expect(entry.notes).toBe("Main product dashboard view");
  });
});

describe("removeAsset", () => {
  it("removes asset file and metadata entry", () => {
    const srcFile = join(TEST_ROOT, "logo.png");
    writeFileSync(srcFile, Buffer.from("fake"));

    const entry = addAsset(TEST_ROOT, projectId, {
      sourcePath: srcFile,
      originalName: "logo.png",
      mimeType: "image/png",
    });

    removeAsset(TEST_ROOT, projectId, entry.id);

    const meta = readCanvasMetadata(TEST_ROOT, projectId);
    expect(meta.assets).toHaveLength(0);

    const destPath = join(
      TEST_ROOT,
      projectId,
      "canvas",
      "assets",
      entry.filename
    );
    expect(existsSync(destPath)).toBe(false);
  });

  it("throws for nonexistent asset id", () => {
    expect(() =>
      removeAsset(TEST_ROOT, projectId, "nonexistent")
    ).toThrow();
  });
});

describe("listAssets", () => {
  it("returns all asset entries", () => {
    const src = join(TEST_ROOT, "x.png");
    writeFileSync(src, Buffer.from("x"));

    addAsset(TEST_ROOT, projectId, {
      sourcePath: src,
      originalName: "x.png",
      mimeType: "image/png",
    });

    const assets = listAssets(TEST_ROOT, projectId);
    expect(assets).toHaveLength(1);
    expect(assets[0].originalName).toBe("x.png");
  });
});

describe("updateAssetMetadata", () => {
  it("updates notes and inferredType", () => {
    const src = join(TEST_ROOT, "file.svg");
    writeFileSync(src, Buffer.from("<svg></svg>"));

    const entry = addAsset(TEST_ROOT, projectId, {
      sourcePath: src,
      originalName: "icon.svg",
      mimeType: "image/svg+xml",
    });

    const updated = updateAssetMetadata(TEST_ROOT, projectId, entry.id, {
      inferredType: "icon",
      notes: "Navigation menu icon",
    });

    expect(updated.inferredType).toBe("icon");
    expect(updated.notes).toBe("Navigation menu icon");

    // Verify persisted
    const meta = readCanvasMetadata(TEST_ROOT, projectId);
    expect(meta.assets[0].notes).toBe("Navigation menu icon");
  });

  it("throws for nonexistent asset id", () => {
    expect(() =>
      updateAssetMetadata(TEST_ROOT, projectId, "ghost", { notes: "x" })
    ).toThrow();
  });
});

describe("addTextNote", () => {
  it("adds a text note to canvas metadata", () => {
    const note = addTextNote(TEST_ROOT, projectId, "Premium but approachable");

    expect(note.id).toMatch(/^note-/);
    expect(note.content).toBe("Premium but approachable");

    const meta = readCanvasMetadata(TEST_ROOT, projectId);
    expect(meta.textNotes).toHaveLength(1);
  });
});

describe("removeTextNote", () => {
  it("removes a text note by id", () => {
    const note = addTextNote(TEST_ROOT, projectId, "Some note");
    removeTextNote(TEST_ROOT, projectId, note.id);

    const meta = readCanvasMetadata(TEST_ROOT, projectId);
    expect(meta.textNotes).toHaveLength(0);
  });
});

describe("addColorValue", () => {
  it("adds a color value to canvas metadata", () => {
    const color = addColorValue(TEST_ROOT, projectId, {
      hex: "#6C5CE7",
      label: "Brand purple",
    });

    expect(color.id).toMatch(/^color-/);
    expect(color.hex).toBe("#6C5CE7");

    const meta = readCanvasMetadata(TEST_ROOT, projectId);
    expect(meta.colorValues).toHaveLength(1);
  });

  it("rejects invalid hex", () => {
    expect(() =>
      addColorValue(TEST_ROOT, projectId, { hex: "not-a-color" })
    ).toThrow();
  });
});

describe("removeColorValue", () => {
  it("removes a color value by id", () => {
    const color = addColorValue(TEST_ROOT, projectId, { hex: "#FF0000" });
    removeColorValue(TEST_ROOT, projectId, color.id);

    const meta = readCanvasMetadata(TEST_ROOT, projectId);
    expect(meta.colorValues).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/project/asset-manager.test.ts`
Expected: FAIL — cannot resolve imports from `../../src/project/asset-manager.js`

- [ ] **Step 3: Implement asset manager**

```typescript
// src/project/asset-manager.ts
import {
  copyFileSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
} from "node:fs";
import { join, extname } from "node:path";
import {
  CanvasMetadataSchema,
  AssetEntrySchema,
  TextNoteSchema,
  ColorValueSchema,
  type CanvasMetadata,
  type AssetEntry,
  type TextNote,
  type ColorValue,
} from "./schemas.js";

// --- Helpers ---

let idCounter = 0;

function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

function metadataPath(rootDir: string, projectId: string): string {
  return join(rootDir, projectId, "canvas", "metadata.json");
}

function assetsDir(rootDir: string, projectId: string): string {
  return join(rootDir, projectId, "canvas", "assets");
}

export function readCanvasMetadata(
  rootDir: string,
  projectId: string
): CanvasMetadata {
  const path = metadataPath(rootDir, projectId);
  if (!existsSync(path)) {
    throw new Error(`Canvas metadata not found for project "${projectId}"`);
  }
  return CanvasMetadataSchema.parse(
    JSON.parse(readFileSync(path, "utf-8"))
  );
}

function writeCanvasMetadata(
  rootDir: string,
  projectId: string,
  meta: CanvasMetadata
): void {
  writeFileSync(
    metadataPath(rootDir, projectId),
    JSON.stringify(meta, null, 2),
    "utf-8"
  );
}

// --- Asset operations ---

export interface AddAssetInput {
  sourcePath: string;
  originalName: string;
  mimeType: string;
  inferredType?: AssetEntry["inferredType"];
  notes?: string;
  dominantColors?: string[];
  width?: number;
  height?: number;
}

export function addAsset(
  rootDir: string,
  projectId: string,
  input: AddAssetInput
): AssetEntry {
  const id = nextId("asset");
  const ext = extname(input.originalName);
  const filename = `${id}${ext}`;
  const now = new Date().toISOString();

  const entry: AssetEntry = {
    id,
    filename,
    originalName: input.originalName,
    mimeType: input.mimeType,
    addedAt: now,
    inferredType: input.inferredType,
    notes: input.notes,
    dominantColors: input.dominantColors,
    width: input.width,
    height: input.height,
  };

  // Validate
  AssetEntrySchema.parse(entry);

  // Copy file
  const destPath = join(assetsDir(rootDir, projectId), filename);
  copyFileSync(input.sourcePath, destPath);

  // Update metadata
  const meta = readCanvasMetadata(rootDir, projectId);
  meta.assets.push(entry);
  writeCanvasMetadata(rootDir, projectId, meta);

  return entry;
}

export function removeAsset(
  rootDir: string,
  projectId: string,
  assetId: string
): void {
  const meta = readCanvasMetadata(rootDir, projectId);
  const idx = meta.assets.findIndex((a) => a.id === assetId);
  if (idx === -1) {
    throw new Error(`Asset "${assetId}" not found in project "${projectId}"`);
  }

  const entry = meta.assets[idx];

  // Remove file
  const filePath = join(assetsDir(rootDir, projectId), entry.filename);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }

  // Remove from metadata
  meta.assets.splice(idx, 1);
  writeCanvasMetadata(rootDir, projectId, meta);
}

export function listAssets(
  rootDir: string,
  projectId: string
): AssetEntry[] {
  return readCanvasMetadata(rootDir, projectId).assets;
}

export interface UpdateAssetInput {
  inferredType?: AssetEntry["inferredType"];
  notes?: string;
  dominantColors?: string[];
}

export function updateAssetMetadata(
  rootDir: string,
  projectId: string,
  assetId: string,
  input: UpdateAssetInput
): AssetEntry {
  const meta = readCanvasMetadata(rootDir, projectId);
  const idx = meta.assets.findIndex((a) => a.id === assetId);
  if (idx === -1) {
    throw new Error(`Asset "${assetId}" not found in project "${projectId}"`);
  }

  const entry = meta.assets[idx];

  if (input.inferredType !== undefined) entry.inferredType = input.inferredType;
  if (input.notes !== undefined) entry.notes = input.notes;
  if (input.dominantColors !== undefined) entry.dominantColors = input.dominantColors;

  AssetEntrySchema.parse(entry);
  meta.assets[idx] = entry;
  writeCanvasMetadata(rootDir, projectId, meta);

  return entry;
}

// --- Text note operations ---

export function addTextNote(
  rootDir: string,
  projectId: string,
  content: string
): TextNote {
  const note: TextNote = {
    id: nextId("note"),
    content,
    addedAt: new Date().toISOString(),
  };

  TextNoteSchema.parse(note);

  const meta = readCanvasMetadata(rootDir, projectId);
  meta.textNotes.push(note);
  writeCanvasMetadata(rootDir, projectId, meta);

  return note;
}

export function removeTextNote(
  rootDir: string,
  projectId: string,
  noteId: string
): void {
  const meta = readCanvasMetadata(rootDir, projectId);
  const idx = meta.textNotes.findIndex((n) => n.id === noteId);
  if (idx === -1) {
    throw new Error(`Text note "${noteId}" not found in project "${projectId}"`);
  }

  meta.textNotes.splice(idx, 1);
  writeCanvasMetadata(rootDir, projectId, meta);
}

// --- Color value operations ---

export interface AddColorInput {
  hex: string;
  label?: string;
}

export function addColorValue(
  rootDir: string,
  projectId: string,
  input: AddColorInput
): ColorValue {
  const color: ColorValue = {
    id: nextId("color"),
    hex: input.hex,
    label: input.label,
    addedAt: new Date().toISOString(),
  };

  // This will throw if hex is invalid due to the regex in ColorValueSchema
  ColorValueSchema.parse(color);

  const meta = readCanvasMetadata(rootDir, projectId);
  meta.colorValues.push(color);
  writeCanvasMetadata(rootDir, projectId, meta);

  return color;
}

export function removeColorValue(
  rootDir: string,
  projectId: string,
  colorId: string
): void {
  const meta = readCanvasMetadata(rootDir, projectId);
  const idx = meta.colorValues.findIndex((c) => c.id === colorId);
  if (idx === -1) {
    throw new Error(`Color "${colorId}" not found in project "${projectId}"`);
  }

  meta.colorValues.splice(idx, 1);
  writeCanvasMetadata(rootDir, projectId, meta);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/project/asset-manager.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/project/asset-manager.ts tests/project/asset-manager.test.ts
git commit -m "feat: add canvas asset management (add, remove, list, update assets, notes, colors)"
```

---

### Task 5: Color extraction from images

**Files:**
- Create: `src/project/color-extract.ts`
- Create: `tests/project/color-extract.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/project/color-extract.test.ts
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { join } from "node:path";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { extractDominantColors, rgbToHex } from "../../src/project/color-extract.js";

const TEST_ROOT = join(import.meta.dirname, "../../.test-color-extract");

// Helper: create a solid-color test image
async function createTestImage(
  filePath: string,
  color: { r: number; g: number; b: number },
  width = 100,
  height = 100
): Promise<void> {
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toFile(filePath);
}

// Helper: create a two-tone test image (left half / right half)
async function createTwoToneImage(
  filePath: string,
  colorA: { r: number; g: number; b: number },
  colorB: { r: number; g: number; b: number },
  width = 100,
  height = 100
): Promise<void> {
  const halfWidth = Math.floor(width / 2);
  const leftHalf = await sharp({
    create: { width: halfWidth, height, channels: 3, background: colorA },
  })
    .raw()
    .toBuffer();
  const rightHalf = await sharp({
    create: { width: width - halfWidth, height, channels: 3, background: colorB },
  })
    .raw()
    .toBuffer();

  const combined = Buffer.concat([leftHalf, rightHalf]);

  // Interleave rows: row by row, left then right pixels
  const rowSize = width * 3;
  const buf = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    leftHalf.copy(buf, y * rowSize, y * halfWidth * 3, y * halfWidth * 3 + halfWidth * 3);
    rightHalf.copy(
      buf,
      y * rowSize + halfWidth * 3,
      y * (width - halfWidth) * 3,
      y * (width - halfWidth) * 3 + (width - halfWidth) * 3
    );
  }

  await sharp(buf, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(filePath);
}

describe("rgbToHex", () => {
  it("converts RGB to hex string", () => {
    expect(rgbToHex(255, 0, 0)).toBe("#FF0000");
    expect(rgbToHex(0, 255, 0)).toBe("#00FF00");
    expect(rgbToHex(0, 0, 255)).toBe("#0000FF");
    expect(rgbToHex(108, 92, 231)).toBe("#6C5CE7");
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
    expect(rgbToHex(255, 255, 255)).toBe("#FFFFFF");
  });
});

describe("extractDominantColors", () => {
  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  it("extracts average color from a solid image", async () => {
    const imgPath = join(TEST_ROOT, "solid-red.png");
    await createTestImage(imgPath, { r: 255, g: 0, b: 0 });

    const colors = await extractDominantColors(imgPath);

    expect(colors).toBeInstanceOf(Array);
    expect(colors.length).toBeGreaterThanOrEqual(1);
    // The average color of a solid red image should be red
    expect(colors[0]).toBe("#FF0000");
  });

  it("extracts average color from a solid blue image", async () => {
    const imgPath = join(TEST_ROOT, "solid-blue.png");
    await createTestImage(imgPath, { r: 0, g: 0, b: 255 });

    const colors = await extractDominantColors(imgPath);
    expect(colors[0]).toBe("#0000FF");
  });

  it("returns multiple colors for a two-tone image", async () => {
    const imgPath = join(TEST_ROOT, "two-tone.png");
    await createTwoToneImage(
      imgPath,
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 0, b: 255 }
    );

    const colors = await extractDominantColors(imgPath);

    // Should return at least 2 colors
    expect(colors.length).toBeGreaterThanOrEqual(2);
    // Both red and blue families should be represented
    const hasReddish = colors.some((c) => c.startsWith("#F") || c.startsWith("#E") || c.startsWith("#D") || c.startsWith("#C"));
    const hasBluish = colors.some((c) => c.endsWith("FF") || c.endsWith("FE") || c.endsWith("FD"));
    expect(hasReddish || hasBluish).toBe(true);
  });

  it("returns up to maxColors results", async () => {
    const imgPath = join(TEST_ROOT, "solid.png");
    await createTestImage(imgPath, { r: 128, g: 128, b: 128 });

    const colors = await extractDominantColors(imgPath, 3);
    expect(colors.length).toBeLessThanOrEqual(3);
  });

  it("throws for nonexistent file", async () => {
    await expect(
      extractDominantColors(join(TEST_ROOT, "nope.png"))
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/project/color-extract.test.ts`
Expected: FAIL — cannot resolve imports from `../../src/project/color-extract.js`

- [ ] **Step 3: Implement color extraction**

```typescript
// src/project/color-extract.ts
import sharp from "sharp";

/**
 * Convert RGB values (0-255) to a hex color string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .toUpperCase()
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Extract dominant colors from an image file using sharp.
 *
 * Strategy:
 * 1. Resize image to small dimensions (for speed)
 * 2. Use sharp.stats() to get per-channel mean (the "average" color)
 * 3. Segment the image into quadrants to get regional dominant colors
 * 4. Deduplicate similar colors and return up to maxColors unique entries
 *
 * @param filePath - Path to the image file
 * @param maxColors - Maximum number of colors to return (default: 5)
 * @returns Array of hex color strings
 */
export async function extractDominantColors(
  filePath: string,
  maxColors = 5
): Promise<string[]> {
  const img = sharp(filePath);
  const metadata = await img.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Cannot read dimensions of image: ${filePath}`);
  }

  // Resize to manageable size for analysis
  const analysisSize = 64;
  const resized = sharp(filePath).resize(analysisSize, analysisSize, {
    fit: "cover",
  });

  // Get overall average color
  const stats = await resized.stats();
  const avgColor = rgbToHex(
    stats.channels[0].mean,
    stats.channels[1].mean,
    stats.channels[2].mean
  );

  const colors: string[] = [avgColor];

  // Extract regional colors by analyzing quadrants
  const halfSize = Math.floor(analysisSize / 2);
  const quadrants = [
    { left: 0, top: 0 },
    { left: halfSize, top: 0 },
    { left: 0, top: halfSize },
    { left: halfSize, top: halfSize },
  ];

  for (const q of quadrants) {
    if (colors.length >= maxColors) break;

    const quadrantStats = await sharp(filePath)
      .resize(analysisSize, analysisSize, { fit: "cover" })
      .extract({
        left: q.left,
        top: q.top,
        width: halfSize,
        height: halfSize,
      })
      .stats();

    const hex = rgbToHex(
      quadrantStats.channels[0].mean,
      quadrantStats.channels[1].mean,
      quadrantStats.channels[2].mean
    );

    // Only add if sufficiently different from existing colors
    const isDuplicate = colors.some((c) => colorDistance(c, hex) < 30);
    if (!isDuplicate) {
      colors.push(hex);
    }
  }

  return colors.slice(0, maxColors);
}

/**
 * Compute simple Euclidean distance between two hex colors.
 */
function colorDistance(hexA: string, hexB: string): number {
  const parseHex = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

  const a = parseHex(hexA);
  const b = parseHex(hexB);

  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/project/color-extract.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/project/color-extract.ts tests/project/color-extract.test.ts
git commit -m "feat: add image dominant color extraction via sharp"
```

---

### Task 6: Canvas context serialization

**Files:**
- Create: `src/project/context-serializer.ts`
- Create: `tests/project/context-serializer.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/project/context-serializer.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createProject } from "../../src/project/project-crud.js";
import { addAsset, addTextNote, addColorValue } from "../../src/project/asset-manager.js";
import {
  serializeCanvasContext,
  type SerializedCanvasContext,
} from "../../src/project/context-serializer.js";

const TEST_ROOT = join(import.meta.dirname, "../../.test-projects-context");

let projectId: string;

beforeEach(() => {
  mkdirSync(TEST_ROOT, { recursive: true });
  const config = createProject(TEST_ROOT, {
    name: "Context Test",
    description: "Testing context serialization",
    outputSpecs: [
      { channel: "twitter", width: 1200, height: 675 },
      { channel: "instagram", width: 1080, height: 1080 },
    ],
  });
  projectId = config.id;
});

afterEach(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
});

describe("serializeCanvasContext", () => {
  it("produces valid structured context for empty canvas", () => {
    const ctx = serializeCanvasContext(TEST_ROOT, projectId);

    expect(ctx.project.name).toBe("Context Test");
    expect(ctx.project.description).toBe("Testing context serialization");
    expect(ctx.project.outputSpecs).toHaveLength(2);
    expect(ctx.assets).toEqual([]);
    expect(ctx.textNotes).toEqual([]);
    expect(ctx.colorPalette).toEqual([]);
  });

  it("includes asset summaries with file references", () => {
    const srcFile = join(TEST_ROOT, "logo.svg");
    writeFileSync(srcFile, "<svg></svg>");

    addAsset(TEST_ROOT, projectId, {
      sourcePath: srcFile,
      originalName: "brand-logo.svg",
      mimeType: "image/svg+xml",
      inferredType: "logo",
      notes: "Primary logo, monochrome",
      dominantColors: ["#000000"],
    });

    const ctx = serializeCanvasContext(TEST_ROOT, projectId);

    expect(ctx.assets).toHaveLength(1);
    expect(ctx.assets[0].originalName).toBe("brand-logo.svg");
    expect(ctx.assets[0].type).toBe("logo");
    expect(ctx.assets[0].notes).toBe("Primary logo, monochrome");
    expect(ctx.assets[0].dominantColors).toEqual(["#000000"]);
    expect(ctx.assets[0].filePath).toContain("canvas/assets/");
  });

  it("includes text notes", () => {
    addTextNote(TEST_ROOT, projectId, "Premium but approachable");
    addTextNote(TEST_ROOT, projectId, "Avoid gradients, brand is flat/minimal");

    const ctx = serializeCanvasContext(TEST_ROOT, projectId);

    expect(ctx.textNotes).toHaveLength(2);
    expect(ctx.textNotes[0]).toBe("Premium but approachable");
    expect(ctx.textNotes[1]).toBe("Avoid gradients, brand is flat/minimal");
  });

  it("includes color palette from explicit colors and asset-extracted colors", () => {
    addColorValue(TEST_ROOT, projectId, {
      hex: "#6C5CE7",
      label: "Brand purple",
    });
    addColorValue(TEST_ROOT, projectId, {
      hex: "#1A1A2E",
      label: "Dark navy",
    });

    const srcFile = join(TEST_ROOT, "photo.png");
    writeFileSync(srcFile, Buffer.from("fake"));

    addAsset(TEST_ROOT, projectId, {
      sourcePath: srcFile,
      originalName: "hero.png",
      mimeType: "image/png",
      dominantColors: ["#FF6B6B", "#FFFFFF"],
    });

    const ctx = serializeCanvasContext(TEST_ROOT, projectId);

    // Explicit colors first, then asset-extracted colors
    expect(ctx.colorPalette).toContainEqual({
      hex: "#6C5CE7",
      label: "Brand purple",
      source: "explicit",
    });
    expect(ctx.colorPalette).toContainEqual({
      hex: "#1A1A2E",
      label: "Dark navy",
      source: "explicit",
    });
    expect(ctx.colorPalette).toContainEqual({
      hex: "#FF6B6B",
      source: "extracted",
      sourceAsset: "hero.png",
    });
  });

  it("produces a valid JSON string via toJSON()", () => {
    addTextNote(TEST_ROOT, projectId, "Test note");

    const ctx = serializeCanvasContext(TEST_ROOT, projectId);
    const json = JSON.stringify(ctx);
    const parsed = JSON.parse(json);

    expect(parsed.project.name).toBe("Context Test");
    expect(parsed.textNotes).toEqual(["Test note"]);
  });

  it("produces a human-readable text summary via toText()", () => {
    addTextNote(TEST_ROOT, projectId, "Clean and modern");
    addColorValue(TEST_ROOT, projectId, { hex: "#6C5CE7", label: "Purple" });

    const ctx = serializeCanvasContext(TEST_ROOT, projectId);
    const text = serializeCanvasContextToText(ctx);

    expect(text).toContain("Context Test");
    expect(text).toContain("Clean and modern");
    expect(text).toContain("#6C5CE7");
    expect(text).toContain("twitter");
  });
});

// Import at top once module exists; defined here for the test reference
import { serializeCanvasContextToText } from "../../src/project/context-serializer.js";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/project/context-serializer.test.ts`
Expected: FAIL — cannot resolve imports from `../../src/project/context-serializer.js`

- [ ] **Step 3: Implement context serializer**

```typescript
// src/project/context-serializer.ts
import { readProject } from "./project-crud.js";
import { readCanvasMetadata } from "./asset-manager.js";
import { join } from "node:path";
import type { ProjectConfig, AssetEntry, OutputSpec } from "./schemas.js";

// --- Serialized context types ---

export interface SerializedAsset {
  originalName: string;
  type: string | undefined;
  mimeType: string;
  notes: string | undefined;
  dominantColors: string[] | undefined;
  filePath: string;
  dimensions:
    | { width: number; height: number }
    | undefined;
}

export interface SerializedColor {
  hex: string;
  label?: string;
  source: "explicit" | "extracted";
  sourceAsset?: string;
}

export interface SerializedCanvasContext {
  project: {
    name: string;
    description: string | undefined;
    outputSpecs: OutputSpec[];
  };
  assets: SerializedAsset[];
  textNotes: string[];
  colorPalette: SerializedColor[];
}

/**
 * Serialize the entire canvas into a structured object an LLM agent can consume.
 *
 * Includes:
 * - Project identity and output specs
 * - All asset entries with file paths, inferred types, notes, and extracted colors
 * - All text notes (freeform brand context)
 * - Merged color palette from explicit color values + colors extracted from assets
 */
export function serializeCanvasContext(
  rootDir: string,
  projectId: string
): SerializedCanvasContext {
  const config = readProject(rootDir, projectId);
  const meta = readCanvasMetadata(rootDir, projectId);

  // Serialize assets
  const assets: SerializedAsset[] = meta.assets.map((a) => ({
    originalName: a.originalName,
    type: a.inferredType,
    mimeType: a.mimeType,
    notes: a.notes,
    dominantColors: a.dominantColors,
    filePath: join(projectId, "canvas", "assets", a.filename),
    dimensions:
      a.width && a.height
        ? { width: a.width, height: a.height }
        : undefined,
  }));

  // Flatten text notes to strings
  const textNotes = meta.textNotes.map((n) => n.content);

  // Build color palette: explicit colors first, then asset-extracted
  const colorPalette: SerializedColor[] = [];

  for (const cv of meta.colorValues) {
    colorPalette.push({
      hex: cv.hex,
      label: cv.label,
      source: "explicit",
    });
  }

  for (const asset of meta.assets) {
    if (asset.dominantColors) {
      for (const hex of asset.dominantColors) {
        // Avoid duplicates
        const alreadyPresent = colorPalette.some((c) => c.hex === hex);
        if (!alreadyPresent) {
          colorPalette.push({
            hex,
            source: "extracted",
            sourceAsset: asset.originalName,
          });
        }
      }
    }
  }

  return {
    project: {
      name: config.name,
      description: config.description,
      outputSpecs: config.outputSpecs,
    },
    assets,
    textNotes,
    colorPalette,
  };
}

/**
 * Produce a human-readable text representation of the serialized canvas context.
 * Designed for LLM consumption as a system/user message.
 */
export function serializeCanvasContextToText(
  ctx: SerializedCanvasContext
): string {
  const lines: string[] = [];

  lines.push(`# Brand Context: ${ctx.project.name}`);
  if (ctx.project.description) {
    lines.push(`Description: ${ctx.project.description}`);
  }
  lines.push("");

  // Output specs
  if (ctx.project.outputSpecs.length > 0) {
    lines.push("## Target Channels");
    for (const spec of ctx.project.outputSpecs) {
      lines.push(`- ${spec.channel}: ${spec.width}x${spec.height}`);
    }
    lines.push("");
  }

  // Assets
  if (ctx.assets.length > 0) {
    lines.push("## Brand Assets");
    for (const asset of ctx.assets) {
      const typePart = asset.type ? ` (${asset.type})` : "";
      lines.push(`- ${asset.originalName}${typePart} [${asset.mimeType}]`);
      if (asset.dimensions) {
        lines.push(
          `  Dimensions: ${asset.dimensions.width}x${asset.dimensions.height}`
        );
      }
      if (asset.dominantColors && asset.dominantColors.length > 0) {
        lines.push(`  Colors: ${asset.dominantColors.join(", ")}`);
      }
      if (asset.notes) {
        lines.push(`  Notes: ${asset.notes}`);
      }
      lines.push(`  File: ${asset.filePath}`);
    }
    lines.push("");
  }

  // Text notes
  if (ctx.textNotes.length > 0) {
    lines.push("## Brand Notes");
    for (const note of ctx.textNotes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  // Color palette
  if (ctx.colorPalette.length > 0) {
    lines.push("## Color Palette");
    for (const color of ctx.colorPalette) {
      const labelPart = color.label ? ` "${color.label}"` : "";
      const sourcePart =
        color.source === "extracted" && color.sourceAsset
          ? ` (from ${color.sourceAsset})`
          : "";
      lines.push(`- ${color.hex}${labelPart}${sourcePart}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/project/context-serializer.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/project/context-serializer.ts tests/project/context-serializer.test.ts
git commit -m "feat: add canvas context serializer for LLM consumption"
```

---

### Task 7: Generation history

**Files:**
- Create: `src/project/history.ts`
- Create: `tests/project/history.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/project/history.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createProject } from "../../src/project/project-crud.js";
import {
  createGeneration,
  readGeneration,
  listGenerations,
  updateGenerationResult,
  writeSceneGraph,
  writeRender,
} from "../../src/project/history.js";
import type { GenerationRecord } from "../../src/project/schemas.js";

const TEST_ROOT = join(import.meta.dirname, "../../.test-projects-history");

let projectId: string;

beforeEach(() => {
  mkdirSync(TEST_ROOT, { recursive: true });
  const config = createProject(TEST_ROOT, {
    name: "History Test",
    outputSpecs: [{ channel: "twitter", width: 1200, height: 675 }],
  });
  projectId = config.id;
});

afterEach(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
});

describe("createGeneration", () => {
  it("creates generation directory with brief.json", () => {
    const record = createGeneration(TEST_ROOT, projectId, {
      userPrompt: "Launch banner for DeFi platform",
      canvasContext: '{"project":{"name":"History Test"}}',
    });

    expect(record.id).toMatch(/^gen-/);
    expect(record.brief.userPrompt).toBe(
      "Launch banner for DeFi platform"
    );
    expect(record.result.status).toBe("in-progress");

    const genDir = join(TEST_ROOT, projectId, "history", record.id);
    expect(existsSync(genDir)).toBe(true);
    expect(existsSync(join(genDir, "brief.json"))).toBe(true);
    expect(existsSync(join(genDir, "result.json"))).toBe(true);
    expect(existsSync(join(genDir, "banners"))).toBe(true);
    expect(existsSync(join(genDir, "renders"))).toBe(true);
  });

  it("assigns sequential generation ids", () => {
    const g1 = createGeneration(TEST_ROOT, projectId, {
      userPrompt: "First",
      canvasContext: "",
    });
    const g2 = createGeneration(TEST_ROOT, projectId, {
      userPrompt: "Second",
      canvasContext: "",
    });

    expect(g1.id).toBe("gen-001");
    expect(g2.id).toBe("gen-002");
  });
});

describe("readGeneration", () => {
  it("reads a previously created generation", () => {
    const created = createGeneration(TEST_ROOT, projectId, {
      userPrompt: "Test prompt",
      canvasContext: "ctx",
    });

    const read = readGeneration(TEST_ROOT, projectId, created.id);
    expect(read.brief.userPrompt).toBe("Test prompt");
    expect(read.result.status).toBe("in-progress");
  });

  it("throws for nonexistent generation", () => {
    expect(() =>
      readGeneration(TEST_ROOT, projectId, "gen-999")
    ).toThrow();
  });
});

describe("listGenerations", () => {
  it("returns empty array for project with no generations", () => {
    expect(listGenerations(TEST_ROOT, projectId)).toEqual([]);
  });

  it("returns all generations in order", () => {
    createGeneration(TEST_ROOT, projectId, {
      userPrompt: "First",
      canvasContext: "",
    });
    createGeneration(TEST_ROOT, projectId, {
      userPrompt: "Second",
      canvasContext: "",
    });
    createGeneration(TEST_ROOT, projectId, {
      userPrompt: "Third",
      canvasContext: "",
    });

    const list = listGenerations(TEST_ROOT, projectId);
    expect(list).toHaveLength(3);
    expect(list[0].id).toBe("gen-001");
    expect(list[1].id).toBe("gen-002");
    expect(list[2].id).toBe("gen-003");
  });
});

describe("updateGenerationResult", () => {
  it("updates result status and reasoning", () => {
    const gen = createGeneration(TEST_ROOT, projectId, {
      userPrompt: "Banner",
      canvasContext: "ctx",
    });

    const updated = updateGenerationResult(TEST_ROOT, projectId, gen.id, {
      status: "completed",
      agentReasoning:
        "Selected split template. Used flux-2-pro for hero illustration.",
      modelChoices: [
        { purpose: "hero-illustration", model: "flux-2-pro" },
        { purpose: "background", model: "flux-schnell" },
      ],
      outputs: [
        {
          channel: "twitter",
          width: 1200,
          height: 675,
          sceneGraphFile: "banners/twitter-1200x675.json",
          renderFile: "renders/twitter-1200x675.png",
        },
      ],
    });

    expect(updated.result.status).toBe("completed");
    expect(updated.result.modelChoices).toHaveLength(2);
    expect(updated.outputs).toHaveLength(1);

    // Verify persisted
    const reread = readGeneration(TEST_ROOT, projectId, gen.id);
    expect(reread.result.status).toBe("completed");
  });

  it("can mark a generation as failed", () => {
    const gen = createGeneration(TEST_ROOT, projectId, {
      userPrompt: "Test",
      canvasContext: "",
    });

    const updated = updateGenerationResult(TEST_ROOT, projectId, gen.id, {
      status: "failed",
      agentReasoning: "Canvas empty",
      error: "No assets on canvas",
    });

    expect(updated.result.status).toBe("failed");
    expect(updated.result.error).toBe("No assets on canvas");
  });
});

describe("writeSceneGraph", () => {
  it("writes a scene graph JSON file to the banners directory", () => {
    const gen = createGeneration(TEST_ROOT, projectId, {
      userPrompt: "Test",
      canvasContext: "",
    });

    const sceneGraph = {
      type: "FRAME",
      name: "Banner",
      width: 1200,
      height: 675,
      children: [],
    };

    const filePath = writeSceneGraph(
      TEST_ROOT,
      projectId,
      gen.id,
      "twitter-1200x675",
      sceneGraph
    );

    expect(existsSync(filePath)).toBe(true);
    expect(filePath).toContain("banners/twitter-1200x675.json");
  });
});

describe("writeRender", () => {
  it("writes a render file to the renders directory", () => {
    const gen = createGeneration(TEST_ROOT, projectId, {
      userPrompt: "Test",
      canvasContext: "",
    });

    const fakeImageData = Buffer.from("fake-png-data");
    const filePath = writeRender(
      TEST_ROOT,
      projectId,
      gen.id,
      "twitter-1200x675.png",
      fakeImageData
    );

    expect(existsSync(filePath)).toBe(true);
    expect(filePath).toContain("renders/twitter-1200x675.png");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/project/history.test.ts`
Expected: FAIL — cannot resolve imports from `../../src/project/history.js`

- [ ] **Step 3: Implement generation history**

```typescript
// src/project/history.ts
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import {
  GenerationRecordSchema,
  type GenerationRecord,
  type GenerationBrief,
  type GenerationResult,
  type GenerationOutput,
} from "./schemas.js";

// --- Helpers ---

function writeJson(filePath: string, data: unknown): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function historyDir(rootDir: string, projectId: string): string {
  return join(rootDir, projectId, "history");
}

function generationDir(
  rootDir: string,
  projectId: string,
  generationId: string
): string {
  return join(historyDir(rootDir, projectId), generationId);
}

function nextGenerationId(rootDir: string, projectId: string): string {
  const hDir = historyDir(rootDir, projectId);
  if (!existsSync(hDir)) return "gen-001";

  const entries = readdirSync(hDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("gen-"))
    .map((e) => e.name);

  if (entries.length === 0) return "gen-001";

  const maxNum = Math.max(
    ...entries.map((name) => {
      const num = parseInt(name.replace("gen-", ""), 10);
      return isNaN(num) ? 0 : num;
    })
  );

  return `gen-${String(maxNum + 1).padStart(3, "0")}`;
}

// --- Public API ---

export function createGeneration(
  rootDir: string,
  projectId: string,
  brief: GenerationBrief
): GenerationRecord {
  const id = nextGenerationId(rootDir, projectId);
  const now = new Date().toISOString();

  const record: GenerationRecord = {
    id,
    createdAt: now,
    brief,
    result: {
      agentReasoning: "",
      modelChoices: [],
      status: "in-progress",
    },
    outputs: [],
  };

  GenerationRecordSchema.parse(record);

  // Create directory structure
  const genDir = generationDir(rootDir, projectId, id);
  mkdirSync(genDir, { recursive: true });
  mkdirSync(join(genDir, "banners"), { recursive: true });
  mkdirSync(join(genDir, "renders"), { recursive: true });

  // Write brief and result
  writeJson(join(genDir, "brief.json"), record.brief);
  writeJson(join(genDir, "result.json"), {
    ...record.result,
    outputs: record.outputs,
  });

  return record;
}

export function readGeneration(
  rootDir: string,
  projectId: string,
  generationId: string
): GenerationRecord {
  const genDir = generationDir(rootDir, projectId, generationId);

  if (!existsSync(genDir)) {
    throw new Error(
      `Generation "${generationId}" not found in project "${projectId}"`
    );
  }

  const brief = readJson(join(genDir, "brief.json")) as GenerationBrief;
  const resultData = readJson(join(genDir, "result.json")) as GenerationResult & {
    outputs?: GenerationOutput[];
  };

  const outputs = resultData.outputs ?? [];
  const { outputs: _, ...result } = resultData;

  const record: GenerationRecord = {
    id: generationId,
    createdAt: getCreatedAt(genDir),
    brief,
    result: result as GenerationResult,
    outputs,
  };

  return GenerationRecordSchema.parse(record);
}

/**
 * Get createdAt from brief.json file mtime, or fall back to reading result.json
 */
function getCreatedAt(genDir: string): string {
  const briefPath = join(genDir, "brief.json");
  const stat = require("node:fs").statSync(briefPath);
  return stat.birthtime.toISOString();
}

export function listGenerations(
  rootDir: string,
  projectId: string
): GenerationRecord[] {
  const hDir = historyDir(rootDir, projectId);
  if (!existsSync(hDir)) return [];

  const entries = readdirSync(hDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("gen-"))
    .sort((a, b) => a.name.localeCompare(b.name));

  return entries.map((e) => readGeneration(rootDir, projectId, e.name));
}

export interface UpdateGenerationInput {
  status: "completed" | "failed" | "in-progress";
  agentReasoning?: string;
  modelChoices?: Array<{ purpose: string; model: string }>;
  error?: string;
  outputs?: GenerationOutput[];
}

export function updateGenerationResult(
  rootDir: string,
  projectId: string,
  generationId: string,
  input: UpdateGenerationInput
): GenerationRecord {
  const current = readGeneration(rootDir, projectId, generationId);

  const updatedResult: GenerationResult = {
    agentReasoning: input.agentReasoning ?? current.result.agentReasoning,
    modelChoices: input.modelChoices ?? current.result.modelChoices,
    status: input.status,
    error: input.error ?? current.result.error,
  };

  const updatedOutputs = input.outputs ?? current.outputs;

  const updatedRecord: GenerationRecord = {
    ...current,
    result: updatedResult,
    outputs: updatedOutputs,
  };

  GenerationRecordSchema.parse(updatedRecord);

  const genDir = generationDir(rootDir, projectId, generationId);
  writeJson(join(genDir, "result.json"), {
    ...updatedResult,
    outputs: updatedOutputs,
  });

  return updatedRecord;
}

export function writeSceneGraph(
  rootDir: string,
  projectId: string,
  generationId: string,
  name: string,
  sceneGraph: unknown
): string {
  const filePath = join(
    generationDir(rootDir, projectId, generationId),
    "banners",
    `${name}.json`
  );
  writeJson(filePath, sceneGraph);
  return filePath;
}

export function writeRender(
  rootDir: string,
  projectId: string,
  generationId: string,
  filename: string,
  data: Buffer
): string {
  const filePath = join(
    generationDir(rootDir, projectId, generationId),
    "renders",
    filename
  );
  writeFileSync(filePath, data);
  return filePath;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/project/history.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/project/history.ts tests/project/history.test.ts
git commit -m "feat: add generation history (create, read, list, update, write scene graphs and renders)"
```

---

### Task 8: Barrel export

**Files:**
- Create: `src/project/index.ts`

- [ ] **Step 1: Create barrel export file**

```typescript
// src/project/index.ts

// Schemas and types
export {
  ProjectConfigSchema,
  AssetEntrySchema,
  CanvasMetadataSchema,
  OutputSpecSchema,
  TextNoteSchema,
  ColorValueSchema,
  GenerationBriefSchema,
  GenerationResultSchema,
  GenerationOutputSchema,
  GenerationRecordSchema,
  ModelChoiceSchema,
  type ProjectConfig,
  type AssetEntry,
  type CanvasMetadata,
  type OutputSpec,
  type TextNote,
  type ColorValue,
  type GenerationBrief,
  type GenerationResult,
  type GenerationOutput,
  type GenerationRecord,
  type ModelChoice,
} from "./schemas.js";

// Project CRUD
export {
  createProject,
  readProject,
  listProjects,
  updateProject,
  deleteProject,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "./project-crud.js";

// Asset management
export {
  addAsset,
  removeAsset,
  listAssets,
  updateAssetMetadata,
  readCanvasMetadata,
  addTextNote,
  removeTextNote,
  addColorValue,
  removeColorValue,
  type AddAssetInput,
  type UpdateAssetInput,
  type AddColorInput,
} from "./asset-manager.js";

// Canvas context serialization
export {
  serializeCanvasContext,
  serializeCanvasContextToText,
  type SerializedCanvasContext,
  type SerializedAsset,
  type SerializedColor,
} from "./context-serializer.js";

// Color extraction
export { extractDominantColors, rgbToHex } from "./color-extract.js";

// Generation history
export {
  createGeneration,
  readGeneration,
  listGenerations,
  updateGenerationResult,
  writeSceneGraph,
  writeRender,
  type UpdateGenerationInput,
} from "./history.js";
```

- [ ] **Step 2: Verify barrel exports resolve**

Run: `npx tsx -e "import * as project from './src/project/index.js'; console.log(Object.keys(project).join(', '))"`
Expected: prints all exported names without errors.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: PASS — all tests across all files pass

- [ ] **Step 4: Commit**

```bash
git add src/project/index.ts
git commit -m "feat: add project module barrel export"
```
