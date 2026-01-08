import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Ticket,
  ShoppingCart,
  Award,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logoImage from "@/assets/logo.png";

interface AdminLayoutProps {
  children: ReactNode;
}

const sidebarLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/content", label: "Content", icon: BookOpen },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/admin/certificates", label: "Certificates", icon: Award },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="ArabiyaPath" className="h-8 w-auto" />
            <div>
              <span className="text-lg font-bold text-foreground">
                Arabiya<span className="text-primary">Path</span>
              </span>
              <span className="block text-xs text-muted-foreground">Admin Panel</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {profile?.first_name} {profile?.last_name}
            </span>
            <span className="block text-xs">Administrator</span>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
