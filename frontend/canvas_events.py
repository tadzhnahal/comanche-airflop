import streamlit as st

from api import (create_component, create_dependency, delete_component_by_id,
                 delete_dependency_by_id, run_analysis, update_component_by_id,
                 update_dependency_by_id)
from app_state import clear_graph_selection, reset_after_data_change
from canvas_data import to_int


def get_canvas_event_id(canvas_event):
    timestamp = canvas_event.get("timestamp")

    if timestamp is not None:
        return str(timestamp)

    event_type = canvas_event.get("event_type")
    node_ids = canvas_event.get("node_ids") or []
    edge_ids = canvas_event.get("edge_ids") or []
    payload = canvas_event.get("payload") or {}

    return f"{event_type}:{node_ids}:{edge_ids}:{payload}"


def create_component_from_canvas(payload):
    name = (payload.get("name") or "").strip()
    component_type = payload.get("component_type") or "other"
    description = (payload.get("description") or "").strip() or None

    if not name:
        st.session_state["canvas_message"] = "Название компонента не должно быть пустым"
        return

    try:
        created_component = create_component(
            name=name,
            component_type=component_type,
            description=description,
        )

        if created_component and "id" in created_component:
            st.session_state["selected_node_ids"] = [str(created_component["id"])]
            st.session_state["selected_edge_ids"] = []

        st.session_state["analysis_result"] = None
        st.session_state["analysis_mode"] = False
        st.session_state["canvas_message"] = "Компонент создан"
        st.rerun()

    except Exception as e:
        st.session_state["canvas_message"] = f"Не удалось создать компонент: {e}"


def create_dependency_from_canvas(payload):
    source_id = to_int(payload.get("source_component_id"))
    target_id = to_int(payload.get("target_component_id"))
    dependency_type = payload.get("dependency_type") or "hard"

    if source_id is None or target_id is None:
        st.session_state["canvas_message"] = "Выберите два компонента"
        return

    if source_id == target_id:
        st.session_state["canvas_message"] = "Компонент не может зависеть сам от себя"
        return

    try:
        create_dependency(
            source_component_id=source_id,
            target_component_id=target_id,
            dependency_type=dependency_type,
        )
        reset_after_data_change("Связь создана")
        st.rerun()

    except Exception as e:
        st.session_state["canvas_message"] = f"Не удалось создать связь: {e}"


def update_component_from_canvas(payload):
    component_id = to_int(payload.get("component_id"))
    name = (payload.get("name") or "").strip()
    component_type = payload.get("component_type") or "other"
    description = (payload.get("description") or "").strip() or None

    if component_id is None:
        st.session_state["canvas_message"] = "Компонент не найден"
        return

    if not name:
        st.session_state["canvas_message"] = "Название компонента не должно быть пустым"
        return

    try:
        update_component_by_id(
            component_id=component_id,
            name=name,
            component_type=component_type,
            description=description,
        )
        st.session_state["selected_node_ids"] = [str(component_id)]
        st.session_state["selected_edge_ids"] = []
        st.session_state["analysis_result"] = None
        st.session_state["analysis_mode"] = False
        st.session_state["canvas_message"] = "Компонент обновлён"
        st.rerun()

    except Exception as e:
        st.session_state["canvas_message"] = f"Не удалось обновить компонент: {e}"


def update_dependency_from_canvas(payload):
    dependency_id = to_int(payload.get("dependency_id"))
    source_id = to_int(payload.get("source_component_id"))
    target_id = to_int(payload.get("target_component_id"))
    dependency_type = payload.get("dependency_type") or "hard"

    if dependency_id is None:
        st.session_state["canvas_message"] = "Связь не найдена"
        return

    if source_id is None or target_id is None:
        st.session_state["canvas_message"] = "Выберите два компонента"
        return

    if source_id == target_id:
        st.session_state["canvas_message"] = "Компонент не может зависеть сам от себя"
        return

    try:
        update_dependency_by_id(
            dependency_id=dependency_id,
            source_component_id=source_id,
            target_component_id=target_id,
            dependency_type=dependency_type,
        )
        st.session_state["selected_node_ids"] = []
        st.session_state["selected_edge_ids"] = [str(dependency_id)]
        st.session_state["analysis_result"] = None
        st.session_state["analysis_mode"] = False
        st.session_state["canvas_message"] = "Связь обновлена"
        st.rerun()

    except Exception as e:
        st.session_state["canvas_message"] = f"Не удалось обновить связь: {e}"


def delete_component_from_canvas(payload):
    component_id = to_int(payload.get("component_id"))

    if component_id is None:
        st.session_state["canvas_message"] = "Компонент не найден"
        return

    try:
        delete_component_by_id(component_id)
        reset_after_data_change("Компонент удалён")
        st.rerun()

    except Exception as e:
        st.session_state["canvas_message"] = f"Не удалось удалить компонент: {e}"


def delete_dependency_from_canvas(payload):
    dependency_id = to_int(payload.get("dependency_id"))

    if dependency_id is None:
        st.session_state["canvas_message"] = "Связь не найдена"
        return

    try:
        delete_dependency_by_id(dependency_id)
        st.session_state["selected_edge_ids"] = []
        st.session_state["analysis_result"] = None
        st.session_state["analysis_mode"] = False
        st.session_state["canvas_message"] = "Связь удалена"
        st.rerun()

    except Exception as e:
        st.session_state["canvas_message"] = f"Не удалось удалить связь: {e}"


def run_analysis_from_canvas(node_ids):
    if not node_ids:
        return

    component_id = to_int(node_ids[0])

    if component_id is None:
        return

    try:
        st.session_state["analysis_result"] = run_analysis(component_id)
        st.session_state["selected_node_ids"] = [str(component_id)]
        st.session_state["selected_edge_ids"] = []
        st.session_state["analysis_mode"] = False
        st.session_state["canvas_message"] = "Анализ готов"
        st.rerun()

    except Exception as e:
        st.session_state["canvas_message"] = f"Не удалось запустить анализ: {e}"


def handle_analysis_button_click(node_ids, edge_ids):
    if len(node_ids) == 1 and not edge_ids:
        run_analysis_from_canvas(node_ids)
        return

    if edge_ids:
        st.session_state["analysis_mode"] = False
        st.session_state["canvas_message"] = "Анализ работает по компоненту. Выберите узел."
        st.rerun()
        return

    if len(node_ids) > 1:
        st.session_state["analysis_mode"] = False
        st.session_state["canvas_message"] = "Для анализа выберите один компонент."
        st.rerun()
        return

    st.session_state["analysis_mode"] = not st.session_state["analysis_mode"]

    if st.session_state["analysis_mode"]:
        st.session_state["canvas_message"] = "Кликните по узлу для анализа"
    else:
        st.session_state["canvas_message"] = None

    st.rerun()


def handle_canvas_event(canvas_event):
    if not canvas_event:
        return

    event_id = get_canvas_event_id(canvas_event)

    if event_id == st.session_state["last_processed_canvas_event_id"]:
        return

    st.session_state["last_processed_canvas_event_id"] = event_id

    event_type = canvas_event.get("event_type")
    node_ids = canvas_event.get("node_ids") or []
    edge_ids = canvas_event.get("edge_ids") or []
    positions = canvas_event.get("positions") or {}
    payload = canvas_event.get("payload") or {}

    if positions:
        st.session_state["graph_positions"] = positions

    st.session_state["last_canvas_event"] = canvas_event
    st.session_state["last_canvas_event_type"] = event_type

    if event_type == "node_drag_stop":
        return

    if event_type == "create_component":
        create_component_from_canvas(payload)
        return

    if event_type == "create_dependency":
        create_dependency_from_canvas(payload)
        return

    if event_type == "update_component":
        update_component_from_canvas(payload)
        return

    if event_type == "update_dependency":
        update_dependency_from_canvas(payload)
        return

    if event_type == "delete_component":
        delete_component_from_canvas(payload)
        return

    if event_type == "delete_dependency":
        delete_dependency_from_canvas(payload)
        return

    if event_type == "analysis_button_click":
        handle_analysis_button_click(node_ids, edge_ids)
        return

    if event_type == "reset_layout":
        st.session_state["graph_positions"] = {}
        st.session_state["layout_version"] += 1
        st.session_state["canvas_message"] = "Раскладка сброшена"
        st.rerun()

    if event_type == "run_analysis":
        run_analysis_from_canvas(node_ids)
        return

    if event_type in ["node_click", "node_context_menu"]:
        st.session_state["selected_node_ids"] = node_ids
        st.session_state["selected_edge_ids"] = []
        st.session_state["analysis_mode"] = False

    elif event_type in ["edge_click", "edge_context_menu"]:
        st.session_state["selected_node_ids"] = []
        st.session_state["selected_edge_ids"] = edge_ids
        st.session_state["analysis_mode"] = False

    elif event_type == "pane_click":
        clear_graph_selection()
        st.session_state["analysis_mode"] = False

    elif event_type == "selection_change":
        st.session_state["selected_node_ids"] = node_ids
        st.session_state["selected_edge_ids"] = edge_ids
        st.session_state["analysis_mode"] = False
