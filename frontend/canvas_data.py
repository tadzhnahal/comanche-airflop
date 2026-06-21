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


def get_valid_node_ids(components):
    valid_node_ids = set()

    for item in components:
        valid_node_ids.add(str(item["id"]))

    return valid_node_ids


def get_valid_edge_ids(dependencies):
    valid_edge_ids = set()

    for item in dependencies:
        valid_edge_ids.add(str(item["id"]))

    return valid_edge_ids


def get_analysis_highlight_ids(analysis_result):
    root_id = None
    affected_ids = []

    if not analysis_result:
        return root_id, affected_ids

    root_id = analysis_result["root_component"]["id"]

    for item in analysis_result["affected_components"]:
        affected_ids.append(item["id"])

    return root_id, affected_ids


def build_component_map(components):
    component_map = {}

    for item in components:
        component_map[item["id"]] = item

    return component_map
