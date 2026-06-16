/**
 * Brand watermark overlay for Flash Card images.
 * Watermark text is NEVER baked into AI-generated images — applied here via CSS.
 */
export function Watermark({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute bottom-2 right-3 select-none text-[11px] font-semibold tracking-wide text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] ${className}`}
    >
      arabiyapath.com
    </div>
  );
}
