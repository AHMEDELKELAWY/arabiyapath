import { ReactNode } from "react";
import { Link } from "react-router-dom";
import logoImage from "@/assets/logo.png";

interface FocusLayoutProps {
  children: ReactNode;
  backTo?: string;
}

export function FocusLayout({ children, backTo }: FocusLayoutProps) {
  const logoContent = (
    <>
      <img src={logoImage} alt="ArabiyaPath" className="h-8 w-8" />
      <span className="text-lg font-bold text-foreground">ArabiyaPath</span>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/40">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            {backTo ? (
              <Link to={backTo} className="flex items-center gap-2">
                {logoContent}
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                {logoContent}
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1 pt-16">{children}</main>
    </div>
  );
}
