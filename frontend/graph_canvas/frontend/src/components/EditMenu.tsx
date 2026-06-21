import React from "react";

import { MenuTargetType, RawNode } from "../types";

type EditMenuProps = {
  rawNodes: RawNode[];
  editTargetType: MenuTargetType;

  editComponentName: string;
  setEditComponentName: (value: string) => void;
  editComponentType: string;
  setEditComponentType: (value: string) => void;
  editComponentDescription: string;
  setEditComponentDescription: (value: string) => void;

  editSourceNodeId: string;
  setEditSourceNodeId: (value: string) => void;
  editTargetNodeId: string;
  setEditTargetNodeId: (value: string) => void;
  editDependencyType: string;
  setEditDependencyType: (value: string) => void;

  updateComponent: () => void;
  updateDependency: () => void;
};

function EditMenu(props: EditMenuProps) {
  return (
    <div className="graph-popup-menu">
      {props.editTargetType === "none" && (
        <div className="graph-menu-empty">
          Выберите один компонент или одну связь.
        </div>
      )}

      {props.editTargetType === "component" && (
        <div className="graph-menu-form">
          <div className="graph-menu-title">Редактировать компонент</div>

          <label>
            Название
            <input
              value={props.editComponentName}
              onChange={(event) => props.setEditComponentName(event.target.value)}
            />
          </label>

          <label>
            Тип
            <select
              value={props.editComponentType}
              onChange={(event) => props.setEditComponentType(event.target.value)}
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
              value={props.editComponentDescription}
              onChange={(event) => props.setEditComponentDescription(event.target.value)}
            />
          </label>

          <button
            className="graph-menu-submit"
            type="button"
            onClick={props.updateComponent}
          >
            Сохранить
          </button>
        </div>
      )}

      {props.editTargetType === "dependency" && (
        <div className="graph-menu-form">
          <div className="graph-menu-title">Редактировать связь</div>

          <label>
            Откуда
            <select
              value={props.editSourceNodeId}
              onChange={(event) => props.setEditSourceNodeId(event.target.value)}
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
              value={props.editTargetNodeId}
              onChange={(event) => props.setEditTargetNodeId(event.target.value)}
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
              value={props.editDependencyType}
              onChange={(event) => props.setEditDependencyType(event.target.value)}
            >
              <option value="hard">hard</option>
              <option value="soft">soft</option>
            </select>
          </label>

          <button
            className="graph-menu-submit"
            type="button"
            onClick={props.updateDependency}
            disabled={props.editSourceNodeId === props.editTargetNodeId}
          >
            Сохранить
          </button>
        </div>
      )}
    </div>
  );
}

export default EditMenu;
