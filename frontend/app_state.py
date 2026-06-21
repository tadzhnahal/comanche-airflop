import streamlit as st


def init_session_state():
    defaults = {
        "analysis_result": None,
        "selected_node_ids": [],
        "selected_edge_ids": [],
        "last_canvas_event": None,
        "last_canvas_event_type": None,
        "last_processed_canvas_event_id": None,
        "graph_positions": {},
        "analysis_mode": False,
        "canvas_message": None,
        "layout_version": 0,
    }

    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def clear_graph_selection():
    st.session_state["selected_node_ids"] = []
    st.session_state["selected_edge_ids"] = []


def prune_graph_selection(valid_node_ids, valid_edge_ids):
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


def reset_after_data_change(message):
    st.session_state["selected_node_ids"] = []
    st.session_state["selected_edge_ids"] = []
    st.session_state["analysis_result"] = None
    st.session_state["analysis_mode"] = False
    st.session_state["canvas_message"] = message
