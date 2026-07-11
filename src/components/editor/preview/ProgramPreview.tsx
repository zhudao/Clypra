import React from "react";
import { PixiProgramPreview } from "./PixiProgramPreview.jsx";
import { WebGLUnavailableError } from "./WebGLUnavailableError.jsx";

// React Error Boundary to catch WebGL / Pixi initialization errors.
// On failure renders WebGLUnavailableError instead of falling back to a Canvas 2D
// renderer — Canvas 2D preview has been retired. WebGL is a hard requirement.
class PreviewErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[PreviewLifecycle] PixiProgramPreview error boundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const ProgramPreview: React.FC<any> = (props) => {
  return (
    <PreviewErrorBoundary fallback={<WebGLUnavailableError />}>
      <PixiProgramPreview {...props} />
    </PreviewErrorBoundary>
  );
};
