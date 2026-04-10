// src/scene-graph/types.ts

// --- Color ---
export interface Color {
  r: number; // 0-1
  g: number;
  b: number;
  a: number;
}

// --- Paints ---
export interface SolidPaint {
  type: "SOLID";
  color: Color;
  opacity?: number;
}

export interface ColorStop {
  position: number; // 0-1
  color: Color;
}

export interface GradientPaint {
  type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL";
  stops: ColorStop[];
  opacity?: number;
}

export interface ImagePaint {
  type: "IMAGE";
  source: string; // URL or data URI
  scaleMode?: "FILL" | "FIT" | "CROP" | "TILE";
  opacity?: number;
}

export type Paint = SolidPaint | GradientPaint | ImagePaint;

// --- Effects ---
export interface DropShadowEffect {
  type: "DROP_SHADOW";
  color: Color;
  offset: { x: number; y: number };
  radius: number;
  visible?: boolean;
}

export interface BlurEffect {
  type: "LAYER_BLUR";
  radius: number;
  visible?: boolean;
}

export type Effect = DropShadowEffect | BlurEffect;

// --- Typography ---
export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textAlignHorizontal: "LEFT" | "CENTER" | "RIGHT";
  textAlignVertical: "TOP" | "CENTER" | "BOTTOM";
  lineHeightPx: number;
  letterSpacing: number;
}

// --- Layout types ---
export type LayoutMode = "NONE" | "HORIZONTAL" | "VERTICAL";
export type AxisAlign = "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
export type SizingMode = "FIXED" | "HUG" | "FILL";
export type ImageFit = "cover" | "contain" | "fill";

// --- Base node ---
export interface BaseNode {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  fills: Paint[];
  strokes: Paint[];
  effects: Effect[];
}

// --- Frame ---
export interface FrameNode extends BaseNode {
  type: "FRAME";
  cornerRadius: number;
  clipsContent: boolean;
  layoutMode: LayoutMode;
  primaryAxisAlignItems: AxisAlign;
  counterAxisAlignItems: AxisAlign;
  primaryAxisSizingMode: SizingMode;
  counterAxisSizingMode: SizingMode;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  itemSpacing: number;
  children: SceneNode[];
}

// --- Text ---
export interface TextNode extends BaseNode {
  type: "TEXT";
  characters: string;
  style: TypeStyle;
}

// --- Rectangle ---
export interface RectangleNode extends BaseNode {
  type: "RECTANGLE";
  cornerRadius: number;
}

// --- Image ---
export interface ImageNode extends BaseNode {
  type: "IMAGE";
  source: string;
  fit: ImageFit;
}

// --- Union ---
export type SceneNode = FrameNode | TextNode | RectangleNode | ImageNode;

// --- Type guard helpers ---
export function isFrame(node: SceneNode): node is FrameNode {
  return node.type === "FRAME";
}

export function isText(node: SceneNode): node is TextNode {
  return node.type === "TEXT";
}

export function isRectangle(node: SceneNode): node is RectangleNode {
  return node.type === "RECTANGLE";
}

export function isImage(node: SceneNode): node is ImageNode {
  return node.type === "IMAGE";
}
