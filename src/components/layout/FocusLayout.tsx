import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo.png";
import { LogOut } from "lucide-react";

interface FocusLayoutProps {
  children: ReactNode;
}

export function FocusLayout({ children }: FocusLayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img src={logoImage} alt="ArabiyaPath" className="h-8 w-8" />
              <span className="text-lg font-bold text-foreground">ArabiyaPath</span>
            </Link>

            {/* Auth links */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="gap-1.5 text-muted-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Log out</span>
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-1 pt-16">{children}</main>
    </div>
  );
}
