import { useEffect } from "react";

declare global {
  interface Window {
    chatbase?: {
      (...args: unknown[]): unknown;
      q?: unknown[];
    };
  }
}

const CHATBASE_SCRIPT_ID = "UP3OnZa2amgRK-U85hyp7";

export function useChatbaseInit() {
  useEffect(() => {
    // Prevent duplicate script load
    if (document.getElementById(CHATBASE_SCRIPT_ID)) {
      return;
    }

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
    document.body.appendChild(script);
  }, []);
}

export function openChatbase() {
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
  const tryClickLauncher = (attempts = 0) => {
    const launcher = 
      document.querySelector<HTMLElement>('[id*="chatbase-bubble"]') ||
      document.querySelector<HTMLElement>('iframe[src*="chatbase"]')?.parentElement?.querySelector("button") ||
      document.querySelector<HTMLElement>('button[aria-label*="chat" i]') ||
      document.querySelector<HTMLElement>('[data-chatbase-widget-button]');

    if (launcher) {
      launcher.click();
    } else if (attempts < 10) {
      // Retry with short delay if widget hasn't loaded yet
      setTimeout(() => tryClickLauncher(attempts + 1), 300);
    }
  };

  tryClickLauncher();
}
