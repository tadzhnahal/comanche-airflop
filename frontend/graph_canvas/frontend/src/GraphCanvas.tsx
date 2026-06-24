import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  PanOnScrollMode,
  ReactFlow,
  reconnectEdge,
  useEdgesState,
  useNodesState
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ComponentProps, Streamlit } from "streamlit-component-lib";

import ComponentNode from "./components/ComponentNode";
import ContextMenu, { ContextMenuState } from "./components/ContextMenu";
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

const closedContextMenu: ContextMenuState = {
  isOpen: false,
  targetType: "pane",
  x: 0,
  y: 0
};

type TouchContext = {
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
  target: EventTarget | null;
  time: number;
};

function getTouchCenter(touches: React.TouchList) {
  const firstTouch = touches.item(0);
  const secondTouch = touches.item(1);

  if (!firstTouch || !secondTouch) {
    return null;
  }

  return {
    clientX: (firstTouch.clientX + secondTouch.clientX) / 2,
    clientY: (firstTouch.clientY + secondTouch.clientY) / 2
  };
}

function getNodeIdFromTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return "";
  }

  const nodeElement = target.closest(".react-flow__node");

  if (!nodeElement) {
    return "";
  }

  return nodeElement.getAttribute("data-id") || "";
}

function getEdgeIdFromTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return "";
  }

  const edgeElement = target.closest(".react-flow__edge");

  if (!edgeElement) {
    return "";
  }

  const dataId = edgeElement.getAttribute("data-id");

  if (dataId) {
    return dataId;
  }

  const elementId = edgeElement.getAttribute("id") || "";

  if (elementId.startsWith("react-flow__edge-")) {
    return elementId.replace("react-flow__edge-", "");
  }

  return "";
}

function getEdgeDependencyType(rawEdges: RawEdge[], edgeId: string) {
  const rawEdge = rawEdges.find((edge) => String(edge.id) === String(edgeId));

  if (!rawEdge) {
    return "hard";
  }

  return rawEdge.dependency_type || "hard";
}

function isMultiSelectEvent(event: React.MouseEvent) {
  return event.shiftKey || event.ctrlKey || event.metaKey;
}

function GraphCanvas(props: ComponentProps) {
  const rawNodes = (props.args["nodes"] ?? []) as RawNode[];
  const rawEdges = (props.args["edges"] ?? []) as RawEdge[];
  const analysisMode = (props.args["analysis_mode"] ?? false) as boolean;
  const layoutVersion = (props.args["layout_version"] ?? 0) as number;

  const initialNodes = useMemo(() => buildNodes(rawNodes), [rawNodes]);
  const initialEdges = useMemo(() => buildEdges(rawEdges), [rawEdges]);

  const nodeTypes = useMemo(() => {
    return {
      componentNode: ComponentNode
    };
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createMenuTab, setCreateMenuTab] = useState<"component" | "dependency">("component");

  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [editTargetType, setEditTargetType] = useState<MenuTargetType>("none");

  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<MenuTargetType>("none");

  const [contextMenu, setContextMenu] = useState<ContextMenuState>(closedContextMenu);
  const [newComponentPosition, setNewComponentPosition] = useState<{ x: number; y: number } | null>(null);

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

  const shellRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<any>(null);

  const latestNodesRef = useRef<Node[]>(initialNodes);
  const latestEdgesRef = useRef<Edge[]>(initialEdges);
  const layoutVersionRef = useRef(layoutVersion);

  const selectionChangedRef = useRef(false);
  const selectedNodeIdsRef = useRef<string[]>([]);
  const selectedEdgeIdsRef = useRef<string[]>([]);

  const nodeDragHappenedRef = useRef(false);
  const skipNextSelectionSendRef = useRef(false);
  const ignoreNextPaneClickRef = useRef(false);

  const twoFingerTouchRef = useRef<TouchContext | null>(null);

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
      selectedNodeIdsRef.current = getSelectedNodeIds(mergedNodes);
      return mergedNodes;
    });

    const nextEdges = buildEdges(rawEdges);
    setEdges(nextEdges);
    latestEdgesRef.current = nextEdges;
    selectedEdgeIdsRef.current = getSelectedEdgeIds(nextEdges);

    setSourceNodeId((currentValue) => getSafeNodeId(rawNodes, currentValue));
    setTargetNodeId((currentValue) => getSafeNodeId(rawNodes, currentValue));
    setEditSourceNodeId((currentValue) => getSafeNodeId(rawNodes, currentValue));
    setEditTargetNodeId((currentValue) => getSafeNodeId(rawNodes, currentValue));
  }, [rawNodes, rawEdges, layoutVersion, setNodes, setEdges]);

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

  const sendCurrentSelection = useCallback(() => {
    sendEvent({
      event_type: "selection_change",
      target_type: "selection",
      node_ids: selectedNodeIdsRef.current,
      edge_ids: selectedEdgeIdsRef.current,
      positions: buildPositions(latestNodesRef.current)
    });
  }, [sendEvent]);

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

      sendCurrentSelection();

      window.setTimeout(() => {
        ignoreNextPaneClickRef.current = false;
      }, 250);
    };

    window.addEventListener("mouseup", sendSelectionOnMouseUp);

    return () => {
      window.removeEventListener("mouseup", sendSelectionOnMouseUp);
    };
  }, [sendCurrentSelection]);

  const hideContextMenu = () => {
    setContextMenu(closedContextMenu);
  };

  const closeMenus = () => {
    setCreateMenuOpen(false);
    setEditMenuOpen(false);
    setDeleteMenuOpen(false);
    setNewComponentPosition(null);
    hideContextMenu();
  };

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const rect = shellRef.current?.getBoundingClientRect();

    if (!rect) {
      return {
        x: clientX,
        y: clientY
      };
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const getFlowPoint = (clientX: number, clientY: number) => {
    if (!reactFlowInstanceRef.current) {
      return getCanvasPoint(clientX, clientY);
    }

    return reactFlowInstanceRef.current.screenToFlowPosition({
      x: clientX,
      y: clientY
    });
  };

  const clearLocalSelection = () => {
    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => ({
        ...node,
        selected: false
      }));

      latestNodesRef.current = nextNodes;
      return nextNodes;
    });

    setEdges((currentEdges) => {
      const nextEdges = currentEdges.map((edge) => ({
        ...edge,
        selected: false
      }));

      latestEdgesRef.current = nextEdges;
      return nextEdges;
    });

    selectedNodeIdsRef.current = [];
    selectedEdgeIdsRef.current = [];
    selectionChangedRef.current = false;
  };

  const selectOnlyNode = (nodeId: string) => {
    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => ({
        ...node,
        selected: node.id === nodeId
      }));

      latestNodesRef.current = nextNodes;
      return nextNodes;
    });

    setEdges((currentEdges) => {
      const nextEdges = currentEdges.map((edge) => ({
        ...edge,
        selected: false
      }));

      latestEdgesRef.current = nextEdges;
      return nextEdges;
    });

    selectedNodeIdsRef.current = [nodeId];
    selectedEdgeIdsRef.current = [];
    selectionChangedRef.current = false;
  };

  const selectOnlyEdge = (edgeId: string) => {
    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) => ({
        ...node,
        selected: false
      }));

      latestNodesRef.current = nextNodes;
      return nextNodes;
    });

    setEdges((currentEdges) => {
      const nextEdges = currentEdges.map((edge) => ({
        ...edge,
        selected: edge.id === edgeId
      }));

      latestEdgesRef.current = nextEdges;
      return nextEdges;
    });

    selectedNodeIdsRef.current = [];
    selectedEdgeIdsRef.current = [edgeId];
    selectionChangedRef.current = false;
  };

  const openPaneContextMenu = (clientX: number, clientY: number) => {
    const point = getCanvasPoint(clientX, clientY);
    const flowPoint = getFlowPoint(clientX, clientY);

    setCreateMenuOpen(false);
    setEditMenuOpen(false);
    setDeleteMenuOpen(false);

    setContextMenu({
      isOpen: true,
      targetType: "pane",
      x: point.x,
      y: point.y,
      flowX: flowPoint.x,
      flowY: flowPoint.y
    });
  };

  const openNodeContextMenu = (clientX: number, clientY: number, nodeId: string) => {
    const point = getCanvasPoint(clientX, clientY);
    const rawNode = rawNodes.find((node) => node.id === nodeId);

    selectOnlyNode(nodeId);

    setCreateMenuOpen(false);
    setEditMenuOpen(false);
    setDeleteMenuOpen(false);

    setContextMenu({
      isOpen: true,
      targetType: "node",
      targetId: nodeId,
      label: rawNode ? rawNode.label : nodeId,
      x: point.x,
      y: point.y
    });
  };

  const openEdgeContextMenu = (clientX: number, clientY: number, edgeId: string) => {
    const point = getCanvasPoint(clientX, clientY);
    const rawEdge = rawEdges.find((edge) => edge.id === edgeId);

    selectOnlyEdge(edgeId);

    setCreateMenuOpen(false);
    setEditMenuOpen(false);
    setDeleteMenuOpen(false);

    setContextMenu({
      isOpen: true,
      targetType: "edge",
      targetId: edgeId,
      label: rawEdge ? `${rawEdge.source} -> ${rawEdge.target}` : edgeId,
      x: point.x,
      y: point.y
    });
  };

  const openContextMenuFromDomTarget = (clientX: number, clientY: number, target: EventTarget | null) => {
    const nodeId = getNodeIdFromTarget(target);

    if (nodeId) {
      openNodeContextMenu(clientX, clientY, nodeId);
      return;
    }

    const edgeId = getEdgeIdFromTarget(target);

    if (edgeId) {
      openEdgeContextMenu(clientX, clientY, edgeId);
      return;
    }

    openPaneContextMenu(clientX, clientY);
  };

  const createComponent = () => {
    const cleanName = componentName.trim();

    if (!cleanName) {
      return;
    }

    const payload: Record<string, unknown> = {
      name: cleanName,
      component_type: componentType,
      description: componentDescription.trim()
    };

    if (newComponentPosition) {
      payload.x = newComponentPosition.x;
      payload.y = newComponentPosition.y;
    }

    sendSimpleEvent("create_component", "toolbar", [], [], payload);

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
      dependency_type: dependencyType,
      source_handle: "source-right",
      target_handle: "target-left"
    });

    closeMenus();
  };

  const openEditMenu = () => {
    const selectedNodeIds = selectedNodeIdsRef.current;
    const selectedEdgeIds = selectedEdgeIdsRef.current;

    setCreateMenuOpen(false);
    setDeleteMenuOpen(false);
    hideContextMenu();

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
    if (!editDependencyId || !editSourceNodeId || !editTargetNodeId || editSourceNodeId === editTargetNodeId) {
      return;
    }

    const rawEdge = rawEdges.find((edge) => edge.id === editDependencyId);

    sendSimpleEvent("update_dependency", "toolbar", [], [editDependencyId], {
      dependency_id: editDependencyId,
      source_component_id: editSourceNodeId,
      target_component_id: editTargetNodeId,
      dependency_type: editDependencyType,
      source_handle: rawEdge?.source_handle || "source-right",
      target_handle: rawEdge?.target_handle || "target-left"
    });

    closeMenus();
  };

  const openDeleteMenu = () => {
    const selectedNodeIds = selectedNodeIdsRef.current;
    const selectedEdgeIds = selectedEdgeIdsRef.current;

    setCreateMenuOpen(false);
    setEditMenuOpen(false);
    hideContextMenu();

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

  const openEditMenuFromContext = () => {
    if (contextMenu.targetType === "node" && contextMenu.targetId) {
      const selectedNode = rawNodes.find((node) => node.id === contextMenu.targetId);

      if (!selectedNode) {
        return;
      }

      setCreateMenuOpen(false);
      setDeleteMenuOpen(false);
      hideContextMenu();

      setEditTargetType("component");
      setEditComponentId(selectedNode.id);
      setEditComponentName(selectedNode.label);
      setEditComponentType(selectedNode.node_type || "other");
      setEditComponentDescription(selectedNode.description || "");
      setEditMenuOpen(true);
      return;
    }

    if (contextMenu.targetType === "edge" && contextMenu.targetId) {
      const selectedEdge = rawEdges.find((edge) => edge.id === contextMenu.targetId);

      if (!selectedEdge) {
        return;
      }

      setCreateMenuOpen(false);
      setDeleteMenuOpen(false);
      hideContextMenu();

      setEditTargetType("dependency");
      setEditDependencyId(selectedEdge.id);
      setEditSourceNodeId(selectedEdge.source);
      setEditTargetNodeId(selectedEdge.target);
      setEditDependencyType(selectedEdge.dependency_type || "hard");
      setEditMenuOpen(true);
    }
  };

  const openDeleteMenuFromContext = () => {
    if (contextMenu.targetType === "node" && contextMenu.targetId) {
      const selectedNode = rawNodes.find((node) => node.id === contextMenu.targetId);

      setCreateMenuOpen(false);
      setEditMenuOpen(false);
      hideContextMenu();

      setDeleteTargetType("component");
      setDeleteTargetId(contextMenu.targetId);
      setDeleteTargetLabel(selectedNode ? selectedNode.label : contextMenu.targetId);
      setDeleteMenuOpen(true);
      return;
    }

    if (contextMenu.targetType === "edge" && contextMenu.targetId) {
      const selectedEdge = rawEdges.find((edge) => edge.id === contextMenu.targetId);

      setCreateMenuOpen(false);
      setEditMenuOpen(false);
      hideContextMenu();

      setDeleteTargetType("dependency");
      setDeleteTargetId(contextMenu.targetId);
      setDeleteTargetLabel(selectedEdge ? `${selectedEdge.source} -> ${selectedEdge.target}` : contextMenu.targetId);
      setDeleteMenuOpen(true);
    }
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

  const runAnalysisFromContext = () => {
    if (contextMenu.targetType !== "node" || !contextMenu.targetId) {
      return;
    }

    sendSimpleEvent("run_analysis", "context_menu", [contextMenu.targetId], []);
    closeMenus();
  };

  const createDependencyFromContextNode = () => {
    if (contextMenu.targetType !== "node" || !contextMenu.targetId) {
      return;
    }

    const sourceId = contextMenu.targetId;
    const firstOtherNode = rawNodes.find((node) => node.id !== sourceId);

    setSourceNodeId(sourceId);
    setTargetNodeId(firstOtherNode ? firstOtherNode.id : sourceId);
    setCreateMenuTab("dependency");

    setEditMenuOpen(false);
    setDeleteMenuOpen(false);
    hideContextMenu();
    setCreateMenuOpen(true);
  };

  const createComponentFromContextPane = () => {
    if (typeof contextMenu.flowX === "number" && typeof contextMenu.flowY === "number") {
      setNewComponentPosition({
        x: Math.round(contextMenu.flowX),
        y: Math.round(contextMenu.flowY)
      });
    } else {
      setNewComponentPosition(null);
    }

    setCreateMenuTab("component");
    setEditMenuOpen(false);
    setDeleteMenuOpen(false);
    hideContextMenu();
    setCreateMenuOpen(true);
  };

  const openCreateMenuFromToolbar = () => {
    setNewComponentPosition(null);
    setCreateMenuOpen(!createMenuOpen);
    setEditMenuOpen(false);
    setDeleteMenuOpen(false);
    hideContextMenu();
  };

  const toggleDependencyTypeFromContext = () => {
    if (contextMenu.targetType !== "edge" || !contextMenu.targetId) {
      return;
    }

    const selectedEdge = rawEdges.find((edge) => edge.id === contextMenu.targetId);

    if (!selectedEdge) {
      return;
    }

    const nextDependencyType = selectedEdge.dependency_type === "hard" ? "soft" : "hard";

    sendSimpleEvent("update_dependency", "context_menu", [], [selectedEdge.id], {
      dependency_id: selectedEdge.id,
      source_component_id: selectedEdge.source,
      target_component_id: selectedEdge.target,
      dependency_type: nextDependencyType,
      source_handle: selectedEdge.source_handle || "source-right",
      target_handle: selectedEdge.target_handle || "target-left"
    });

    closeMenus();
  };

  const resetLayoutFromContext = () => {
    sendSimpleEvent("reset_layout", "context_menu", [], []);
    closeMenus();
  };

  const createDependencyFromConnection = (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return;
    }

    if (connection.source === connection.target) {
      return;
    }

    const sourceHandle = connection.sourceHandle || "source-right";
    const targetHandle = connection.targetHandle || "target-left";

    hideContextMenu();
    setCreateMenuOpen(false);
    setEditMenuOpen(false);
    setDeleteMenuOpen(false);

    sendSimpleEvent("create_dependency", "edge", [], [], {
      source_component_id: connection.source,
      target_component_id: connection.target,
      dependency_type: "hard",
      source_handle: sourceHandle,
      target_handle: targetHandle
    });
  };

  const updateDependencyFromReconnect = (oldEdge: Edge, connection: Connection) => {
    const sourceId = connection.source || oldEdge.source;
    const targetId = connection.target || oldEdge.target;

    if (!sourceId || !targetId) {
      return;
    }

    if (sourceId === targetId) {
      return;
    }

    const rawEdge = rawEdges.find((edge) => String(edge.id) === String(oldEdge.id));
    const dependencyType = getEdgeDependencyType(rawEdges, oldEdge.id);
    const sourceHandle = connection.sourceHandle || oldEdge.sourceHandle || rawEdge?.source_handle || "source-right";
    const targetHandle = connection.targetHandle || oldEdge.targetHandle || rawEdge?.target_handle || "target-left";

    hideContextMenu();
    setCreateMenuOpen(false);
    setEditMenuOpen(false);
    setDeleteMenuOpen(false);

    setEdges((currentEdges) => {
      const nextEdges = reconnectEdge(oldEdge, connection, currentEdges).map((edge) => ({
        ...edge,
        selected: edge.id === oldEdge.id
      }));

      latestEdgesRef.current = nextEdges;
      return nextEdges;
    });

    selectedNodeIdsRef.current = [];
    selectedEdgeIdsRef.current = [oldEdge.id];
    selectionChangedRef.current = false;

    sendSimpleEvent("update_dependency", "edge", [], [oldEdge.id], {
      dependency_id: oldEdge.id,
      source_component_id: sourceId,
      target_component_id: targetId,
      dependency_type: dependencyType,
      source_handle: sourceHandle,
      target_handle: targetHandle
    });
  };

  const handleSelectionChange = useCallback((selectedNodes: Node[], selectedEdges: Edge[]) => {
    selectedNodeIdsRef.current = selectedNodes.map((node) => node.id);
    selectedEdgeIdsRef.current = selectedEdges.map((edge) => edge.id);
    selectionChangedRef.current = true;
  }, []);

  const handleTwoFingerTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) {
      twoFingerTouchRef.current = null;
      return;
    }

    const center = getTouchCenter(event.touches);

    if (!center) {
      twoFingerTouchRef.current = null;
      return;
    }

    twoFingerTouchRef.current = {
      clientX: center.clientX,
      clientY: center.clientY,
      startX: center.clientX,
      startY: center.clientY,
      target: event.target,
      time: Date.now()
    };
  };

  const handleTwoFingerTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!twoFingerTouchRef.current || event.touches.length !== 2) {
      return;
    }

    const center = getTouchCenter(event.touches);

    if (!center) {
      twoFingerTouchRef.current = null;
      return;
    }

    const deltaX = Math.abs(center.clientX - twoFingerTouchRef.current.startX);
    const deltaY = Math.abs(center.clientY - twoFingerTouchRef.current.startY);

    if (deltaX > 18 || deltaY > 18) {
      twoFingerTouchRef.current = null;
    }
  };

  const handleTwoFingerTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!twoFingerTouchRef.current) {
      return;
    }

    const touchContext = twoFingerTouchRef.current;
    twoFingerTouchRef.current = null;

    const elapsedTime = Date.now() - touchContext.time;

    if (elapsedTime > 550) {
      return;
    }

    event.preventDefault();
    openContextMenuFromDomTarget(
      touchContext.clientX,
      touchContext.clientY,
      touchContext.target
    );
  };

  return (
    <div className="graph-canvas-frame">
      <div
        ref={shellRef}
        className={spacePressed ? "graph-canvas-shell graph-space-mode" : "graph-canvas-shell"}
        onTouchStart={handleTwoFingerTouchStart}
        onTouchMove={handleTwoFingerTouchMove}
        onTouchEnd={handleTwoFingerTouchEnd}
      >
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
            openCreateButtonClick={openCreateMenuFromToolbar}
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

        <ContextMenu
          menu={contextMenu}
          canCreateDependency={rawNodes.length > 1}
          onClose={hideContextMenu}
          onRunAnalysis={runAnalysisFromContext}
          onEdit={openEditMenuFromContext}
          onDelete={openDeleteMenuFromContext}
          onCreateDependencyFromNode={createDependencyFromContextNode}
          onCreateComponent={createComponentFromContextPane}
          onResetLayout={resetLayoutFromContext}
          onToggleDependencyType={toggleDependencyTypeFromContext}
        />

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

        <div className="graph-brand-watermark">
          Comanche Airflop
        </div>

        <ReactFlow
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance;
          }}
          nodeTypes={nodeTypes}
          className="graph-flow"
          style={{ width: "100%", height: "100%" }}
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.16 }}
          panOnDrag={spacePressed}
          panOnScroll
          panOnScrollMode={PanOnScrollMode.Free}
          panOnScrollSpeed={0.8}
          zoomOnScroll={false}
          zoomOnPinch
          zoomOnDoubleClick={false}
          nodesDraggable
          nodesConnectable
          edgesReconnectable
          edgesFocusable
          nodesFocusable
          elementsSelectable
          selectionOnDrag={!spacePressed}
          selectionKeyCode={null}
          multiSelectionKeyCode={["Meta", "Control", "Shift"]}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={createDependencyFromConnection}
          onReconnect={updateDependencyFromReconnect}
          onReconnectStart={hideContextMenu}
          onPaneClick={() => {
            if (ignoreNextPaneClickRef.current) {
              return;
            }

            closeMenus();
            clearLocalSelection();
            sendSimpleEvent("pane_click", "pane", [], []);
          }}
          onPaneContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openPaneContextMenu(event.clientX, event.clientY);
          }}
          onNodeClick={(event, node) => {
            hideContextMenu();

            if (analysisMode) {
              sendSimpleEvent("run_analysis", "node", [node.id], []);
              return;
            }

            if (isMultiSelectEvent(event)) {
              return;
            }

            skipNextSelectionSendRef.current = true;
            selectOnlyNode(node.id);
            sendSimpleEvent("node_click", "node", [node.id], []);
          }}
          onNodeDoubleClick={(event) => {
            event.preventDefault();
          }}
          onNodeContextMenu={(event, node) => {
            event.preventDefault();
            event.stopPropagation();
            openNodeContextMenu(event.clientX, event.clientY, node.id);
          }}
          onEdgeClick={(event, edge) => {
            hideContextMenu();

            if (isMultiSelectEvent(event)) {
              return;
            }

            skipNextSelectionSendRef.current = true;
            selectOnlyEdge(edge.id);
            sendSimpleEvent("edge_click", "edge", [], [edge.id]);
          }}
          onEdgeContextMenu={(event, edge) => {
            event.preventDefault();
            event.stopPropagation();
            openEdgeContextMenu(event.clientX, event.clientY, edge.id);
          }}
          onNodeDragStart={() => {
            hideContextMenu();
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
          <MiniMap className="graph-minimap" />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}

export default GraphCanvas;
