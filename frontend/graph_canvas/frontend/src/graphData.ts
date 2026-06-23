import { Edge, MarkerType, Node } from "@xyflow/react";

import { RawEdge, RawNode } from "./types";

export function getNodeClass(status?: string) {
  if (status === "root") {
    return "graph-node graph-node-root";
  }

  if (status === "affected") {
    return "graph-node graph-node-affected";
  }

  return "graph-node graph-node-normal";
}

export function buildNode(item: RawNode, index: number): Node {
  const x = item.x ?? 120 + (index % 4) * 220;
  const y = item.y ?? 80 + Math.floor(index / 4) * 140;

  return {
    id: String(item.id),
    position: { x, y },
    selected: item.selected ?? false,
    data: {
      label: item.label,
      node_type: item.node_type,
      description: item.description
    },
    className: getNodeClass(item.status),
    type: "componentNode",
    draggable: true,
    selectable: true
  };
}

export function buildNodes(rawNodes: RawNode[]): Node[] {
  return rawNodes.map((item, index) => buildNode(item, index));
}

export function mergeNodes(rawNodes: RawNode[], currentNodes: Node[], resetLayout: boolean): Node[] {
  const currentNodeMap = new Map<string, Node>();

  for (const node of currentNodes) {
    currentNodeMap.set(node.id, node);
  }

  return rawNodes.map((item, index) => {
    const nextNode = buildNode(item, index);
    const currentNode = currentNodeMap.get(nextNode.id);

    if (currentNode && !resetLayout) {
      nextNode.position = currentNode.position;
    }

    return nextNode;
  });
}

export function buildEdges(rawEdges: RawEdge[]): Edge[] {
  return rawEdges.map((item) => {
    const label = item.label ?? item.dependency_type ?? "";

    return {
      id: String(item.id),
      source: String(item.source),
      target: String(item.target),
      sourceHandle: "source-right",
      targetHandle: "target-left",
      label,
      selected: item.selected ?? false,
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed
      },
      className: "graph-edge",
      selectable: true
    };
  });
}

export function buildPositions(nodes: Node[]) {
  const positions: Record<string, { x: number; y: number }> = {};

  for (const node of nodes) {
    positions[node.id] = {
      x: node.position.x,
      y: node.position.y
    };
  }

  return positions;
}

export function getSafeNodeId(rawNodes: RawNode[], currentValue: string) {
  if (rawNodes.length === 0) {
    return "";
  }

  for (const node of rawNodes) {
    if (node.id === currentValue) {
      return currentValue;
    }
  }

  return rawNodes[0].id;
}

export function getSelectedNodeIds(nodes: Node[]) {
  return nodes.filter((node) => node.selected).map((node) => node.id);
}

export function getSelectedEdgeIds(edges: Edge[]) {
  return edges.filter((edge) => edge.selected).map((edge) => edge.id);
}
