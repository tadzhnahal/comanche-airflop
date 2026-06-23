import React from "react";
import { Handle, Position } from "@xyflow/react";

type ComponentNodeProps = {
  data: {
    label?: string;
  };
};

function ComponentNode(props: ComponentNodeProps) {
  const label = props.data.label || "Unnamed component";

  return (
    <>
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className="graph-handle"
      />
      <Handle
        id="source-top"
        type="source"
        position={Position.Top}
        className="graph-handle"
      />

      <Handle
        id="target-right"
        type="target"
        position={Position.Right}
        className="graph-handle"
      />
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        className="graph-handle"
      />

      <Handle
        id="target-bottom"
        type="target"
        position={Position.Bottom}
        className="graph-handle"
      />
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        className="graph-handle"
      />

      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className="graph-handle"
      />
      <Handle
        id="source-left"
        type="source"
        position={Position.Left}
        className="graph-handle"
      />

      <div className="graph-node-content">
        <div className="graph-node-label">
          {label}
        </div>
      </div>
    </>
  );
}

export default ComponentNode;
