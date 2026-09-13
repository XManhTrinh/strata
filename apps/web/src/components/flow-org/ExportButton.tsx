"use client";

export default function ExportButton() {
  const handleExport = () => {
    // Export the visible org chart area as JSON / placeholder for PNG
    const flowContainer = document.querySelector(".react-flow") as HTMLElement;
    if (!flowContainer) {
      console.warn("Could not find .react-flow container for export");
      return;
    }

    // For now, log and alert. In production, use html2canvas or similar.
    console.log("Export as PNG triggered (placeholder)");

    // Attempt to serialize visible nodes from the DOM data
    const nodeEls = document.querySelectorAll<HTMLElement>(".react-flow__node");
    const exportData = {
      exportedAt: new Date().toISOString(),
      nodeCount: nodeEls.length,
      message: "PNG export placeholder — integrate html2canvas for actual image export",
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "org-chart-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-variant-foreground bg-surface border border-outline-variant rounded-lg hover:bg-surface-container-lowest dark:hover:bg-surface-container-high transition-colors"
      title="Export org chart as PNG"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export
    </button>
  );
}
