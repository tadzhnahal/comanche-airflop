import streamlit as st

from api import (get_components, get_dependencies, run_analysis,
                 create_component, create_dependency, delete_component_by_id,
                 delete_dependency_by_id, update_component_by_id,
                 update_dependency_by_id)
from graph_canvas import graph_canvas


def build_canvas_nodes(components, root_id=None, affected_ids=None):
    nodes = []
    affected_ids = affected_ids or []

    for index, item in enumerate(components):
        status = "normal"

        if root_id is not None and item["id"] == root_id:
            status = "root"
        elif item["id"] in affected_ids:
            status = "affected"

        nodes.append(
            {
                "id": str(item["id"]),
                "label": item["name"],
                "node_type": item["component_type"],
                "description": item["description"],
                "x": 120 + (index % 4) * 220,
                "y": 80 + (index // 4) * 140,
                "status": status,
            }
        )

    return nodes


def build_canvas_edges(dependencies):
    edges = []

    for item in dependencies:
        edges.append(
            {
                "id": str(item["id"]),
                "source": str(item["source_component_id"]),
                "target": str(item["target_component_id"]),
                "label": item["dependency_type"],
                "dependency_type": item["dependency_type"],
            }
        )

    return edges


st.set_page_config(
    page_title="Аналитическая карта зависимостей",
    layout="wide",
    initial_sidebar_state="expanded",
)
st.title("Аналитическая карта зависимостей")

if "analysis_result" not in st.session_state:
    st.session_state["analysis_result"] = None

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

component_map = {}
for item in components:
    component_map[item["id"]] = item

root_id = None
affected_ids = []

if analysis_result:
    root_id = analysis_result["root_component"]["id"]

    for item in analysis_result["affected_components"]:
        affected_ids.append(item["id"])

with st.sidebar:
    st.header("Управление")

    with st.expander("Добавить новый компонент"):
        with st.form("create_component_form"):
            new_component_name = st.text_input("Название компонента")
            new_component_type = st.selectbox(
                "Тип компонента",
                ["source", "mart", "dashboard", "service", "report", "other"],
            )
            new_component_description = st.text_area("Описание", height=80)

            create_component_submit = st.form_submit_button("Добавить компонент")

        if create_component_submit:
            if not new_component_name.strip():
                st.error("Название компонента не должно быть пустым")
            else:
                try:
                    create_component(
                        name=new_component_name.strip(),
                        component_type=new_component_type,
                        description=new_component_description.strip() or None,
                    )
                    st.session_state["analysis_result"] = None
                    st.success("Вы успешно добавили компонент")
                    st.rerun()
                except Exception as e:
                    st.error(f"Не удалось добавить компонент: {e}")

    with st.expander("Редактировать компонент"):
        if components:
            edit_component_options = {}

            for item in components:
                label = f"{item['id']} — {item['name']} ({item['component_type']})"
                edit_component_options[label] = item["id"]

            edit_component_label = st.selectbox(
                "Выберите компонент, чтобы отредактировать",
                list(edit_component_options.keys()),
            )

            edit_component_id = edit_component_options[edit_component_label]
            selected_component = component_map[edit_component_id]

            component_type_options = ["source", "mart", "dashboard", "service", "report", "other"]

            current_type = selected_component["component_type"]
            if current_type not in component_type_options:
                component_type_options.append(current_type)

            current_type_index = component_type_options.index(current_type)

            with st.form("edit_component_form"):
                updated_component_name = st.text_input(
                    "Новое название компонента",
                    value=selected_component["name"],
                )
                updated_component_type = st.selectbox(
                    "Новый тип компонента",
                    component_type_options,
                    index=current_type_index,
                )
                updated_component_description = st.text_area(
                    "Новое описание",
                    value=selected_component["description"] or "",
                    height=80,
                )

                update_component_submit = st.form_submit_button("Сохранить изменения")

            if update_component_submit:
                if not updated_component_name.strip():
                    st.error("Название для компонента не должно быть пустым")
                else:
                    try:
                        update_component_by_id(
                            component_id=edit_component_id,
                            name=updated_component_name.strip(),
                            component_type=updated_component_type,
                            description=updated_component_description.strip() or None,
                        )
                        st.session_state["analysis_result"] = None
                        st.success("Вы успешно обновили компонент")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Не удалось обновить компонент: {e}")

        else:
            st.info("Сначала добавьте хотя бы один компонент")

    with st.expander("Удалить компонент"):
        if components:
            delete_component_options = {}

            for item in components:
                label = f"{item['id']} — {item['name']} ({item['component_type']})"
                delete_component_options[label] = item["id"]

            with st.form("delete_component_form"):
                delete_component_label = st.selectbox(
                    "Компонент для удаления",
                    list(delete_component_options.keys()),
                )
                confirm_delete_component = st.checkbox("Я понимаю, что удаление нельзя отменить")
                delete_component_submit = st.form_submit_button("Удалить компонент")

            if delete_component_submit:
                component_id_to_delete = delete_component_options[delete_component_label]

                if not confirm_delete_component:
                    st.error("Подтвердите удаление компонента")
                else:
                    try:
                        delete_component_by_id(component_id_to_delete)
                        st.session_state["analysis_result"] = None
                        st.success("Вы успешно удалили компонент")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Не удалось удалить компонент: {e}")
        else:
            st.info("Сначала добавьте хотя бы один компонент")

    with st.expander("Добавить новую зависимость"):
        if len(components) < 2:
            st.info("Чтобы создать зависимость нужно минимум два компонента")
        else:
            dependency_component_options = {}

            for item in components:
                label = f"{item['id']} — {item['name']} ({item['component_type']})"
                dependency_component_options[label] = item["id"]

            with st.form("create_dependency_form"):
                source_label = st.selectbox(
                    "Исходный компонент",
                    list(dependency_component_options.keys()),
                    key="dependency_source",
                )
                target_label = st.selectbox(
                    "Зависимый компонент",
                    list(dependency_component_options.keys()),
                    key="dependency_target",
                )
                new_dependency_type = st.selectbox(
                    "Тип зависимости",
                    ["hard", "soft"],
                )

                create_dependency_submit = st.form_submit_button("Добавить зависимость")

            if create_dependency_submit:
                source_id = dependency_component_options[source_label]
                target_id = dependency_component_options[target_label]

                if source_id == target_id:
                    st.error("Компонент не может зависеть сам от себя")
                else:
                    try:
                        create_dependency(
                            source_component_id=source_id,
                            target_component_id=target_id,
                            dependency_type=new_dependency_type,
                        )
                        st.session_state["analysis_result"] = None
                        st.success("Вы успешно добавили зависимость")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Не удалось добавить зависимость: {e}")

    with st.expander("Редактировать зависимость"):
        if dependencies:
            edit_dependency_options = {}
            dependency_map = {}

            for item in dependencies:
                dependency_map[item["id"]] = item

                source_component = component_map.get(item["source_component_id"])
                target_component = component_map.get(item["target_component_id"])

                source_name = source_component["name"] if source_component else "Неизвестный компонент"
                target_name = target_component["name"] if target_component else "Неизвестный компонент"

                label = f"{item['id']} — {source_name} -> {target_name} ({item['dependency_type']})"
                edit_dependency_options[label] = item["id"]

            edit_dependency_label = st.selectbox(
                "Выберите зависимость, чтобы отредактировать её",
                list(edit_dependency_options.keys()),
            )

            edit_dependency_id = edit_dependency_options[edit_dependency_label]
            selected_dependency = dependency_map.get(edit_dependency_id)

            edit_dependency_component_options = {}

            for item in components:
                label = f"{item['id']} — {item['name']} ({item['component_type']})"
                edit_dependency_component_options[label] = item["id"]

            component_labels = list(edit_dependency_component_options.keys())

            current_source_label = None
            current_target_label = None

            for label, component_id in edit_dependency_component_options.items():
                if component_id == selected_dependency["source_component_id"]:
                    current_source_label = label

                if component_id == selected_dependency["target_component_id"]:
                    current_target_label = label

            source_index = component_labels.index(current_source_label)
            target_index = component_labels.index(current_target_label)

            dependency_type_options = ["hard", "soft"]
            current_dependency_type = selected_dependency["dependency_type"]
            dependency_type_index = dependency_type_options.index(current_dependency_type)

            with st.form("edit_dependency_form"):
                updated_source_label = st.selectbox(
                    "Новый исходный компонент",
                    component_labels,
                    index=source_index,
                    key="edit_dependency_source",
                )
                updated_target_label = st.selectbox(
                    "Новый зависимый компонент",
                    component_labels,
                    index=target_index,
                    key="edit_dependency_target",
                )
                updated_dependency_type = st.selectbox(
                    "Новый тип зависимости",
                    dependency_type_options,
                    index=dependency_type_index,
                )

                update_dependency_submit = st.form_submit_button("Сохранить изменения")

            if update_dependency_submit:
                updated_source_id = edit_dependency_component_options[updated_source_label]
                updated_target_id = edit_dependency_component_options[updated_target_label]

                if updated_source_id == updated_target_id:
                    st.error("Компонент не может зависеть сам от себя")
                else:
                    try:
                        update_dependency_by_id(
                            dependency_id=edit_dependency_id,
                            source_component_id=updated_source_id,
                            target_component_id=updated_target_id,
                            dependency_type=updated_dependency_type,
                        )
                        st.session_state["analysis_result"] = None
                        st.success("Вы успешно обновили зависимость")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Не удалось обновить зависимость: {e}")
        else:
            st.info("Сначала добавьте хотя бы одну зависимость")

    with st.expander("Удалить зависимость"):
        if dependencies:
            delete_dependency_options = {}

            for item in dependencies:
                source_component = component_map.get(item["source_component_id"])
                target_component = component_map.get(item["target_component_id"])

                source_name = source_component["name"] if source_component else "Неизвестный компонент"
                target_name = target_component["name"] if target_component else "Неизвестный компонент"

                label = f"{item['id']} — {source_name} -> {target_name} ({item['dependency_type']})"
                delete_dependency_options[label] = item["id"]

            with st.form("delete_dependency_form"):
                delete_dependency_label = st.selectbox(
                    "Выберите зависимость для удаления",
                    list(delete_dependency_options.keys()),
                )
                confirm_delete_dependency = st.checkbox("Я понимаю, что удаление зависимости нельзя отменить")
                delete_dependency_submit = st.form_submit_button("Удалить зависимость")

            if delete_dependency_submit:
                dependency_id_to_delete = delete_dependency_options[delete_dependency_label]

                if not confirm_delete_dependency:
                    st.error("Подтвердите удаление")
                else:
                    try:
                        delete_dependency_by_id(dependency_id_to_delete)
                        st.session_state["analysis_result"] = None
                        st.success("Вы успешно удалили зависимость")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Не удалось удалить зависимость: {e}")
        else:
            st.info("Сначала добавьте хотя бы одну зависимость")

    with st.expander("Запустить анализ влияния"):
        if components:
            component_options = {}

            for item in components:
                label = f"{item['id']} — {item['name']} ({item['component_type']})"
                component_options[label] = item["id"]

            selected_label = st.selectbox(
                "Выберите корневой узел",
                list(component_options.keys()),
            )

            selected_component_id = component_options[selected_label]

            if st.button("Запустить анализ влияния"):
                try:
                    st.session_state["analysis_result"] = run_analysis(selected_component_id)
                    st.rerun()
                except Exception as e:
                    st.session_state["analysis_result"] = None
                    st.error(f"Не удалось запустить анализ: {e}")
        else:
            st.info("Сначала добавьте хотя бы один компонент")

    st.markdown("---")

    with st.expander("Помощь"):
        st.markdown(
            """
            **Что показывает карта**

            Зависимости между аналитическими компонентами, например, источниками данных,
            витринами и дашбордами.

            **Как читать карту**
            - стрелка показывает направление зависимости;
            - если узел A ведёт в узел B, значит, B зависит от A;
            - если источник ломается, система показывает, какие узлы это затронет.

            **Как пользоваться картой**
            1. Выберите корневой узел.
            2. Запустите анализ.
            3. Посмотрите подсветку на карте и список затронутых компонентов.

            **Что обозначают цвета узлов**
            - оранжевый: выбранный корневой узел;
            - красный: затронутый узел;
            - голубой: обычный узел.
            """
        )

metrics_col_1, metrics_col_2, metrics_col_3 = st.columns(3)

with metrics_col_1:
    st.metric("Компоненты", len(components))

with metrics_col_2:
    st.metric("Зависимости", len(dependencies))

with metrics_col_3:
    if analysis_result:
        st.metric("Затронутые узлы", analysis_result["affected_count"])
    else:
        st.metric("Затронутые узлы", "-")

st.subheader("Карта зависимостей")

if components:
    canvas_nodes = build_canvas_nodes(
        components,
        root_id=root_id,
        affected_ids=affected_ids,
    )
    canvas_edges = build_canvas_edges(dependencies)

    canvas_event = graph_canvas(
        nodes=canvas_nodes,
        edges=canvas_edges,
        height=560,
        key="graph_canvas_stage_8",
    )

    if canvas_event:
        st.write("Событие из поля карты:")
        st.json(canvas_event)
else:
    st.info("Карта пока пустая. Добавьте первый компонент через боковую панель.")

if analysis_result:
    root_component = analysis_result["root_component"]
    affected_components = analysis_result["affected_components"]
    affected_count = analysis_result["affected_count"]

    st.subheader("Результат анализа")

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

else:
    st.info("Выберите узел в боковой панели и запустите анализ.")

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
