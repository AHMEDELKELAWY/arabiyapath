import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IMAGE_STYLES,
  VOICES,
  type LessonMediaSettings,
} from "@/lib/admin/lessonMediaSettings";

const QUALITY_LABELS = ["Draft", "Simple", "Balanced", "Detailed", "Maximum"];

interface Props {
  settings: LessonMediaSettings;
  onChange: (next: LessonMediaSettings) => void;
}

export function LessonMediaSettingsPanel({ settings, onChange }: Props) {
  const set = <K extends keyof LessonMediaSettings>(key: K, value: LessonMediaSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Image style</Label>
        <Select value={settings.image_style} onValueChange={(v) => set("image_style", v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_STYLES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Image quality — {QUALITY_LABELS[settings.image_quality - 1]}
        </Label>
        <Slider
          min={1}
          max={5}
          step={1}
          value={[settings.image_quality]}
          onValueChange={([v]) => set("image_quality", v)}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ms_image_prompt" className="text-xs uppercase tracking-wide text-muted-foreground">
          Image prompt (optional — leave empty to use the lesson title)
        </Label>
        <Textarea
          id="ms_image_prompt"
          rows={2}
          value={settings.image_prompt}
          onChange={(e) => set("image_prompt", e.target.value)}
          placeholder="e.g., Two friends greeting each other in a Gulf café"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Voice</Label>
        <Select value={settings.voice_id} onValueChange={(v) => set("voice_id", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOICES.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Speaking speed — {settings.speed.toFixed(2)}×
        </Label>
        <Slider
          min={0.7}
          max={1.2}
          step={0.05}
          value={[settings.speed]}
          onValueChange={([v]) => set("speed", Number(v.toFixed(2)))}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Voice stability — {Math.round(settings.stability * 100)}%
        </Label>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={[settings.stability]}
          onValueChange={([v]) => set("stability", Number(v.toFixed(2)))}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Max clip length — {settings.max_chars} characters
        </Label>
        <Slider
          min={50}
          max={1000}
          step={50}
          value={[settings.max_chars]}
          onValueChange={([v]) => set("max_chars", v)}
        />
      </div>
    </div>
  );
}
