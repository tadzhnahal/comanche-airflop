import os

import streamlit.components.v1 as components


component_dir = os.path.dirname(os.path.abspath(__file__))
build_dir = os.path.join(component_dir, "frontend", "dist")

_graph_canvas = components.declare_component(
    "graph_canvas",
    path=build_dir,
)


def graph_canvas(nodes, edges, height=620, key=None):
    return _graph_canvas(
        nodes=nodes,
        edges=edges,
        height=height,
        default=None,
        key=key,
    )
