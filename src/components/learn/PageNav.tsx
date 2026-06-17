import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Crumb {
  label: string;
  to?: string;
}

interface PageNavProps {
  crumbs: Crumb[];
  backTo: string;
  backLabel: string;
  className?: string;
}

/**
 * Back button + breadcrumb trail for course navigation.
 * Back uses browser history when available, falls back to backTo.
 */
export function PageNav({ crumbs, backTo, backLabel, className }: PageNavProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(backTo);
    }
  };

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="gap-1 -ml-2 mb-2 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {backLabel}
      </Button>
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground flex-wrap"
      >
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {c.to && !isLast ? (
                <Link
                  to={c.to}
                  className="hover:text-foreground transition-colors truncate"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast ? "text-foreground font-medium truncate" : "truncate"
                  }
                >
                  {c.label}
                </span>
              )}
              {!isLast && <ChevronRight className="h-3 w-3 shrink-0" />}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
