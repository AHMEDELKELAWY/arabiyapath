import { useEffect, useRef } from "react";

type UseZohoOptinOptions = {
  formId: string;
  scriptSrc: string;
};

declare global {
  interface Window {
    setupSF?: (
      formId: string,
      trackCode: string,
      isRecaptcha: boolean,
      theme: string,
      isLeadMagnets: boolean,
      optinType: string
    ) => void;
  }
}

/**
 * Loads Zoho optin script once and initializes the embedded signup form.
 * - No SSR issues (client-only)
 * - Ensures container exists before calling setupSF
 * - Reuses existing script tag (no duplicates)
 * - Initializes once per mounted instance (safe for SPA navigation)
 */
export function useZohoOptin({ formId, scriptSrc }: UseZohoOptinOptions) {
  const initRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initRef.current) return;
    initRef.current = true;

    // Zoho may call this if present; keep it as a no-op (does not block submit).
    (window as any)[`runOnFormSubmit_${formId}`] = function () {
      // intentionally empty
    };

    const attemptSetup = (deadline: number) => {
      const container = document.getElementById(formId) as HTMLDivElement | null;
      const submitBtn = document.getElementById("zcWebOptin");

      // Wait until both the root container and submit button exist.
      if (!container || !submitBtn) {
        if (performance.now() < deadline) {
          requestAnimationFrame(() => attemptSetup(deadline));
          return;
        }

        if (!container) console.error("Zoho: container not found", { formId });
        if (!submitBtn) console.error("Zoho: submit button not found", { id: "zcWebOptin" });
        return;
      }

      // Avoid re-initializing the same DOM instance.
      if (container.dataset.zohoInitialized === "1") return;

      if (typeof window.setupSF !== "function") {
        console.error("Zoho: setupSF is not available");
        return;
      }

      try {
        window.setupSF(formId, "ZCFORMVIEW", false, "light", false, "0");
        container.dataset.zohoInitialized = "1";
      } catch (err) {
        console.error("Zoho: setupSF threw", err);
      }
    };

    const runSetup = () => {
      // Give React/Zoho a moment to settle, then retry for up to ~2 seconds.
      const deadline = performance.now() + 2000;
      attemptSetup(deadline);
    };

    // Ensure React has committed DOM for this route.
    requestAnimationFrame(() => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${scriptSrc}"]`
      );

      if (existingScript) {
        // Script exists; if already loaded, setupSF should be available.
        if (typeof window.setupSF === "function") {
          runSetup();
        } else {
          existingScript.addEventListener("load", runSetup, { once: true });
        }
        return;
      }

      const script = document.createElement("script");
      script.src = scriptSrc;
      script.type = "text/javascript";
      script.async = true;
      script.onload = () => runSetup();
      script.onerror = () => {
        console.error("Zoho: failed to load script", { scriptSrc });
      };
      document.head.appendChild(script);
    });
  }, [formId, scriptSrc]);
}
