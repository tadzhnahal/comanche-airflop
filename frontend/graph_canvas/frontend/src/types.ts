export type RawNode = {
  id: string;
  label: string;
  node_type?: string;
  description?: string;
  x?: number;
  y?: number;
  status?: string;
  selected?: boolean;
};

export type RawEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  dependency_type?: string;
  selected?: boolean;
};

export type CanvasEvent = {
  event_type: string;
  target_type: string;
  node_ids: string[];
  edge_ids: string[];
  positions: Record<string, { x: number; y: number }>;
  payload?: Record<string, unknown>;
};

export type MenuTargetType = "component" | "dependency" | "none";
