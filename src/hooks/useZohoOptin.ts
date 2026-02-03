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
 * Falls back to manual form submission if setupSF fails.
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
    let setupSucceeded = false;

    // Create the target iframe for form submission
    const createTargetIframe = () => {
      if (!document.querySelector('iframe[name="_zcSignup"]')) {
        const iframe = document.createElement("iframe");
        iframe.name = "_zcSignup";
        iframe.style.display = "none";
        document.body.appendChild(iframe);
      }
    };

    // Manual form submission handler as fallback
    const addFallbackHandler = () => {
      const submitBtn = document.getElementById("zcWebOptin") as HTMLInputElement;
      const form = document.getElementById("zcampaignOptinForm") as HTMLFormElement;
      const emailInput = document.getElementById("EMBED_FORM_EMAIL_LABEL") as HTMLInputElement;
      const successDiv = document.getElementById("Zc_SignupSuccess");

      if (submitBtn && form && !submitBtn.dataset.fallbackAdded) {
        submitBtn.dataset.fallbackAdded = "1";
        
        submitBtn.addEventListener("click", () => {
          // Basic email validation
          const email = emailInput?.value?.trim();
          if (!email || !email.includes("@")) {
            const errorDiv = document.getElementById("errorMsgDiv");
            if (errorDiv) {
              errorDiv.style.display = "block";
              errorDiv.textContent = "Please enter a valid email address.";
            }
            return;
          }

          // Hide error, show loading state
          const errorDiv = document.getElementById("errorMsgDiv");
          if (errorDiv) errorDiv.style.display = "none";

          // Create iframe and submit
          createTargetIframe();
          form.submit();

          // Show success message after brief delay
          setTimeout(() => {
            if (successDiv) {
              successDiv.style.display = "block";
            }
            if (emailInput) emailInput.value = "";
          }, 1000);
        });
      }
    };

    const trySetup = () => {
      if (setupSucceeded) return;
      
      const container = document.getElementById(formId);
      const submitBtn = document.getElementById("zcWebOptin");

      // Wait for BOTH setupSF function AND the submit button
      if (window.setupSF && container && submitBtn) {
        if (pollInterval) clearInterval(pollInterval);

        try {
          window.setupSF(formId, "ZCFORMVIEW", false, "light", false, "0");
          setupSucceeded = true;
          if (timeoutId) clearTimeout(timeoutId);
        } catch (err) {
          console.error("Zoho setupSF error:", err);
          // setupSF failed, add fallback handler
          createTargetIframe();
          addFallbackHandler();
        }
      }
    };

    const loadScript = () => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${scriptSrc}"]`
      );

      if (existingScript) {
        pollInterval = setInterval(trySetup, 100);
      } else {
        const script = document.createElement("script");
        script.src = scriptSrc;
        script.type = "text/javascript";
        script.async = true;
        script.onload = () => {
          pollInterval = setInterval(trySetup, 100);
        };
        script.onerror = () => {
          console.error("Zoho: failed to load script");
          createTargetIframe();
          addFallbackHandler();
          setShowFallback(true);
        };
        document.head.appendChild(script);
      }

      // Fallback after 5 seconds if setupSF never succeeds
      timeoutId = setTimeout(() => {
        if (pollInterval) clearInterval(pollInterval);
        if (!setupSucceeded) {
          createTargetIframe();
          addFallbackHandler();
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
