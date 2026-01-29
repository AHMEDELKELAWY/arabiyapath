import { useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    chatbase?: {
      (...args: unknown[]): unknown;
      q?: unknown[];
    };
    __chatbaseLoaded?: boolean;
    __chatbaseLoading?: boolean;
  }
}

const CHATBASE_SCRIPT_ID = "UP3OnZa2amgRK-U85hyp7";
const LAZY_LOAD_DELAY_MS = 4000; // Load after 4s as fallback

function loadChatbaseScript(): Promise<void> {
  return new Promise((resolve) => {
    // Already loaded
    if (window.__chatbaseLoaded) {
      resolve();
      return;
    }

    // Already loading
    if (window.__chatbaseLoading) {
      const checkLoaded = setInterval(() => {
        if (window.__chatbaseLoaded) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);
      return;
    }

    // Prevent duplicate script load
    if (document.getElementById(CHATBASE_SCRIPT_ID)) {
      window.__chatbaseLoaded = true;
      resolve();
      return;
    }

    window.__chatbaseLoading = true;

    // Initialize chatbase queue if not already initialized
    if (!window.chatbase) {
      const chatbaseQueue: unknown[][] = [];

      const chatbaseFunc = ((...args: unknown[]) => {
        chatbaseQueue.push(args);
      }) as Window["chatbase"];

      if (chatbaseFunc) {
        chatbaseFunc.q = chatbaseQueue;
      }

      window.chatbase = new Proxy(chatbaseFunc as NonNullable<Window["chatbase"]>, {
        get(target, prop) {
          if (prop === "q") {
            return target.q;
          }
          return (...args: unknown[]) => target(prop as string, ...args);
        },
      });
    }

    // Load the Chatbase embed script
    const script = document.createElement("script");
    script.src = "https://www.chatbase.co/embed.min.js";
    script.id = CHATBASE_SCRIPT_ID;
    script.setAttribute("domain", "www.chatbase.co");
    script.async = true;
    script.onload = () => {
      window.__chatbaseLoaded = true;
      window.__chatbaseLoading = false;
      resolve();
    };
    script.onerror = () => {
      window.__chatbaseLoading = false;
      resolve();
    };
    document.body.appendChild(script);
  });
}

export function useChatbaseInit() {
  const loadedRef = useRef(false);

  useEffect(() => {
    // Lazy load after delay (fallback if user doesn't click button)
    const timer = setTimeout(() => {
      if (!loadedRef.current && !window.__chatbaseLoaded) {
        loadedRef.current = true;
        loadChatbaseScript();
      }
    }, LAZY_LOAD_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);
}

export function openChatbase() {
  // Load script first if not loaded
  loadChatbaseScript().then(() => {
    // Small delay to ensure widget is ready
    setTimeout(() => {
      // Try to use Chatbase API first
      if (window.chatbase && typeof window.chatbase === "function") {
        try {
          window.chatbase("open");
          return;
        } catch {
          // Fall through to DOM method
        }
      }

      // Fallback: programmatically click the Chatbase launcher button
      tryClickLauncher();
    }, 100);
  });
}

function tryClickLauncher(attempts = 0) {
  const launcher =
    document.querySelector<HTMLElement>('[id*="chatbase-bubble"]') ||
    document.querySelector<HTMLElement>('iframe[src*="chatbase"]')?.parentElement?.querySelector("button") ||
    document.querySelector<HTMLElement>('button[aria-label*="chat" i]') ||
    document.querySelector<HTMLElement>('[data-chatbase-widget-button]');

  if (launcher) {
    launcher.click();
  } else if (attempts < 15) {
    // Retry with short delay if widget hasn't loaded yet
    setTimeout(() => tryClickLauncher(attempts + 1), 200);
  }
}