import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Global handlers — log only. User-facing errors are surfaced by the layer
// closest to the action (React Query for observed queries, forms/mutations
// for actions, error boundaries for render errors). A blanket toast here
// caused confusing red banners for benign background rejections.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    const reason: any = e.reason;
    const name = reason?.name;
    if (name === "AbortError" || name === "CanceledError") return;
    console.error("[unhandledrejection]", reason);
  });
  window.addEventListener("error", (e) => {
    const msg = e.message || "";
    if (msg.includes("ResizeObserver")) return;
    console.error("[window.error]", e.error || msg);
  });
}


createRoot(document.getElementById("root")!).render(
  <ErrorBoundary name="root">
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </ErrorBoundary>
);
