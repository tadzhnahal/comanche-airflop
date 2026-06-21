import React from "react";

import { RawNode } from "../types";

type CreateMenuProps = {
  rawNodes: RawNode[];
  createMenuTab: "component" | "dependency";
  setCreateMenuTab: (value: "component" | "dependency") => void;

  componentName: string;
  setComponentName: (value: string) => void;
  componentType: string;
  setComponentType: (value: string) => void;
  componentDescription: string;
  setComponentDescription: (value: string) => void;

  sourceNodeId: string;
  setSourceNodeId: (value: string) => void;
  targetNodeId: string;
  setTargetNodeId: (value: string) => void;
  dependencyType: string;
  setDependencyType: (value: string) => void;

  createComponent: () => void;
  createDependency: () => void;
};

function CreateMenu(props: CreateMenuProps) {
  return (
    <div className="graph-popup-menu">
      <div className="graph-menu-tabs">
        <button
          className={props.createMenuTab === "component" ? "graph-menu-tab-active" : ""}
          onClick={() => props.setCreateMenuTab("component")}
        >
          Компонент
        </button>
        <button
          className={props.createMenuTab === "dependency" ? "graph-menu-tab-active" : ""}
          onClick={() => props.setCreateMenuTab("dependency")}
        >
          Связь
        </button>
      </div>

      {props.createMenuTab === "component" && (
        <div className="graph-menu-form">
          <label>
            Название
            <input
              value={props.componentName}
              onChange={(event) => props.setComponentName(event.target.value)}
              placeholder="events_mart"
            />
          </label>

          <label>
            Тип
            <select
              value={props.componentType}
              onChange={(event) => props.setComponentType(event.target.value)}
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
              value={props.componentDescription}
              onChange={(event) => props.setComponentDescription(event.target.value)}
              placeholder="Короткое описание"
            />
          </label>

          <button
            className="graph-menu-submit"
            type="button"
            onClick={props.createComponent}
          >
            Создать
          </button>
        </div>
      )}

      {props.createMenuTab === "dependency" && (
        <div className="graph-menu-form">
          <label>
            Откуда
            <select
              value={props.sourceNodeId}
              onChange={(event) => props.setSourceNodeId(event.target.value)}
            >
              {props.rawNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Куда
            <select
              value={props.targetNodeId}
              onChange={(event) => props.setTargetNodeId(event.target.value)}
            >
              {props.rawNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Тип
            <select
              value={props.dependencyType}
              onChange={(event) => props.setDependencyType(event.target.value)}
            >
              <option value="hard">hard</option>
              <option value="soft">soft</option>
            </select>
          </label>

          <button
            className="graph-menu-submit"
            type="button"
            onClick={props.createDependency}
            disabled={props.rawNodes.length < 2 || props.sourceNodeId === props.targetNodeId}
          >
            Создать
          </button>
        </div>
      )}
    </div>
  );
}

export default CreateMenu;
