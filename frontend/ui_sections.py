import streamlit as st

from canvas_data import build_component_map


def show_canvas_message():
    if st.session_state["canvas_message"]:
        st.caption(st.session_state["canvas_message"])


def show_analysis_result(analysis_result):
    if not analysis_result:
        return

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


def show_components_table(components):
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


def show_dependencies_table(components, dependencies):
    with st.expander("Показать зависимости"):
        dependency_table = []
        component_map = build_component_map(components)

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
