import streamlit as st

from api import get_components, get_dependencies
from app_state import init_session_state, prune_graph_selection
from canvas_data import (build_canvas_edges, build_canvas_nodes,
                         get_analysis_highlight_ids, get_valid_edge_ids,
                         get_valid_node_ids)
from canvas_events import handle_canvas_event
from graph_canvas import graph_canvas
from ui_sections import show_analysis_result, show_canvas_message


st.set_page_config(
    page_title="Comanche Airflop",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
    header[data-testid="stHeader"] {
        display: none;
    }

    #MainMenu {
        visibility: hidden;
    }

    footer {
        visibility: hidden;
    }

    .block-container {
        max-width: 100%;
        padding-left: 1rem;
        padding-right: 1rem;
        padding-top: 0.5rem;
        padding-bottom: 0;
    }

    [data-testid="stElementContainer"] {
        width: 100%;
    }

    [data-testid="stAppViewContainer"] {
        overflow-x: hidden;
    }

    [data-testid="stVerticalBlock"] {
        gap: 0;
    }

    iframe {
        width: 100% !important;
        max-width: 100% !important;
        height: calc(100vh - 1rem) !important;
        display: block;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

init_session_state()

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

valid_node_ids = get_valid_node_ids(components)
valid_edge_ids = get_valid_edge_ids(dependencies)
prune_graph_selection(valid_node_ids, valid_edge_ids)

root_id, affected_ids = get_analysis_highlight_ids(analysis_result)

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

show_canvas_message()
show_analysis_result(analysis_result)
