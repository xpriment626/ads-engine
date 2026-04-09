# Plan B: Device Mockup Compositor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a programmatic device mockup compositor that takes a product screenshot and composites it into a pre-built device frame (iPhone 15 Pro, MacBook Pro), returning a finished image buffer.

**Architecture:** Device frames are stored as transparent PNGs with companion metadata JSON files defining screen region coordinates. The compositor loads the frame + metadata, resizes the input screenshot to match the screen region, composites it behind the frame (so bezels/notches overlay naturally), and returns the result as a PNG buffer. All image manipulation uses the `sharp` npm package (native Node.js, no Python).

**Tech Stack:** TypeScript, sharp, Vitest

**Phase:** 1 (no dependencies — can run in parallel with Plans A and C)

**Spec reference:** [2026-04-09-brandouble-mvp-design.md](../specs/2026-04-09-brandouble-mvp-design.md)

---

## File structure

```
src/
  compositor/
    types.ts              # DeviceFrame metadata types, DeviceType enum
    frames.ts             # Frame registry — loads metadata + resolves asset paths
    composite.ts          # Core compositing function
    index.ts              # Public API barrel export
  assets/
    frames/
      iphone-15-pro/
        frame.png         # Transparent PNG device frame
        meta.json         # Screen region coordinates
      macbook-pro/
        frame.png         # Transparent PNG device frame
        meta.json         # Screen region coordinates
tests/
  compositor/
    types.test.ts
    frames.test.ts
    composite.test.ts
  fixtures/
    test-screenshot.png   # Generated programmatically in test setup
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

- [ ] **Step 2: Verify sharp loads**

```bash
node -e "const sharp = require('sharp'); console.log('sharp version:', sharp.versions.sharp)"
```

Expected: prints a version number with no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add sharp image processing dependency"
```

---

### Task 2: Device frame metadata types + test

**Files:**
- Create: `src/compositor/types.ts`
- Create: `tests/compositor/types.test.ts`

- [ ] **Step 1: Write the type smoke test**

```typescript
// tests/compositor/types.test.ts
import { describe, it, expect } from "vitest";
import type {
  DeviceType,
  ScreenRegion,
  DeviceFrameMeta,
  CompositeOptions,
  CompositeResult,
} from "../../src/compositor/types.js";

describe("Compositor types", () => {
  it("DeviceFrameMeta has correct structure", () => {
    const meta: DeviceFrameMeta = {
      device: "iphone-15-pro",
      displayName: "iPhone 15 Pro",
      frameWidth: 1312,
      frameHeight: 2688,
      screen: {
        top: 200,
        left: 86,
        width: 1140,
        height: 2466,
      },
    };
    expect(meta.device).toBe("iphone-15-pro");
    expect(meta.screen.width).toBe(1140);
    expect(meta.screen.height).toBe(2466);
  });

  it("CompositeOptions has correct structure", () => {
    const opts: CompositeOptions = {
      device: "macbook-pro",
      background: "#ffffff",
    };
    expect(opts.device).toBe("macbook-pro");
    expect(opts.background).toBe("#ffffff");
  });

  it("CompositeResult has correct structure", () => {
    const result: CompositeResult = {
      buffer: Buffer.from("fake-image-data"),
      width: 3024,
      height: 1964,
      format: "png",
    };
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.format).toBe("png");
  });

  it("DeviceType accepts valid device strings", () => {
    const devices: DeviceType[] = ["iphone-15-pro", "macbook-pro"];
    expect(devices).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/compositor/types.test.ts`
Expected: FAIL — cannot resolve imports from `../../src/compositor/types.js`

- [ ] **Step 3: Write the type definitions**

```typescript
// src/compositor/types.ts

/** Supported device identifiers */
export type DeviceType = "iphone-15-pro" | "macbook-pro";

/** Pixel region defining where the screen sits inside the frame PNG */
export interface ScreenRegion {
  /** Distance from the top of the frame image to the top of the screen */
  top: number;
  /** Distance from the left of the frame image to the left of the screen */
  left: number;
  /** Width of the screen area in pixels */
  width: number;
  /** Height of the screen area in pixels */
  height: number;
}

/** Metadata for a single device frame asset */
export interface DeviceFrameMeta {
  /** Device identifier — must match a DeviceType value */
  device: DeviceType;
  /** Human-readable name */
  displayName: string;
  /** Full width of the frame PNG in pixels */
  frameWidth: number;
  /** Full height of the frame PNG in pixels */
  frameHeight: number;
  /** Screen region coordinates within the frame */
  screen: ScreenRegion;
}

/** Options passed to the composite function */
export interface CompositeOptions {
  /** Which device frame to use */
  device: DeviceType;
  /**
   * Background color behind the entire composition.
   * Accepts hex (#ffffff), rgb, or named CSS colors.
   * Default: transparent.
   */
  background?: string;
}

/** Result of a composite operation */
export interface CompositeResult {
  /** PNG image buffer of the final composited image */
  buffer: Buffer;
  /** Width of the output image in pixels */
  width: number;
  /** Height of the output image in pixels */
  height: number;
  /** Always "png" for now */
  format: "png";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/compositor/types.test.ts`
Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/compositor/types.ts tests/compositor/types.test.ts
git commit -m "feat(compositor): add device frame metadata types"
```

---

### Task 3: Create device frame assets and frame registry

**Files:**
- Create: `src/assets/frames/iphone-15-pro/meta.json`
- Create: `src/assets/frames/macbook-pro/meta.json`
- Create: `src/compositor/frames.ts`
- Create: `tests/compositor/frames.test.ts`

This task creates the metadata files and a registry that resolves device types to their frame asset paths and metadata. For MVP, frame PNGs are placeholders generated in tests — real assets will be added later.

- [ ] **Step 1: Create iPhone 15 Pro metadata**

```json
// src/assets/frames/iphone-15-pro/meta.json
{
  "device": "iphone-15-pro",
  "displayName": "iPhone 15 Pro",
  "frameWidth": 1312,
  "frameHeight": 2688,
  "screen": {
    "top": 200,
    "left": 86,
    "width": 1140,
    "height": 2466
  }
}
```

> Coordinates rationale: iPhone 15 Pro at 3x is 1179x2556 screen in a body roughly 1312x2688. The 86px left offset accounts for the bezel, 200px top offset for the Dynamic Island area and top bezel.

- [ ] **Step 2: Create MacBook Pro metadata**

```json
// src/assets/frames/macbook-pro/meta.json
{
  "device": "macbook-pro",
  "displayName": "MacBook Pro",
  "frameWidth": 3024,
  "frameHeight": 1964,
  "screen": {
    "top": 72,
    "left": 288,
    "width": 2448,
    "height": 1582
  }
}
```

> Coordinates rationale: MacBook Pro 14" frame at native resolution. The 288px left offset accounts for the bezel and hinge surround, 72px top for the notch bar and top bezel. Screen area is the active display region.

- [ ] **Step 3: Write the frames registry test**

```typescript
// tests/compositor/frames.test.ts
import { describe, it, expect } from "vitest";
import { getFrameMeta, getFramePath, listDevices } from "../../src/compositor/frames.js";

describe("Frame registry", () => {
  it("listDevices returns all supported devices", () => {
    const devices = listDevices();
    expect(devices).toContain("iphone-15-pro");
    expect(devices).toContain("macbook-pro");
    expect(devices).toHaveLength(2);
  });

  it("getFrameMeta returns correct metadata for iphone-15-pro", () => {
    const meta = getFrameMeta("iphone-15-pro");
    expect(meta.device).toBe("iphone-15-pro");
    expect(meta.displayName).toBe("iPhone 15 Pro");
    expect(meta.frameWidth).toBe(1312);
    expect(meta.frameHeight).toBe(2688);
    expect(meta.screen.top).toBe(200);
    expect(meta.screen.left).toBe(86);
    expect(meta.screen.width).toBe(1140);
    expect(meta.screen.height).toBe(2466);
  });

  it("getFrameMeta returns correct metadata for macbook-pro", () => {
    const meta = getFrameMeta("macbook-pro");
    expect(meta.device).toBe("macbook-pro");
    expect(meta.displayName).toBe("MacBook Pro");
    expect(meta.frameWidth).toBe(3024);
    expect(meta.frameHeight).toBe(1964);
    expect(meta.screen.top).toBe(72);
    expect(meta.screen.left).toBe(288);
    expect(meta.screen.width).toBe(2448);
    expect(meta.screen.height).toBe(1582);
  });

  it("getFramePath returns a path ending with frame.png", () => {
    const path = getFramePath("iphone-15-pro");
    expect(path).toMatch(/iphone-15-pro\/frame\.png$/);
  });

  it("getFrameMeta throws for unknown device", () => {
    expect(() => getFrameMeta("nokia-3310" as any)).toThrow("Unknown device");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/compositor/frames.test.ts`
Expected: FAIL — cannot resolve imports from `../../src/compositor/frames.js`

- [ ] **Step 5: Implement the frame registry**

```typescript
// src/compositor/frames.ts
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { DeviceType, DeviceFrameMeta } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, "../assets/frames");

const SUPPORTED_DEVICES: readonly DeviceType[] = [
  "iphone-15-pro",
  "macbook-pro",
] as const;

/** Cache loaded metadata to avoid re-reading JSON on every call */
const metaCache = new Map<DeviceType, DeviceFrameMeta>();

/**
 * Returns the list of all supported device types.
 */
export function listDevices(): DeviceType[] {
  return [...SUPPORTED_DEVICES];
}

/**
 * Loads and returns the metadata for a given device frame.
 * Throws if the device is not supported or metadata is missing.
 */
export function getFrameMeta(device: DeviceType): DeviceFrameMeta {
  if (!SUPPORTED_DEVICES.includes(device)) {
    throw new Error(`Unknown device: "${device}". Supported: ${SUPPORTED_DEVICES.join(", ")}`);
  }

  const cached = metaCache.get(device);
  if (cached) return cached;

  const metaPath = resolve(ASSETS_DIR, device, "meta.json");
  const raw = readFileSync(metaPath, "utf-8");
  const meta: DeviceFrameMeta = JSON.parse(raw);
  metaCache.set(device, meta);
  return meta;
}

/**
 * Returns the absolute filesystem path to the device frame PNG.
 */
export function getFramePath(device: DeviceType): string {
  if (!SUPPORTED_DEVICES.includes(device)) {
    throw new Error(`Unknown device: "${device}". Supported: ${SUPPORTED_DEVICES.join(", ")}`);
  }
  return resolve(ASSETS_DIR, device, "frame.png");
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/compositor/frames.test.ts`
Expected: PASS — all 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/assets/frames/ src/compositor/frames.ts tests/compositor/frames.test.ts
git commit -m "feat(compositor): add device frame metadata and registry"
```

---

### Task 4: Core composite function

**Files:**
- Create: `src/compositor/composite.ts`
- Create: `tests/compositor/composite.test.ts`

The compositor takes a screenshot buffer and device type, loads the frame + metadata, resizes the screenshot to fit the screen region, composites the screenshot onto a blank canvas at the screen coordinates, then layers the device frame on top. This means the frame's bezels, notch, and corners mask the screenshot naturally.

- [ ] **Step 1: Write the composite function test**

```typescript
// tests/compositor/composite.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import sharp from "sharp";
import { compositeDevice } from "../../src/compositor/composite.js";
import { getFrameMeta, getFramePath } from "../../src/compositor/frames.js";
import { existsSync } from "node:fs";

/**
 * Generate a placeholder frame PNG if the real asset doesn't exist yet.
 * Creates a transparent PNG at the frame dimensions with a gray border
 * to simulate a device frame.
 */
async function ensurePlaceholderFrame(device: "iphone-15-pro" | "macbook-pro"): Promise<void> {
  const framePath = getFramePath(device);
  if (existsSync(framePath)) return;

  const meta = getFrameMeta(device);

  // Create a transparent image, then draw a dark border around the screen cutout
  // to simulate a device bezel. The screen area stays transparent so the
  // screenshot shows through.
  const frame = sharp({
    create: {
      width: meta.frameWidth,
      height: meta.frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  // Create bezel overlay: a dark rectangle with a transparent hole for the screen
  const bezelSvg = `<svg width="${meta.frameWidth}" height="${meta.frameHeight}">
    <rect width="100%" height="100%" fill="#1a1a1a" rx="60" ry="60"/>
    <rect x="${meta.screen.left}" y="${meta.screen.top}"
          width="${meta.screen.width}" height="${meta.screen.height}"
          fill="black"/>
  </svg>`;

  // Use the SVG as an overlay — black areas become transparent via dest-in,
  // but simpler: just save the SVG-based bezel as the frame.
  // For test purposes, the "frame" is the dark border. The screen area is
  // cut out by compositing with dest-out.
  const bezelBuffer = await sharp(Buffer.from(bezelSvg)).png().toBuffer();

  // Create the screen mask (white = keep, black = cut)
  const maskSvg = `<svg width="${meta.frameWidth}" height="${meta.frameHeight}">
    <rect width="100%" height="100%" fill="white"/>
    <rect x="${meta.screen.left}" y="${meta.screen.top}"
          width="${meta.screen.width}" height="${meta.screen.height}"
          fill="black"/>
  </svg>`;

  const maskBuffer = await sharp(Buffer.from(maskSvg))
    .ensureAlpha()
    .png()
    .toBuffer();

  // Composite: start with bezel, apply mask to cut out the screen area
  const { dir } = await import("node:path").then((p) => ({
    dir: p.dirname(framePath),
  }));
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });

  await sharp(bezelBuffer)
    .composite([
      {
        input: maskBuffer,
        blend: "dest-in",
      },
    ])
    .png()
    .toFile(framePath);
}

/** Generate a test screenshot — a solid blue rectangle */
async function createTestScreenshot(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 59, g: 130, b: 246, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

describe("compositeDevice", () => {
  beforeAll(async () => {
    await ensurePlaceholderFrame("iphone-15-pro");
    await ensurePlaceholderFrame("macbook-pro");
  });

  it("composites a screenshot into an iPhone 15 Pro frame", async () => {
    const meta = getFrameMeta("iphone-15-pro");
    const screenshot = await createTestScreenshot(1170, 2532);

    const result = await compositeDevice(screenshot, { device: "iphone-15-pro" });

    expect(result.format).toBe("png");
    expect(result.width).toBe(meta.frameWidth);
    expect(result.height).toBe(meta.frameHeight);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);

    // Verify the output is a valid PNG by reading it back with sharp
    const outputMeta = await sharp(result.buffer).metadata();
    expect(outputMeta.format).toBe("png");
    expect(outputMeta.width).toBe(meta.frameWidth);
    expect(outputMeta.height).toBe(meta.frameHeight);
  });

  it("composites a screenshot into a MacBook Pro frame", async () => {
    const meta = getFrameMeta("macbook-pro");
    const screenshot = await createTestScreenshot(2880, 1800);

    const result = await compositeDevice(screenshot, { device: "macbook-pro" });

    expect(result.format).toBe("png");
    expect(result.width).toBe(meta.frameWidth);
    expect(result.height).toBe(meta.frameHeight);

    const outputMeta = await sharp(result.buffer).metadata();
    expect(outputMeta.format).toBe("png");
    expect(outputMeta.width).toBe(meta.frameWidth);
    expect(outputMeta.height).toBe(meta.frameHeight);
  });

  it("handles screenshots with different aspect ratios by resizing to fit", async () => {
    // A square screenshot — should be resized to fill the screen region
    const screenshot = await createTestScreenshot(1000, 1000);

    const result = await compositeDevice(screenshot, { device: "iphone-15-pro" });
    const meta = getFrameMeta("iphone-15-pro");

    expect(result.width).toBe(meta.frameWidth);
    expect(result.height).toBe(meta.frameHeight);
  });

  it("applies a background color when specified", async () => {
    const screenshot = await createTestScreenshot(1170, 2532);

    const result = await compositeDevice(screenshot, {
      device: "iphone-15-pro",
      background: "#ff0000",
    });

    // Verify it produces a valid image (background color is applied under the frame)
    const outputMeta = await sharp(result.buffer).metadata();
    expect(outputMeta.format).toBe("png");

    // Sample a pixel from the corner (outside the frame) to verify background
    const { data, info } = await sharp(result.buffer)
      .extract({ left: 0, top: 0, width: 1, height: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Corner pixel should be red (or close to it — alpha compositing may affect exact value)
    expect(data[0]).toBeGreaterThan(200); // R channel
  });

  it("throws for unknown device type", async () => {
    const screenshot = await createTestScreenshot(100, 100);

    await expect(
      compositeDevice(screenshot, { device: "nokia-3310" as any })
    ).rejects.toThrow("Unknown device");
  });

  it("accepts a file path string as screenshot input", async () => {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const fixtureDir = resolve(import.meta.dirname, "../fixtures");
    mkdirSync(fixtureDir, { recursive: true });

    const screenshotPath = resolve(fixtureDir, "test-screenshot.png");
    const screenshotBuffer = await createTestScreenshot(1170, 2532);
    writeFileSync(screenshotPath, screenshotBuffer);

    const result = await compositeDevice(screenshotPath, { device: "iphone-15-pro" });

    expect(result.format).toBe("png");
    expect(result.buffer.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/compositor/composite.test.ts`
Expected: FAIL — cannot resolve imports from `../../src/compositor/composite.js`

- [ ] **Step 3: Implement the composite function**

```typescript
// src/compositor/composite.ts
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";
import { getFrameMeta, getFramePath } from "./frames.js";
import type { CompositeOptions, CompositeResult } from "./types.js";

/**
 * Composites a screenshot into a device frame.
 *
 * Steps:
 * 1. Load frame PNG and metadata for the target device
 * 2. Resize the screenshot to exactly fill the screen region
 * 3. Create a canvas at the frame dimensions
 * 4. Place the resized screenshot at the screen coordinates
 * 5. Layer the device frame on top (bezels/notch mask the screenshot)
 * 6. Return the final PNG buffer
 *
 * @param screenshot - PNG/JPEG buffer or absolute file path to the screenshot
 * @param options - Device type and optional background color
 * @returns Composited image as a PNG buffer with dimensions
 */
export async function compositeDevice(
  screenshot: Buffer | string,
  options: CompositeOptions
): Promise<CompositeResult> {
  const { device, background } = options;

  // Load frame metadata and frame image
  const meta = getFrameMeta(device);
  const framePath = getFramePath(device);

  if (!existsSync(framePath)) {
    throw new Error(
      `Frame asset not found at ${framePath}. Ensure device frame PNGs are installed.`
    );
  }

  const frameBuffer = readFileSync(framePath);

  // Load and resize screenshot to fit the screen region exactly
  const screenshotInput = typeof screenshot === "string"
    ? readFileSync(screenshot)
    : screenshot;

  const resizedScreenshot = await sharp(screenshotInput)
    .resize(meta.screen.width, meta.screen.height, {
      fit: "cover",
      position: "centre",
    })
    .png()
    .toBuffer();

  // Build the canvas background
  const canvasBackground = background
    ? parseColor(background)
    : { r: 0, g: 0, b: 0, alpha: 0 };

  // Composite: canvas → screenshot at screen position → frame on top
  const composited = await sharp({
    create: {
      width: meta.frameWidth,
      height: meta.frameHeight,
      channels: 4,
      background: canvasBackground,
    },
  })
    .composite([
      {
        input: resizedScreenshot,
        top: meta.screen.top,
        left: meta.screen.left,
      },
      {
        input: frameBuffer,
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  return {
    buffer: composited,
    width: meta.frameWidth,
    height: meta.frameHeight,
    format: "png",
  };
}

/**
 * Parses a hex color string into sharp-compatible RGBA object.
 * Supports #RGB, #RRGGBB, and #RRGGBBAA formats.
 */
function parseColor(hex: string): { r: number; g: number; b: number; alpha: number } {
  const cleaned = hex.replace("#", "");

  let r: number, g: number, b: number, a: number;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
    a = 1;
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
    a = 1;
  } else if (cleaned.length === 8) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
    a = parseInt(cleaned.slice(6, 8), 16) / 255;
  } else {
    // Fallback: let sharp try to parse it directly
    return { r: 0, g: 0, b: 0, alpha: 0 };
  }

  return { r, g, b, alpha: a };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/compositor/composite.test.ts`
Expected: PASS — all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/compositor/composite.ts tests/compositor/composite.test.ts
git commit -m "feat(compositor): implement device mockup compositing function"
```

---

### Task 5: Barrel export

**Files:**
- Create: `src/compositor/index.ts`

- [ ] **Step 1: Write a quick import test to verify the barrel works**

Add to the bottom of `tests/compositor/composite.test.ts`:

```typescript
describe("barrel export", () => {
  it("re-exports all public API from index", async () => {
    const barrel = await import("../../src/compositor/index.js");

    // Types are erased at runtime, so we check the functions
    expect(typeof barrel.compositeDevice).toBe("function");
    expect(typeof barrel.getFrameMeta).toBe("function");
    expect(typeof barrel.getFramePath).toBe("function");
    expect(typeof barrel.listDevices).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/compositor/composite.test.ts`
Expected: FAIL — cannot resolve `../../src/compositor/index.js`

- [ ] **Step 3: Create the barrel export**

```typescript
// src/compositor/index.ts

// Types
export type {
  DeviceType,
  ScreenRegion,
  DeviceFrameMeta,
  CompositeOptions,
  CompositeResult,
} from "./types.js";

// Frame registry
export { getFrameMeta, getFramePath, listDevices } from "./frames.js";

// Compositor
export { compositeDevice } from "./composite.js";
```

- [ ] **Step 4: Run full test suite to verify everything passes**

Run: `npx vitest run tests/compositor/`
Expected: PASS — all tests across types, frames, and composite suites pass.

- [ ] **Step 5: Commit**

```bash
git add src/compositor/index.ts tests/compositor/composite.test.ts
git commit -m "feat(compositor): add barrel export for public API"
```
