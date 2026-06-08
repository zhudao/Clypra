import React from "react";
import { useUIStore } from "@/store/uiStore";
import { SourcePreview } from "./SourcePreview";
import { ProgramPreview } from "./ProgramPreview";

const PreviewPanelComponent: React.FC = () => {
  const { previewMode } = useUIStore();

  // If in source mode, show SourcePreview
  if (previewMode === "source") {
    return <SourcePreview />;
  }

  return <ProgramPreview />;
};

// Memoize to prevent re-renders when parent (EditorLayout) re-renders due to window resize
export const PreviewPanel = React.memo(PreviewPanelComponent);
