import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlow,
  useEdgesState,
  useNodesState
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ComponentProps, Streamlit } from "streamlit-component-lib";

import CreateMenu from "./components/CreateMenu";
import DeleteMenu from "./components/DeleteMenu";
import EditMenu from "./components/EditMenu";
import Toolbar from "./components/Toolbar";
import {
  buildEdges,
  buildNodes,
  buildPositions,
  getSafeNodeId,
  getSelectedEdgeIds,
  getSelectedNodeIds,
  mergeNodes
} from "./graphData";
import { CanvasEvent, MenuTargetType, RawEdge, RawNode } from "./types";

function GraphCanvas(props: ComponentProps) {
  const rawNodes = (props.args["nodes"] ?? []) as RawNode[];
  const rawEdges = (props.args["edges"] ?? []) as RawEdge[];
  const height = (props.args["height"] ?? 680) as number;
  const analysisMode = (props.args["analysis_mode"] ?? false) as boolean;
  const layoutVersion = (props.args["layout_version"] ?? 0) as number;

  const initialNodes = useMemo(() => buildNodes(rawNodes), [rawNodes]);
  const initialEdges = useMemo(() => buildEdges(rawEdges), [rawEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createMenuTab, setCreateMenuTab] = useState<"component" | "dependency">("component");

  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [editTargetType, setEditTargetType] = useState<MenuTargetType>("none");

  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<MenuTargetType>("none");

  const [componentName, setComponentName] = useState("");
  const [componentType, setComponentType] = useState("source");
  const [componentDescription, setComponentDescription] = useState("");

  const [sourceNodeId, setSourceNodeId] = useState("");
  const [targetNodeId, setTargetNodeId] = useState("");
  const [dependencyType, setDependencyType] = useState("hard");

  const [editComponentId, setEditComponentId] = useState("");
  const [editComponentName, setEditComponentName] = useState("");
  const [editComponentType, setEditComponentType] = useState("source");
  const [editComponentDescription, setEditComponentDescription] = useState("");

  const [editDependencyId, setEditDependencyId] = useState("");
  const [editSourceNodeId, setEditSourceNodeId] = useState("");
  const [editTargetNodeId, setEditTargetNodeId] = useState("");
  const [editDependencyType, setEditDependencyType] = useState("hard");

  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [deleteTargetLabel, setDeleteTargetLabel] = useState("");

  const [spacePressed, setSpacePressed] = useState(false);

  const latestNodesRef = useRef<Node[]>(initialNodes);
  const latestEdgesRef = useRef<Edge[]>(initialEdges);
  const layoutVersionRef = useRef(layoutVersion);

  const selectionChangedRef = useRef(false);
  const selectedNodeIdsRef = useRef<string[]>([]);
  const selectedEdgeIdsRef = useRef<string[]>([]);

  const nodeDragHappenedRef = useRef(false);
  const skipNextSelectionSendRef = useRef(false);
  const ignoreNextPaneClickRef = useRef(false);

  useEffect(() => {
    latestNodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    latestEdgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    const resetLayout = layoutVersionRef.current !== layoutVersion;
    layoutVersionRef.current = layoutVersion;

    setNodes((currentNodes) => {
      const mergedNodes = mergeNodes(rawNodes, currentNodes, resetLayout);
      latestNodesRef.current = mergedNodes;
      return mergedNodes;
    });

    setEdges(buildEdges(rawEdges));

    setSourceNodeId((currentValue) => getSafeNodeId(rawNodes, currentValue));
    setTargetNodeId((currentValue) => getSafeNodeId(rawNodes, currentValue));
    setEditSourceNodeId((currentValue) => getSafeNodeId(rawNodes, currentValue));
    setEditTargetNodeId((currentValue) => getSafeNodeId(rawNodes, currentValue));
  }, [rawNodes, rawEdges, layoutVersion, setNodes, setEdges]);

  useEffect(() => {
    Streamlit.setFrameHeight(height + 20);
  }, [height]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const sendEvent = useCallback((event: CanvasEvent) => {
    Streamlit.setComponentValue({
      ...event,
      timestamp: Date.now()
    });
  }, []);

  const sendSimpleEvent = useCallback(
    (
      eventType: string,
      targetType: string,
      nodeIds: string[],
      edgeIds: string[],
      payload?: Record<string, unknown>
    ) => {
      sendEvent({
        event_type: eventType,
        target_type: targetType,
        node_ids: nodeIds,
        edge_ids: edgeIds,
        positions: buildPositions(latestNodesRef.current),
        payload
      });
    },
    [sendEvent]
  );

  useEffect(() => {
    const sendSelectionOnMouseUp = () => {
      if (nodeDragHappenedRef.current) {
        nodeDragHappenedRef.current = false;
        selectionChangedRef.current = false;
        return;
      }

      if (skipNextSelectionSendRef.current) {
        skipNextSelectionSendRef.current = false;
        selectionChangedRef.current = false;
        return;
      }

      if (!selectionChangedRef.current) {
        return;
      }

      selectionChangedRef.current = false;
      ignoreNextPaneClickRef.current = true;

      sendEvent({
        event_type: "selection_change",
        target_type: "selection",
        node_ids: selectedNodeIdsRef.current,
        edge_ids: selectedEdgeIdsRef.current,
        positions: buildPositions(latestNodesRef.current)
      });

      window.setTimeout(() => {
        ignoreNextPaneClickRef.current = false;
      }, 250);
    };

    window.addEventListener("mouseup", sendSelectionOnMouseUp);

    return () => {
      window.removeEventListener("mouseup", sendSelectionOnMouseUp);
    };
  }, [sendEvent]);

  const closeMenus = () => {
    setCreateMenuOpen(false);
    setEditMenuOpen(false);
    setDeleteMenuOpen(false);
  };

  const createComponent = () => {
    const cleanName = componentName.trim();

    if (!cleanName) {
      return;
    }

    sendSimpleEvent("create_component", "toolbar", [], [], {
      name: cleanName,
      component_type: componentType,
      description: componentDescription.trim()
    });

    setComponentName("");
    setComponentDescription("");
    closeMenus();
  };

  const createDependency = () => {
    if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) {
      return;
    }

    sendSimpleEvent("create_dependency", "toolbar", [], [], {
      source_component_id: sourceNodeId,
      target_component_id: targetNodeId,
      dependency_type: dependencyType
    });

    closeMenus();
  };

  const openEditMenu = () => {
    const selectedNodeIds = getSelectedNodeIds(latestNodesRef.current);
    const selectedEdgeIds = getSelectedEdgeIds(latestEdgesRef.current);

    setCreateMenuOpen(false);
    setDeleteMenuOpen(false);

    if (selectedNodeIds.length === 1 && selectedEdgeIds.length === 0) {
      const selectedNode = rawNodes.find((node) => node.id === selectedNodeIds[0]);

      if (!selectedNode) {
        return;
      }

      setEditTargetType("component");
      setEditComponentId(selectedNode.id);
      setEditComponentName(selectedNode.label);
      setEditComponentType(selectedNode.node_type || "other");
      setEditComponentDescription(selectedNode.description || "");
      setEditMenuOpen(true);
      return;
    }

    if (selectedEdgeIds.length === 1 && selectedNodeIds.length === 0) {
      const selectedEdge = rawEdges.find((edge) => edge.id === selectedEdgeIds[0]);

      if (!selectedEdge) {
        return;
      }

      setEditTargetType("dependency");
      setEditDependencyId(selectedEdge.id);
      setEditSourceNodeId(selectedEdge.source);
      setEditTargetNodeId(selectedEdge.target);
      setEditDependencyType(selectedEdge.dependency_type || "hard");
      setEditMenuOpen(true);
      return;
    }

    setEditTargetType("none");
    setEditMenuOpen(true);
  };

  const updateComponent = () => {
    const cleanName = editComponentName.trim();

    if (!editComponentId || !cleanName) {
      return;
    }

    sendSimpleEvent("update_component", "toolbar", [editComponentId], [], {
      component_id: editComponentId,
      name: cleanName,
      component_type: editComponentType,
      description: editComponentDescription.trim()
    });

    closeMenus();
  };

  const updateDependency = () => {
    if (!editDependencyId || !editSourceNodeId || !editTargetNodeId) {
      return;
    }

    if (editSourceNodeId === editTargetNodeId) {
      return;
    }

    sendSimpleEvent("update_dependency", "toolbar", [], [editDependencyId], {
      dependency_id: editDependencyId,
      source_component_id: editSourceNodeId,
      target_component_id: editTargetNodeId,
      dependency_type: editDependencyType
    });

    closeMenus();
  };

  const openDeleteMenu = () => {
    const selectedNodeIds = getSelectedNodeIds(latestNodesRef.current);
    const selectedEdgeIds = getSelectedEdgeIds(latestEdgesRef.current);

    setCreateMenuOpen(false);
    setEditMenuOpen(false);

    if (selectedNodeIds.length === 1 && selectedEdgeIds.length === 0) {
      const selectedNode = rawNodes.find((node) => node.id === selectedNodeIds[0]);

      setDeleteTargetType("component");
      setDeleteTargetId(selectedNodeIds[0]);
      setDeleteTargetLabel(selectedNode ? selectedNode.label : selectedNodeIds[0]);
      setDeleteMenuOpen(true);
      return;
    }

    if (selectedEdgeIds.length === 1 && selectedNodeIds.length === 0) {
      const selectedEdge = rawEdges.find((edge) => edge.id === selectedEdgeIds[0]);

      setDeleteTargetType("dependency");
      setDeleteTargetId(selectedEdgeIds[0]);
      setDeleteTargetLabel(selectedEdge ? `${selectedEdge.source} -> ${selectedEdge.target}` : selectedEdgeIds[0]);
      setDeleteMenuOpen(true);
      return;
    }

    setDeleteTargetType("none");
    setDeleteTargetId("");
    setDeleteTargetLabel("");
    setDeleteMenuOpen(true);
  };

  const deleteSelectedObject = () => {
    if (deleteTargetType === "component") {
      sendSimpleEvent("delete_component", "toolbar", [deleteTargetId], [], {
        component_id: deleteTargetId
      });
      closeMenus();
      return;
    }

    if (deleteTargetType === "dependency") {
      sendSimpleEvent("delete_dependency", "toolbar", [], [deleteTargetId], {
        dependency_id: deleteTargetId
      });
      closeMenus();
    }
  };

  const handleSelectionChange = useCallback((selectedNodes: Node[], selectedEdges: Edge[]) => {
    selectedNodeIdsRef.current = selectedNodes.map((node) => node.id);
    selectedEdgeIdsRef.current = selectedEdges.map((edge) => edge.id);
    selectionChangedRef.current = true;
  }, []);

  return (
    <div className={spacePressed ? "graph-canvas-shell graph-space-mode" : "graph-canvas-shell"} style={{ height }}>
      <div
        className="graph-floating-tools"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Toolbar
          analysisMode={analysisMode}
          createMenuOpen={createMenuOpen}
          editMenuOpen={editMenuOpen}
          deleteMenuOpen={deleteMenuOpen}
          latestNodesRef={latestNodesRef}
          latestEdgesRef={latestEdgesRef}
          setCreateMenuOpen={setCreateMenuOpen}
          setEditMenuOpen={setEditMenuOpen}
          setDeleteMenuOpen={setDeleteMenuOpen}
          openEditMenu={openEditMenu}
          openDeleteMenu={openDeleteMenu}
          sendSimpleEvent={sendSimpleEvent}
        />

        {createMenuOpen && (
          <CreateMenu
            rawNodes={rawNodes}
            createMenuTab={createMenuTab}
            setCreateMenuTab={setCreateMenuTab}
            componentName={componentName}
            setComponentName={setComponentName}
            componentType={componentType}
            setComponentType={setComponentType}
            componentDescription={componentDescription}
            setComponentDescription={setComponentDescription}
            sourceNodeId={sourceNodeId}
            setSourceNodeId={setSourceNodeId}
            targetNodeId={targetNodeId}
            setTargetNodeId={setTargetNodeId}
            dependencyType={dependencyType}
            setDependencyType={setDependencyType}
            createComponent={createComponent}
            createDependency={createDependency}
          />
        )}

        {editMenuOpen && (
          <EditMenu
            rawNodes={rawNodes}
            editTargetType={editTargetType}
            editComponentName={editComponentName}
            setEditComponentName={setEditComponentName}
            editComponentType={editComponentType}
            setEditComponentType={setEditComponentType}
            editComponentDescription={editComponentDescription}
            setEditComponentDescription={setEditComponentDescription}
            editSourceNodeId={editSourceNodeId}
            setEditSourceNodeId={setEditSourceNodeId}
            editTargetNodeId={editTargetNodeId}
            setEditTargetNodeId={setEditTargetNodeId}
            editDependencyType={editDependencyType}
            setEditDependencyType={setEditDependencyType}
            updateComponent={updateComponent}
            updateDependency={updateDependency}
          />
        )}

        {deleteMenuOpen && (
          <DeleteMenu
            deleteTargetType={deleteTargetType}
            deleteTargetLabel={deleteTargetLabel}
            deleteSelectedObject={deleteSelectedObject}
          />
        )}
      </div>

      {analysisMode && (
        <div className="graph-mode-badge">
          Анализ: кликните по узлу
        </div>
      )}

      {spacePressed && (
        <div className="graph-space-badge">
          Перемещение карты
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        panOnDrag={spacePressed}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable
        nodesFocusable
        elementsSelectable
        selectionOnDrag={!spacePressed}
        selectionKeyCode={null}
        multiSelectionKeyCode={["Meta", "Control", "Shift"]}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={() => {
          if (ignoreNextPaneClickRef.current) {
            return;
          }

          closeMenus();
          sendSimpleEvent("pane_click", "pane", [], []);
        }}
        onNodeClick={(event, node) => {
          if (analysisMode) {
            sendSimpleEvent("run_analysis", "node", [node.id], []);
            return;
          }

          const isMultiClick = event.shiftKey || event.ctrlKey || event.metaKey;

          if (isMultiClick) {
            return;
          }

          skipNextSelectionSendRef.current = true;
          sendSimpleEvent("node_click", "node", [node.id], []);
        }}
        onNodeDoubleClick={(event) => {
          event.preventDefault();
        }}
        onNodeContextMenu={(event, node) => {
          event.preventDefault();
          skipNextSelectionSendRef.current = true;
          sendSimpleEvent("node_context_menu", "node", [node.id], []);
        }}
        onEdgeClick={(_, edge) => {
          skipNextSelectionSendRef.current = true;
          sendSimpleEvent("edge_click", "edge", [], [edge.id]);
        }}
        onEdgeContextMenu={(event, edge) => {
          event.preventDefault();
          skipNextSelectionSendRef.current = true;
          sendSimpleEvent("edge_context_menu", "edge", [], [edge.id]);
        }}
        onNodeDragStart={() => {
          nodeDragHappenedRef.current = true;
        }}
        onNodeDragStop={(_, node) => {
          window.requestAnimationFrame(() => {
            sendEvent({
              event_type: "node_drag_stop",
              target_type: "node",
              node_ids: [node.id],
              edge_ids: [],
              positions: buildPositions(latestNodesRef.current)
            });
          });
        }}
        onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
          handleSelectionChange(selectedNodes, selectedEdges);
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
