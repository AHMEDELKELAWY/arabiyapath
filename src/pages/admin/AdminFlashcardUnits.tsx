import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useFlashcardCourseStructure } from "@/hooks/useFlashcardCourseStructure";
import { AdminScopePicker } from "@/components/admin/AdminScopePicker";
import { useAdminFlashcardScope } from "@/components/admin/AdminScopeContext";

type UnitForm = {
  slug: string;
  title_en: string;
  title_ar: string;
  description: string;
  is_free: boolean;
  published: boolean;
  order_index: number;
  course_level_id: string | null;
};

const EMPTY: UnitForm = {
  slug: "",
  title_en: "",
  title_ar: "",
  description: "",
  is_free: false,
  published: false,
  order_index: 0,
  course_level_id: null,
};

export default function AdminFlashcardUnits() {
  const qc = useQueryClient();
  const adminScope = useAdminFlashcardScope();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<UnitForm>(EMPTY);

  const { data: units } = useQuery({
    queryKey: ["admin-fc-units"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: courses } = useFlashcardCourseStructure();

  // Flatten courses → levels for the picker.
  const levelOptions = (courses ?? []).flatMap((c) =>
    c.levels.map((l) => ({
      id: l.id,
      label: `${c.title_en} — ${l.title_en}`,
    }))
  );

  const levelLookup = new Map(
    (courses ?? []).flatMap((c) =>
      c.levels.map((l) => [l.id, { course: c.title_en, level: l.title_en }])
    )
  );

  // Group units by "Course — Level". Unassigned units land in "Unassigned".
  const grouped: Record<string, any[]> = {};
  for (const u of units ?? []) {
    const info = u.course_level_id
      ? levelLookup.get(u.course_level_id)
      : undefined;
    const key = info ? `${info.course} — ${info.level}` : "Unassigned";
    (grouped[key] ??= []).push(u);
  }
  const groupOrder = Object.keys(grouped).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  const startNew = () => {
    setEditing({});
    setForm({
      ...EMPTY,
      order_index: (units?.length ?? 0) + 1,
      course_level_id: levelOptions[0]?.id ?? null,
    });
  };

  const startEdit = (u: any) => {
    setEditing(u);
    setForm({
      slug: u.slug,
      title_en: u.title_en,
      title_ar: u.title_ar ?? "",
      description: u.description ?? "",
      is_free: u.is_free,
      published: u.published,
      order_index: u.order_index,
      course_level_id: u.course_level_id ?? null,
    });
  };

  const save = async () => {
    const payload = { ...form };
    let error;
    if (editing?.id) {
      ({ error } = await (supabase as any)
        .from("flashcard_units")
        .update(payload)
        .eq("id", editing.id));
    } else {
      ({ error } = await (supabase as any).from("flashcard_units").insert(payload));
    }
    if (error) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Saved" });
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-fc-units"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this unit and all its cards?")) return;
    const { error } = await (supabase as any)
      .from("flashcard_units")
      .delete()
      .eq("id", id);
    if (error)
      return toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    qc.invalidateQueries({ queryKey: ["admin-fc-units"] });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Spoken Arabic — Units</h1>
        <Button onClick={startNew}>
          <Plus className="w-4 h-4 mr-2" /> New Unit
        </Button>
      </div>

      <div className="mb-6 rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
        <p className="text-foreground font-medium">
          Units are organized under Courses → Levels (e.g. Spoken Arabic → Beginner).
          The hierarchy is data-driven — add new courses or levels directly in the database
          to support Business Arabic, Quran Arabic, Kids Arabic, etc. without code changes.
        </p>
        <p>
          Every unit automatically includes: Learn, Listening, Speaking, and Test Yourself.
          The Grammar tab appears whenever the unit has at least one published Grammar card.
        </p>
      </div>

      <div className="space-y-6">
        {groupOrder.map((groupKey) => (
          <div key={groupKey} className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              {groupKey}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({grouped[groupKey].length})
              </span>
            </h2>
            <div className="grid gap-3">
              {grouped[groupKey].map((u: any) => (
                <Card key={u.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.title_en}</span>
                        {u.is_free && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                            Free
                          </span>
                        )}
                        {!u.published && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-700">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        /{u.slug} · order {u.order_index}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/admin/flashcards/cards?unit=${u.id}`}>Cards</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(u)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => del(u.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing !== null && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{editing?.id ? "Edit Unit" : "New Unit"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Course / Level
              </label>
              <Select
                value={form.course_level_id ?? "__none__"}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    course_level_id: v === "__none__" ? null : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {levelOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
            <Input
              placeholder="Title (EN)"
              value={form.title_en}
              onChange={(e) => setForm({ ...form, title_en: e.target.value })}
            />
            <Input
              placeholder="Title (AR with tashkeel)"
              value={form.title_ar}
              onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
              dir="rtl"
            />
            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
            <Input
              type="number"
              value={form.order_index}
              onChange={(e) =>
                setForm({ ...form, order_index: Number(e.target.value) })
              }
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_free}
                onCheckedChange={(v) => setForm({ ...form, is_free: v })}
              />{" "}
              <span>Free unit</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.published}
                onCheckedChange={(v) => setForm({ ...form, published: v })}
              />{" "}
              <span>Published</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
