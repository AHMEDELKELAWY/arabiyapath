import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Package } from "lucide-react";
import {
  useAdminFlashcardScope,
  useAdminLearnScope,
} from "@/components/admin/AdminScopeContext";

/**
 * Two-dropdown scope bar: (Course / Level) + (Unit).
 * All admin content pages render this at the top so context is never lost.
 */

interface Props {
  scope: "flashcard" | "learn";
  /** When true, adds an "All units" option (used on Units list pages). */
  allowAllUnits?: boolean;
  /** Optional right-hand slot for page-specific controls. */
  right?: React.ReactNode;
  /** Optional hint line rendered below the selectors. */
  hint?: React.ReactNode;
}

export function AdminScopePicker({ scope, allowAllUnits, right, hint }: Props) {
  return scope === "flashcard" ? (
    <FlashcardPicker allowAllUnits={allowAllUnits} right={right} hint={hint} />
  ) : (
    <LearnPicker allowAllUnits={allowAllUnits} right={right} hint={hint} />
  );
}

function FlashcardPicker({ allowAllUnits, right, hint }: Omit<Props, "scope">) {
  const {
    levelId, unitId, setLevel, setUnit, levelOptions, unitOptions,
  } = useAdminFlashcardScope();

  return (
    <ScopeBar
      levelId={levelId}
      unitId={unitId}
      setLevel={setLevel}
      setUnit={setUnit}
      levels={levelOptions.map((l) => ({ id: l.id, label: l.label }))}
      units={unitOptions.map((u) => ({ id: u.id, label: u.title }))}
      allowAllUnits={allowAllUnits}
      right={right}
      hint={hint}
    />
  );
}

function LearnPicker({ allowAllUnits, right, hint }: Omit<Props, "scope">) {
  const { levelId, unitId, setLevel, setUnit, levelOptions, unitOptions } = useAdminLearnScope();
  return (
    <ScopeBar
      levelId={levelId}
      unitId={unitId}
      setLevel={setLevel}
      setUnit={setUnit}
      levels={levelOptions.map((l) => ({ id: l.id, label: l.label }))}
      units={unitOptions.map((u) => ({ id: u.id, label: u.title }))}
      allowAllUnits={allowAllUnits}
      right={right}
      hint={hint}
    />
  );
}

interface BarProps {
  levelId: string | null;
  unitId: string | null;
  setLevel: (id: string | null) => void;
  setUnit: (id: string | null) => void;
  levels: { id: string; label: string }[];
  units: { id: string; label: string }[];
  allowAllUnits?: boolean;
  right?: React.ReactNode;
  hint?: React.ReactNode;
}

const ALL_UNITS = "__all__";

function ScopeBar({
  levelId, unitId, setLevel, setUnit, levels, units, allowAllUnits, right, hint,
}: BarProps) {
  return (
    <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mb-4 bg-background/90 backdrop-blur border-b border-border/60">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 min-w-[240px]">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <Select value={levelId ?? ""} onValueChange={(v) => setLevel(v || null)}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Course / Level" />
            </SelectTrigger>
            <SelectContent>
              {levels.length === 0 && (
                <SelectItem value="__none__" disabled>
                  No levels available
                </SelectItem>
              )}
              {levels.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 min-w-[220px]">
          <Package className="w-4 h-4 text-muted-foreground" />
          <Select
            value={unitId ?? (allowAllUnits ? ALL_UNITS : "")}
            onValueChange={(v) => setUnit(v === ALL_UNITS ? null : v || null)}
            disabled={!levelId}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder={levelId ? "Select unit" : "Pick a level first"} />
            </SelectTrigger>
            <SelectContent>
              {allowAllUnits && <SelectItem value={ALL_UNITS}>All units in level</SelectItem>}
              {units.length === 0 && (
                <SelectItem value="__none__" disabled>
                  No units in this level
                </SelectItem>
              )}
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
