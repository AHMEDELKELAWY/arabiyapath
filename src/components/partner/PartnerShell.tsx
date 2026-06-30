import { ReactNode } from "react";
import logoImage from "@/assets/logo.png";

interface Props {
  children: ReactNode;
}

/**
 * Distraction-free shell for partner landing pages.
 * Logo-only header, no nav, no footer, no chat widgets.
 */
export function PartnerShell({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoImage} alt="ArabiyaPath" width={36} height={36} className="h-9 w-9" />
              <span className="text-base font-bold tracking-tight text-foreground">ArabiyaPath</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Private invitation
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
