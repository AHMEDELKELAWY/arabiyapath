import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface DirectAnswerLink {
  href: string;
  label: string;
}

interface DirectAnswerProps {
  text: string;
  links?: DirectAnswerLink[];
  linksTitle?: string;
}

export function DirectAnswer({ text, links, linksTitle }: DirectAnswerProps) {
  return (
    <div className="bg-accent/50 border border-primary/10 rounded-2xl p-6 md:p-8">
      <p className="text-foreground text-base md:text-lg leading-relaxed">
        {text}
      </p>
      {links && links.length > 0 && (
        <div className="mt-5 pt-5 border-t border-primary/10">
          {linksTitle && (
            <p className="text-sm font-medium text-muted-foreground mb-3">{linksTitle}</p>
          )}
          <div className="flex flex-wrap gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-background rounded-lg border border-border text-sm font-medium text-foreground hover:border-primary/30 hover:text-primary transition-colors cursor-pointer"
                role="link"
              >
                {link.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
