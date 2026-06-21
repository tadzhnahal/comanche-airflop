import React from "react";
import ReactDOM from "react-dom/client";
import { withStreamlitConnection } from "streamlit-component-lib";

import GraphCanvas from "./GraphCanvas";
import "./styles.css";

const ConnectedGraphCanvas = withStreamlitConnection(GraphCanvas);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ConnectedGraphCanvas />
  </React.StrictMode>
);
