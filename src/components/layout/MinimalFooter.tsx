import { Link } from "react-router-dom";

export function MinimalFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>© {year} ArabiyaPath</span>
        <div className="flex items-center gap-4">
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
