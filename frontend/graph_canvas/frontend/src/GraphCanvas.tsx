import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  selected?: boolean;
};

type RawEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  dependency_type?: string;
  selected?: boolean;
};

type CanvasEvent = {
  event_type: string;
  target_type: string;
  node_ids: string[];
  edge_ids: string[];
  positions: Record<string, { x: number; y: number }>;
  payload?: Record<string, unknown>;
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

function buildNode(item: RawNode, index: number): Node {
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
    type: "default",
    draggable: true,
    selectable: true
  };
}

function buildNodes(rawNodes: RawNode[]): Node[] {
  return rawNodes.map((item, index) => buildNode(item, index));
}

function mergeNodes(rawNodes: RawNode[], currentNodes: Node[], resetLayout: boolean): Node[] {
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

function buildEdges(rawEdges: RawEdge[]): Edge[] {
  return rawEdges.map((item) => {
    const label = item.label ?? item.dependency_type ?? "";

    return {
      id: String(item.id),
      source: String(item.source),
      target: String(item.target),
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

function getSafeNodeId(rawNodes: RawNode[], currentValue: string) {
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

function getSelectedNodeIds(nodes: Node[]) {
  return nodes.filter((node) => node.selected).map((node) => node.id);
}

function getSelectedEdgeIds(edges: Edge[]) {
  return edges.filter((edge) => edge.selected).map((edge) => edge.id);
}

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
  const [editTargetType, setEditTargetType] = useState<"component" | "dependency" | "none">("none");

  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<"component" | "dependency" | "none">("none");

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
        <button
          className="graph-tool-button"
          title="Создать компонент или связь"
          onClick={() => {
            setCreateMenuOpen(!createMenuOpen);
            setEditMenuOpen(false);
            setDeleteMenuOpen(false);
          }}
        >
          +
        </button>

        <button
          className={editMenuOpen ? "graph-tool-button graph-tool-active" : "graph-tool-button"}
          title="Редактировать выбранный объект"
          onClick={openEditMenu}
        >
          ✎
        </button>

        <button
          className={analysisMode ? "graph-tool-button graph-tool-active" : "graph-tool-button"}
          title="Анализ"
          onClick={() => {
            const selectedNodeIds = getSelectedNodeIds(latestNodesRef.current);
            const selectedEdgeIds = getSelectedEdgeIds(latestEdgesRef.current);

            sendSimpleEvent(
              "analysis_button_click",
              "toolbar",
              selectedNodeIds,
              selectedEdgeIds
            );
          }}
        >
          ◎
        </button>

        <button
          className="graph-tool-button"
          title="Сбросить раскладку"
          onClick={() => sendSimpleEvent("reset_layout", "toolbar", [], [])}
        >
          ↻
        </button>

        <button
          className={deleteMenuOpen ? "graph-tool-button graph-tool-danger graph-tool-active" : "graph-tool-button graph-tool-danger"}
          title="Удалить выбранный объект"
          onClick={openDeleteMenu}
        >
          ×
        </button>

        {createMenuOpen && (
          <div className="graph-popup-menu">
            <div className="graph-menu-tabs">
              <button
                className={createMenuTab === "component" ? "graph-menu-tab-active" : ""}
                onClick={() => setCreateMenuTab("component")}
              >
                Компонент
              </button>
              <button
                className={createMenuTab === "dependency" ? "graph-menu-tab-active" : ""}
                onClick={() => setCreateMenuTab("dependency")}
              >
                Связь
              </button>
            </div>

            {createMenuTab === "component" && (
              <div className="graph-menu-form">
                <label>
                  Название
                  <input
                    value={componentName}
                    onChange={(event) => setComponentName(event.target.value)}
                    placeholder="events_mart"
                  />
                </label>

                <label>
                  Тип
                  <select
                    value={componentType}
                    onChange={(event) => setComponentType(event.target.value)}
                  >
                    <option value="source">source</option>
                    <option value="mart">mart</option>
                    <option value="dashboard">dashboard</option>
                    <option value="service">service</option>
                    <option value="report">report</option>
                    <option value="other">other</option>
                  </select>
                </label>

                <label>
                  Описание
                  <textarea
                    value={componentDescription}
                    onChange={(event) => setComponentDescription(event.target.value)}
                    placeholder="Короткое описание"
                  />
                </label>

                <button
                  className="graph-menu-submit"
                  type="button"
                  onClick={createComponent}
                >
                  Создать
                </button>
              </div>
            )}

            {createMenuTab === "dependency" && (
              <div className="graph-menu-form">
                <label>
                  Откуда
                  <select
                    value={sourceNodeId}
                    onChange={(event) => setSourceNodeId(event.target.value)}
                  >
                    {rawNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Куда
                  <select
                    value={targetNodeId}
                    onChange={(event) => setTargetNodeId(event.target.value)}
                  >
                    {rawNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Тип
                  <select
                    value={dependencyType}
                    onChange={(event) => setDependencyType(event.target.value)}
                  >
                    <option value="hard">hard</option>
                    <option value="soft">soft</option>
                  </select>
                </label>

                <button
                  className="graph-menu-submit"
                  type="button"
                  onClick={createDependency}
                  disabled={rawNodes.length < 2 || sourceNodeId === targetNodeId}
                >
                  Создать
                </button>
              </div>
            )}
          </div>
        )}

        {editMenuOpen && (
          <div className="graph-popup-menu">
            {editTargetType === "none" && (
              <div className="graph-menu-empty">
                Выберите один компонент или одну связь.
              </div>
            )}

            {editTargetType === "component" && (
              <div className="graph-menu-form">
                <div className="graph-menu-title">Редактировать компонент</div>

                <label>
                  Название
                  <input
                    value={editComponentName}
                    onChange={(event) => setEditComponentName(event.target.value)}
                  />
                </label>

                <label>
                  Тип
                  <select
                    value={editComponentType}
                    onChange={(event) => setEditComponentType(event.target.value)}
                  >
                    <option value="source">source</option>
                    <option value="mart">mart</option>
                    <option value="dashboard">dashboard</option>
                    <option value="service">service</option>
                    <option value="report">report</option>
                    <option value="other">other</option>
                  </select>
                </label>

                <label>
                  Описание
                  <textarea
                    value={editComponentDescription}
                    onChange={(event) => setEditComponentDescription(event.target.value)}
                  />
                </label>

                <button
                  className="graph-menu-submit"
                  type="button"
                  onClick={updateComponent}
                >
                  Сохранить
                </button>
              </div>
            )}

            {editTargetType === "dependency" && (
              <div className="graph-menu-form">
                <div className="graph-menu-title">Редактировать связь</div>

                <label>
                  Откуда
                  <select
                    value={editSourceNodeId}
                    onChange={(event) => setEditSourceNodeId(event.target.value)}
                  >
                    {rawNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Куда
                  <select
                    value={editTargetNodeId}
                    onChange={(event) => setEditTargetNodeId(event.target.value)}
                  >
                    {rawNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Тип
                  <select
                    value={editDependencyType}
                    onChange={(event) => setEditDependencyType(event.target.value)}
                  >
                    <option value="hard">hard</option>
                    <option value="soft">soft</option>
                  </select>
                </label>

                <button
                  className="graph-menu-submit"
                  type="button"
                  onClick={updateDependency}
                  disabled={editSourceNodeId === editTargetNodeId}
                >
                  Сохранить
                </button>
              </div>
            )}
          </div>
        )}

        {deleteMenuOpen && (
          <div className="graph-popup-menu">
            {deleteTargetType === "none" && (
              <div className="graph-menu-empty">
                Выберите один компонент или одну связь.
              </div>
            )}

            {deleteTargetType !== "none" && (
              <div className="graph-menu-form">
                <div className="graph-menu-title">Удалить объект</div>
                <div className="graph-delete-text">
                  {deleteTargetType === "component" ? "Компонент" : "Связь"}: {deleteTargetLabel}
                </div>

                <button
                  className="graph-menu-submit graph-menu-delete"
                  type="button"
                  onClick={deleteSelectedObject}
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
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

