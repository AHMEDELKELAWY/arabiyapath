import { useEffect, useRef, useState } from "react";

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
 * Loads Zoho optin script and initializes the embedded signup form.
 * Uses polling to wait for Zoho to render #zcWebOptin before calling setupSF.
 */
export function useZohoOptin({ formId, scriptSrc }: UseZohoOptinOptions) {
  const initRef = useRef(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initRef.current) return;
    initRef.current = true;

    // Zoho may call this if present; keep it as a no-op.
    (window as any)[`runOnFormSubmit_${formId}`] = function () {};

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let setupCalled = false;

    const trySetup = () => {
      if (setupCalled) return;
      
      const container = document.getElementById(formId);
      const submitBtn = document.getElementById("zcWebOptin");

      // Wait for BOTH setupSF function AND the submit button
      if (window.setupSF && container && submitBtn) {
        setupCalled = true;
        if (pollInterval) clearInterval(pollInterval);
        if (timeoutId) clearTimeout(timeoutId);

        try {
          window.setupSF(formId, "ZCFORMVIEW", false, "light", false, "0");
        } catch (err) {
          console.error("Zoho setupSF error:", err);
        }
      }
    };

    const loadScript = () => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${scriptSrc}"]`
      );

      if (existingScript) {
        // Script already exists, start polling immediately
        pollInterval = setInterval(trySetup, 100);
      } else {
        const script = document.createElement("script");
        script.src = scriptSrc;
        script.type = "text/javascript";
        script.async = true;
        script.onload = () => {
          // Start polling after script loads
          pollInterval = setInterval(trySetup, 100);
        };
        script.onerror = () => {
          console.error("Zoho: failed to load script");
          setShowFallback(true);
        };
        document.head.appendChild(script);
      }

      // Fallback after 5 seconds
      timeoutId = setTimeout(() => {
        if (!setupCalled) {
          if (pollInterval) clearInterval(pollInterval);
          setShowFallback(true);
        }
      }, 5000);
    };

    // Wait for React to commit DOM
    requestAnimationFrame(loadScript);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [formId, scriptSrc]);

  return { showFallback };
}
