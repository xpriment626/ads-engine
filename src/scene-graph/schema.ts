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
