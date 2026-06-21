import React, { useCallback, useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  ReactFlow,
  useEdgesState,
  useNodesState
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ComponentProps, Streamlit } from "streamlit-component-lib";

type RawNode = {
  id: string;
  label: string;
  node_type?: string;
  description?: string;
  x?: number;
  y?: number;
  status?: string;
};

type RawEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  dependency_type?: string;
};

type CanvasEvent = {
  event_type: string;
  target_type: string;
  node_ids: string[];
  edge_ids: string[];
  positions: Record<string, { x: number; y: number }>;
};

function getNodeClass(status?: string) {
  if (status === "root") {
    return "graph-node graph-node-root";
  }

  if (status === "affected") {
    return "graph-node graph-node-affected";
  }

  return "graph-node graph-node-normal";
}

function buildNodes(rawNodes: RawNode[]): Node[] {
  return rawNodes.map((item, index) => {
    const x = item.x ?? 120 + (index % 4) * 220;
    const y = item.y ?? 80 + Math.floor(index / 4) * 140;

    return {
      id: String(item.id),
      position: { x, y },
      data: {
        label: item.label,
        node_type: item.node_type,
        description: item.description
      },
      className: getNodeClass(item.status),
      type: "default"
    };
  });
}

function buildEdges(rawEdges: RawEdge[]): Edge[] {
  return rawEdges.map((item) => {
    const label = item.label ?? item.dependency_type ?? "";

    return {
      id: String(item.id),
      source: String(item.source),
      target: String(item.target),
      label,
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed
      },
      className: "graph-edge"
    };
  });
}

function buildPositions(nodes: Node[]) {
  const positions: Record<string, { x: number; y: number }> = {};

  for (const node of nodes) {
    positions[node.id] = {
      x: node.position.x,
      y: node.position.y
    };
  }

  return positions;
}

function GraphCanvas(props: ComponentProps) {
  const rawNodes = (props.args["nodes"] ?? []) as RawNode[];
  const rawEdges = (props.args["edges"] ?? []) as RawEdge[];
  const height = (props.args["height"] ?? 620) as number;

  const initialNodes = useMemo(() => buildNodes(rawNodes), [rawNodes]);
  const initialEdges = useMemo(() => buildEdges(rawEdges), [rawEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(buildNodes(rawNodes));
    setEdges(buildEdges(rawEdges));
  }, [rawNodes, rawEdges, setNodes, setEdges]);

  useEffect(() => {
    Streamlit.setFrameHeight(height + 20);
  }, [height]);

  const sendEvent = useCallback(
    (event: CanvasEvent) => {
      Streamlit.setComponentValue({
        ...event,
        timestamp: Date.now()
      });
    },
    []
  );

  const sendSimpleEvent = useCallback(
    (eventType: string, targetType: string, nodeIds: string[], edgeIds: string[]) => {
      sendEvent({
        event_type: eventType,
        target_type: targetType,
        node_ids: nodeIds,
        edge_ids: edgeIds,
        positions: buildPositions(nodes)
      });
    },
    [nodes, sendEvent]
  );

  return (
    <div className="graph-canvas-shell" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable
        nodesFocusable
        elementsSelectable
        selectionOnDrag={false}
        multiSelectionKeyCode={["Meta", "Control", "Shift"]}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={() => {
          sendSimpleEvent("pane_click", "pane", [], []);
        }}
        onNodeClick={(_, node) => {
          sendSimpleEvent("node_click", "node", [node.id], []);
        }}
        onNodeDoubleClick={(event) => {
          event.preventDefault();
        }}
        onNodeContextMenu={(event, node) => {
          event.preventDefault();
          sendSimpleEvent("node_context_menu", "node", [node.id], []);
        }}
        onEdgeClick={(_, edge) => {
          sendSimpleEvent("edge_click", "edge", [], [edge.id]);
        }}
        onEdgeContextMenu={(event, edge) => {
          event.preventDefault();
          sendSimpleEvent("edge_context_menu", "edge", [], [edge.id]);
        }}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

export default GraphCanvas;
