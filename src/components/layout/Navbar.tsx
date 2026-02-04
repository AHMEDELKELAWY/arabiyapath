import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import logoImage from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const dialectLinks = [
  { href: "/learn/gulf-arabic", label: "Gulf Arabic" },
  { href: "/learn/fusha-arabic", label: "Fusha Arabic" },
  { href: "/learn/egyptian-arabic", label: "Egyptian Arabic", comingSoon: true },
];

const mainNavLinks = [
  { href: "/", label: "Home" },
  { href: "/flash-cards", label: "Flash Cards" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dialectsOpen, setDialectsOpen] = useState(false);
  const location = useLocation();
  const { user, isLoading, signOut } = useAuth();

  const isDialectActive = dialectLinks.some(link => location.pathname === link.href);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="ArabiyaPath Logo" width={40} height={40} className="h-10 w-auto" />
            <span className="text-xl font-bold text-foreground">
              Arabiya<span className="text-primary">Path</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {/* Home */}
            <Link
              to="/"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                location.pathname === "/"
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              Home
            </Link>

            {/* Dialects Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors outline-none",
                  isDialectActive
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                Dialects
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-background border border-border shadow-lg z-50">
                {dialectLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link
                      to={link.href}
                      className={cn(
                        "flex items-center justify-between w-full cursor-pointer",
                        location.pathname === link.href && "text-primary"
                      )}
                    >
                      <span>{link.label}</span>
                      {link.comingSoon && (
                        <span className="text-xs text-muted-foreground">(Coming Soon)</span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Flash Cards */}
            <Link
              to="/flash-cards"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                location.pathname === "/flash-cards"
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              Flash Cards
            </Link>

            {/* Pricing */}
            <Link
              to="/pricing"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                location.pathname === "/pricing"
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              Pricing
            </Link>

            {/* Blog */}
            <Link
              to="/blog"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                location.pathname === "/blog"
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              Blog
            </Link>
          </div>

          {/* Desktop Auth - Right Side */}
          <div className="hidden md:flex items-center gap-4">
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Log in
                </Link>
                <Button asChild>
                  <Link to="/free-gulf-lesson">Start Free Gulf Lesson</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-2">
              {/* Auth buttons at top for mobile */}
              <div className="flex flex-col gap-2 pb-4 border-b border-border">
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Button variant="outline" className="w-full" onClick={() => { signOut(); setIsOpen(false); }}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Log in
                    </Link>
                    <Button asChild className="w-full">
                      <Link to="/free-gulf-lesson" onClick={() => setIsOpen(false)}>Start Free Gulf Lesson</Link>
                    </Button>
                  </>
                )}
              </div>

              {/* Home */}
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === "/"
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                Home
              </Link>

              {/* Flash Cards */}
              <Link
                to="/flash-cards"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === "/flash-cards"
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                Flash Cards
              </Link>

              {/* Dialects Accordion */}
              <Collapsible open={dialectsOpen} onOpenChange={setDialectsOpen}>
                <CollapsibleTrigger
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isDialectActive
                      ? "text-primary bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  Dialects
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    dialectsOpen && "rotate-180"
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 mt-1">
                  {dialectLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg text-sm transition-colors",
                        location.pathname === link.href
                          ? "text-primary bg-accent"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <span>{link.label}</span>
                      {link.comingSoon && (
                        <span className="text-xs text-muted-foreground/70">(Coming Soon)</span>
                      )}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Pricing */}
              <Link
                to="/pricing"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === "/pricing"
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                Pricing
              </Link>

              {/* Blog */}
              <Link
                to="/blog"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === "/blog"
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                Blog
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
