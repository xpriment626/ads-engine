export interface TemplateSlot {
  name: string;
  nodeId: string;
  nodeType: "FRAME" | "TEXT" | "IMAGE" | "RECTANGLE";
  description: string;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  slots: TemplateSlot[];
}
