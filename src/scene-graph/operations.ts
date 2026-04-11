import type { SceneNode, FrameNode } from "./types.js";
import { isFrame } from "./types.js";

function clone<T extends SceneNode>(node: T): T {
  return JSON.parse(JSON.stringify(node));
}

export function findNode(root: SceneNode, id: string): SceneNode | undefined {
  if (root.id === id) return root;
  if (isFrame(root)) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return undefined;
}

function findParent(root: SceneNode, targetId: string): FrameNode | undefined {
  if (isFrame(root)) {
    for (const child of root.children) {
      if (child.id === targetId) return root;
      const found = findParent(child, targetId);
      if (found) return found;
    }
  }
  return undefined;
}

export function insertNode(root: FrameNode, parentId: string, node: SceneNode): FrameNode {
  const tree = clone(root);
  const parent = findNode(tree, parentId);
  if (!parent) throw new Error(`Parent "${parentId}" not found`);
  if (!isFrame(parent)) throw new Error(`Parent "${parentId}" is not a FRAME`);
  parent.children.push(node);
  return tree;
}

export function updateNode(root: FrameNode, nodeId: string, props: Record<string, unknown>): FrameNode {
  const tree = clone(root);
  const node = findNode(tree, nodeId);
  if (!node) throw new Error(`Node "${nodeId}" not found`);
  Object.assign(node, props);
  return tree;
}

export function deleteNode(root: FrameNode, nodeId: string): FrameNode {
  if (root.id === nodeId) throw new Error("Cannot delete root node");
  const tree = clone(root);
  const parent = findParent(tree, nodeId);
  if (!parent) throw new Error(`Node "${nodeId}" not found`);
  parent.children = parent.children.filter((c) => c.id !== nodeId);
  return tree;
}

export function moveNode(root: FrameNode, nodeId: string, newParentId: string): FrameNode {
  const tree = clone(root);
  const oldParent = findParent(tree, nodeId);
  if (!oldParent) throw new Error(`Node "${nodeId}" not found`);
  const node = oldParent.children.find((c) => c.id === nodeId);
  if (!node) throw new Error(`Node "${nodeId}" not found in parent`);
  oldParent.children = oldParent.children.filter((c) => c.id !== nodeId);
  const newParent = findNode(tree, newParentId);
  if (!newParent) throw new Error(`New parent "${newParentId}" not found`);
  if (!isFrame(newParent)) throw new Error(`New parent "${newParentId}" is not a FRAME`);
  newParent.children.push(node);
  return tree;
}

export function replaceNode(root: FrameNode, nodeId: string, newNode: SceneNode): FrameNode {
  const tree = clone(root);
  const parent = findParent(tree, nodeId);
  if (!parent) throw new Error(`Node "${nodeId}" not found`);
  const idx = parent.children.findIndex((c) => c.id === nodeId);
  parent.children[idx] = newNode;
  return tree;
}
