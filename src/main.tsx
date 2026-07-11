import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { toastError } from "./lib/errors";

// Global handlers for uncaught errors so nothing fails silently.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    // Avoid noisy toasts for aborted fetches / navigation cancellations.
    const reason: any = e.reason;
    const name = reason?.name;
    if (name === "AbortError" || name === "CanceledError") return;
    toastError(reason, "An unexpected error occurred");
  });
  window.addEventListener("error", (e) => {
    // Only surface real Error objects; ignore ResizeObserver noise.
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
