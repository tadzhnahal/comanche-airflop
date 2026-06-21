import React from "react";

import { MenuTargetType } from "../types";

type DeleteMenuProps = {
  deleteTargetType: MenuTargetType;
  deleteTargetLabel: string;
  deleteSelectedObject: () => void;
};

function DeleteMenu(props: DeleteMenuProps) {
  return (
    <div className="graph-popup-menu">
      {props.deleteTargetType === "none" && (
        <div className="graph-menu-empty">
          Выберите один компонент или одну связь.
        </div>
      )}

      {props.deleteTargetType !== "none" && (
        <div className="graph-menu-form">
          <div className="graph-menu-title">Удалить объект</div>
          <div className="graph-delete-text">
            {props.deleteTargetType === "component" ? "Компонент" : "Связь"}: {props.deleteTargetLabel}
          </div>

          <button
            className="graph-menu-submit graph-menu-delete"
            type="button"
            onClick={props.deleteSelectedObject}
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}

export default DeleteMenu;
