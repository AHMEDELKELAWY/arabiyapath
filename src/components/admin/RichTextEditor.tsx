import { useEffect, useRef } from "react";
import { Bold, Italic, List, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Minimal rich text editor: bold, italic, bullet list and hyperlinks only.
 */
export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };

  const addLink = () => {
    const url = window.prompt("Enter the URL (https://...)");
    if (!url) return;
    const safe = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    exec("createLink", safe);
  };

  return (
    <div className={cn("rounded-md border border-input bg-background", className)}>
      <div className="flex items-center gap-1 border-b border-border p-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("bold")} aria-label="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("italic")} aria-label="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("insertUnorderedList")} aria-label="Bullet list">
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={addLink} aria-label="Insert link">
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className="min-h-[220px] w-full px-3 py-2 text-sm outline-none [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
