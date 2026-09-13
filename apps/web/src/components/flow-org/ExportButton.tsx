"use client";

import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { Icon } from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";

export default function ExportButton() {
  const { getNodes } = useReactFlow();

  const handleExport = useCallback(() => {
    const nodes = getNodes();
    const data = {
      exportedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `org-chart-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [getNodes]);

  return (
    <Button variant="outlined" size="xs" onClick={handleExport}>
      <Icon name="download" size={18} />
      Export
    </Button>
  );
}
