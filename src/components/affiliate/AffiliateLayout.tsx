import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  ArrowLeft,
  LogOut,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAffiliateCoupon } from "@/hooks/useAffiliateData";
import { toast } from "sonner";
import logoImage from "@/assets/logo.png";

interface AffiliateLayoutProps {
  children: ReactNode;
}

const sidebarLinks = [
  { href: "/affiliate", label: "Overview", icon: LayoutDashboard },
  { href: "/affiliate/commissions", label: "Commissions", icon: DollarSign },
  { href: "/affiliate/referrals", label: "Referrals", icon: Users },
];

export function AffiliateLayout({ children }: AffiliateLayoutProps) {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { data: couponData } = useAffiliateCoupon();

  const copyLink = () => {
    const link = `${window.location.origin}/pricing?coupon=${couponData?.coupon?.code || couponData?.affiliateCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
  };

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
              <span className="block text-xs text-muted-foreground">Affiliate Portal</span>
            </div>
          </Link>
        </div>

        {/* Coupon Code Card */}
        {couponData?.coupon && (
          <div className="p-4 border-b border-border">
            <div className="bg-primary/10 rounded-lg p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Your Coupon Code</p>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-primary">
                  {couponData.coupon.code}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {couponData.coupon.percent_off}% discount for your referrals
              </p>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/affiliate"
                ? location.pathname === "/affiliate"
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
            <span className="block text-xs">Affiliate Partner</span>
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
