import streamlit as st

from api import (get_components, get_dependencies, run_analysis,
                 create_component, create_dependency, delete_component_by_id,
                 delete_dependency_by_id, update_component_by_id,
                 update_dependency_by_id)
from graph_canvas import graph_canvas


def to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def build_canvas_nodes(
    components,
    root_id=None,
    affected_ids=None,
    graph_positions=None,
    selected_node_ids=None,
):
    nodes = []
    affected_ids = affected_ids or []
    graph_positions = graph_positions or {}
    selected_node_ids = selected_node_ids or []

    for index, item in enumerate(components):
        status = "normal"

        if root_id is not None and item["id"] == root_id:
            status = "root"
        elif item["id"] in affected_ids:
            status = "affected"

        default_x = 120 + (index % 4) * 220
        default_y = 80 + (index // 4) * 140

        saved_position = graph_positions.get(str(item["id"]))

        if saved_position:
            x = saved_position.get("x", default_x)
            y = saved_position.get("y", default_y)
        else:
            x = default_x
            y = default_y

        nodes.append(
            {
                "id": str(item["id"]),
                "label": item["name"],
                "node_type": item["component_type"],
                "description": item["description"],
                "x": x,
                "y": y,
                "status": status,
                "selected": str(item["id"]) in selected_node_ids,
            }
        )

    return nodes


def build_canvas_edges(dependencies, selected_edge_ids=None):
    edges = []
    selected_edge_ids = selected_edge_ids or []

    for item in dependencies:
        edges.append(
            {
                "id": str(item["id"]),
                "source": str(item["source_component_id"]),
                "target": str(item["target_component_id"]),
                "label": item["dependency_type"],
                "dependency_type": item["dependency_type"],
                "selected": str(item["id"]) in selected_edge_ids,
            }
        )

    return edges


def clear_graph_selection():
    st.session_state["selected_node_ids"] = []
    st.session_state["selected_edge_ids"] = []


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
        st.session_state["selected_node_ids"] = []
        st.session_state["selected_edge_ids"] = []
        st.session_state["analysis_result"] = None
        st.session_state["analysis_mode"] = False
        st.session_state["canvas_message"] = "Связь создана"
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
        st.session_state["selected_node_ids"] = []
        st.session_state["selected_edge_ids"] = []
        st.session_state["analysis_result"] = None
        st.session_state["analysis_mode"] = False
        st.session_state["canvas_message"] = "Компонент удалён"
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

    if len(node_ids) > 1:
        st.session_state["analysis_mode"] = False
        st.session_state["canvas_message"] = "Для анализа выберите один компонент."
        st.rerun()

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


st.set_page_config(
    page_title="Аналитическая карта зависимостей",
    layout="wide",
    initial_sidebar_state="collapsed",
)

if "analysis_result" not in st.session_state:
    st.session_state["analysis_result"] = None

if "selected_node_ids" not in st.session_state:
    st.session_state["selected_node_ids"] = []

if "selected_edge_ids" not in st.session_state:
    st.session_state["selected_edge_ids"] = []

if "last_canvas_event" not in st.session_state:
    st.session_state["last_canvas_event"] = None

if "last_canvas_event_type" not in st.session_state:
    st.session_state["last_canvas_event_type"] = None

if "last_processed_canvas_event_id" not in st.session_state:
    st.session_state["last_processed_canvas_event_id"] = None

if "graph_positions" not in st.session_state:
    st.session_state["graph_positions"] = {}

if "analysis_mode" not in st.session_state:
    st.session_state["analysis_mode"] = False

if "canvas_message" not in st.session_state:
    st.session_state["canvas_message"] = None

if "layout_version" not in st.session_state:
    st.session_state["layout_version"] = 0

try:
    components = get_components()
except Exception as e:
    st.error(f"Не удалось загрузить компоненты: {e}")
    st.stop()

try:
    dependencies = get_dependencies()
except Exception as e:
    st.error(f"Не удалось загрузить зависимости: {e}")
    st.stop()

analysis_result = st.session_state["analysis_result"]

valid_node_ids = set()
for item in components:
    valid_node_ids.add(str(item["id"]))

valid_edge_ids = set()
for item in dependencies:
    valid_edge_ids.add(str(item["id"]))

st.session_state["selected_node_ids"] = [
    node_id
    for node_id in st.session_state["selected_node_ids"]
    if node_id in valid_node_ids
]

st.session_state["selected_edge_ids"] = [
    edge_id
    for edge_id in st.session_state["selected_edge_ids"]
    if edge_id in valid_edge_ids
]

root_id = None
affected_ids = []

if analysis_result:
    root_id = analysis_result["root_component"]["id"]

    for item in analysis_result["affected_components"]:
        affected_ids.append(item["id"])

canvas_nodes = build_canvas_nodes(
    components,
    root_id=root_id,
    affected_ids=affected_ids,
    graph_positions=st.session_state["graph_positions"],
    selected_node_ids=st.session_state["selected_node_ids"],
)
canvas_edges = build_canvas_edges(
    dependencies,
    selected_edge_ids=st.session_state["selected_edge_ids"],
)

canvas_event = graph_canvas(
    nodes=canvas_nodes,
    edges=canvas_edges,
    height=760,
    analysis_mode=st.session_state["analysis_mode"],
    layout_version=st.session_state["layout_version"],
    key="graph_canvas_full_screen_actions",
)

handle_canvas_event(canvas_event)

if st.session_state["canvas_message"]:
    st.caption(st.session_state["canvas_message"])

if analysis_result:
    root_component = analysis_result["root_component"]
    affected_components = analysis_result["affected_components"]
    affected_count = analysis_result["affected_count"]

    with st.expander("Результат анализа", expanded=True):
        root_table = [
            {
                "id": root_component["id"],
                "name": root_component["name"],
                "type": root_component["component_type"],
                "description": root_component["description"],
            }
        ]

        st.write("Корневой узел:")
        st.table(root_table)

        st.write(f"Затронутые компоненты: {affected_count}")

        if affected_components:
            affected_table = []

            for item in affected_components:
                affected_table.append(
                    {
                        "id": item["id"],
                        "name": item["name"],
                        "type": item["component_type"],
                        "description": item["description"],
                    }
                )

            st.table(affected_table)
        else:
            st.info("Затронутых компонентов нет")

with st.expander("Показать все компоненты"):
    if components:
        components_table = []

        for item in components:
            components_table.append(
                {
                    "id": item["id"],
                    "name": item["name"],
                    "type": item["component_type"],
                    "description": item["description"],
                }
            )

        st.table(components_table)
    else:
        st.info("Компонентов пока нет")

with st.expander("Показать зависимости"):
    dependency_table = []

    component_map = {}
    for item in components:
        component_map[item["id"]] = item

    for item in dependencies:
        source_component = component_map.get(item["source_component_id"])
        target_component = component_map.get(item["target_component_id"])

        dependency_table.append(
            {
                "source_id": item["source_component_id"],
                "source_name": source_component["name"] if source_component else "Неизвестный компонент",
                "target_id": item["target_component_id"],
                "target_name": target_component["name"] if target_component else "Неизвестный компонент",
                "dependency_type": item["dependency_type"],
            }
        )

    if dependency_table:
        st.table(dependency_table)
    else:
        st.info("Зависимостей пока нет")
