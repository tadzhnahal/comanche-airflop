import React from "react";
import { Edge, Node } from "@xyflow/react";

import { getSelectedEdgeIds, getSelectedNodeIds } from "../graphData";

type ToolbarProps = {
  analysisMode: boolean;
  createMenuOpen: boolean;
  editMenuOpen: boolean;
  deleteMenuOpen: boolean;

  latestNodesRef: React.MutableRefObject<Node[]>;
  latestEdgesRef: React.MutableRefObject<Edge[]>;

  setCreateMenuOpen: (value: boolean) => void;
  setEditMenuOpen: (value: boolean) => void;
  setDeleteMenuOpen: (value: boolean) => void;

  openEditMenu: () => void;
  openDeleteMenu: () => void;
  sendSimpleEvent: (
    eventType: string,
    targetType: string,
    nodeIds: string[],
    edgeIds: string[],
    payload?: Record<string, unknown>
  ) => void;
};

function Toolbar(props: ToolbarProps) {
  return (
    <>
      <button
        className="graph-tool-button"
        title="Создать компонент или связь"
        onClick={() => {
          props.setCreateMenuOpen(!props.createMenuOpen);
          props.setEditMenuOpen(false);
          props.setDeleteMenuOpen(false);
        }}
      >
        +
      </button>

      <button
        className={props.editMenuOpen ? "graph-tool-button graph-tool-active" : "graph-tool-button"}
        title="Редактировать выбранный объект"
        onClick={props.openEditMenu}
      >
        ✎
      </button>

      <button
        className={props.analysisMode ? "graph-tool-button graph-tool-active" : "graph-tool-button"}
        title="Анализ"
        onClick={() => {
          const selectedNodeIds = getSelectedNodeIds(props.latestNodesRef.current);
          const selectedEdgeIds = getSelectedEdgeIds(props.latestEdgesRef.current);

          props.sendSimpleEvent(
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
        onClick={() => props.sendSimpleEvent("reset_layout", "toolbar", [], [])}
      >
        ↻
      </button>

      <button
        className={props.deleteMenuOpen ? "graph-tool-button graph-tool-danger graph-tool-active" : "graph-tool-button graph-tool-danger"}
        title="Удалить выбранный объект"
        onClick={props.openDeleteMenu}
      >
        ×
      </button>
    </>
  );
}

export default Toolbar;
