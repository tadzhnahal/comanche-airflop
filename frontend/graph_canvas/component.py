import os

import streamlit.components.v1 as components


component_dir = os.path.dirname(os.path.abspath(__file__))
build_dir = os.path.join(component_dir, "frontend", "dist")

_graph_canvas = components.declare_component(
    "graph_canvas",
    path=build_dir,
)


def graph_canvas(
    nodes,
    edges,
    height=680,
    analysis_mode=False,
    layout_version=0,
    key=None,
):
    return _graph_canvas(
        nodes=nodes,
        edges=edges,
        height=height,
        analysis_mode=analysis_mode,
        layout_version=layout_version,
        default=None,
        key=key,
        component_height=height + 16,
    )
