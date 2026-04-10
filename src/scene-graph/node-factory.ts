// src/scene-graph/node-factory.ts
import type {
  FrameNode, TextNode, RectangleNode, ImageNode,
  Paint, Effect, TypeStyle, LayoutMode, AxisAlign, SizingMode, ImageFit,
} from "./types.js";

let counter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++counter}-${Date.now().toString(36)}`;
}

const DEFAULT_STYLE: TypeStyle = {
  fontFamily: "Inter",
  fontSize: 16,
  fontWeight: 400,
  textAlignHorizontal: "LEFT",
  textAlignVertical: "TOP",
  lineHeightPx: 20,
  letterSpacing: 0,
};

interface FrameOpts {
  name: string;
  width: number;
  height: number;
  id?: string;
  x?: number;
  y?: number;
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  cornerRadius?: number;
  opacity?: number;
  visible?: boolean;
  clipsContent?: boolean;
  layoutMode?: LayoutMode;
  primaryAxisAlignItems?: AxisAlign;
  counterAxisAlignItems?: AxisAlign;
  primaryAxisSizingMode?: SizingMode;
  counterAxisSizingMode?: SizingMode;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  children?: FrameNode["children"];
}

export function createFrame(opts: FrameOpts): FrameNode {
  return {
    id: opts.id ?? nextId("frame"),
    type: "FRAME",
    name: opts.name,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width,
    height: opts.height,
    fills: opts.fills ?? [],
    strokes: opts.strokes ?? [],
    effects: opts.effects ?? [],
    cornerRadius: opts.cornerRadius ?? 0,
    opacity: opts.opacity ?? 1,
    visible: opts.visible ?? true,
    clipsContent: opts.clipsContent ?? false,
    layoutMode: opts.layoutMode ?? "NONE",
    primaryAxisAlignItems: opts.primaryAxisAlignItems ?? "MIN",
    counterAxisAlignItems: opts.counterAxisAlignItems ?? "MIN",
    primaryAxisSizingMode: opts.primaryAxisSizingMode ?? "FIXED",
    counterAxisSizingMode: opts.counterAxisSizingMode ?? "FIXED",
    paddingLeft: opts.paddingLeft ?? 0,
    paddingRight: opts.paddingRight ?? 0,
    paddingTop: opts.paddingTop ?? 0,
    paddingBottom: opts.paddingBottom ?? 0,
    itemSpacing: opts.itemSpacing ?? 0,
    children: opts.children ?? [],
  };
}

interface TextOpts {
  name: string;
  characters: string;
  width: number;
  height: number;
  id?: string;
  x?: number;
  y?: number;
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  opacity?: number;
  visible?: boolean;
  style?: Partial<TypeStyle>;
}

export function createText(opts: TextOpts): TextNode {
  return {
    id: opts.id ?? nextId("text"),
    type: "TEXT",
    name: opts.name,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width,
    height: opts.height,
    fills: opts.fills ?? [],
    strokes: opts.strokes ?? [],
    effects: opts.effects ?? [],
    opacity: opts.opacity ?? 1,
    visible: opts.visible ?? true,
    characters: opts.characters,
    style: { ...DEFAULT_STYLE, ...opts.style },
  };
}

interface RectangleOpts {
  name: string;
  width: number;
  height: number;
  id?: string;
  x?: number;
  y?: number;
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  cornerRadius?: number;
  opacity?: number;
  visible?: boolean;
}

export function createRectangle(opts: RectangleOpts): RectangleNode {
  return {
    id: opts.id ?? nextId("rect"),
    type: "RECTANGLE",
    name: opts.name,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width,
    height: opts.height,
    fills: opts.fills ?? [],
    strokes: opts.strokes ?? [],
    effects: opts.effects ?? [],
    cornerRadius: opts.cornerRadius ?? 0,
    opacity: opts.opacity ?? 1,
    visible: opts.visible ?? true,
  };
}

interface ImageOpts {
  name: string;
  source: string;
  width: number;
  height: number;
  id?: string;
  x?: number;
  y?: number;
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  opacity?: number;
  visible?: boolean;
  fit?: ImageFit;
}

export function createImage(opts: ImageOpts): ImageNode {
  return {
    id: opts.id ?? nextId("img"),
    type: "IMAGE",
    name: opts.name,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width,
    height: opts.height,
    fills: opts.fills ?? [],
    strokes: opts.strokes ?? [],
    effects: opts.effects ?? [],
    opacity: opts.opacity ?? 1,
    visible: opts.visible ?? true,
    source: opts.source,
    fit: opts.fit ?? "cover",
  };
}
