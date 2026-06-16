import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Image as ImageIcon, Volume2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FlashCardImage } from "@/components/flashcards/msa/FlashCardImage";

export default function AdminFlashcardCards() {
  const [params] = useSearchParams();
  const unitId = params.get("unit") || "";
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    arabic_text: "", english_translation: "", transliteration: "",
    example_arabic: "", example_english: "", image_url: "", image_alt: "",
    audio_url: "", audio_example_url: "", notes: "", published: false, order_index: 0,
  });

  const { data: units } = useQuery({
    queryKey: ["admin-fc-units-min"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("flashcard_units").select("id,title_en").order("order_index");
      return data ?? [];
    },
  });

  const { data: cards } = useQuery({
    queryKey: ["admin-fc-cards", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("flashcards").select("*").eq("unit_id", unitId).order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  const startNew = () => {
    if (!unitId) return toast({ title: "Pick a unit first" });
    setEditing({});
    setForm({
      arabic_text: "", english_translation: "", transliteration: "",
      example_arabic: "", example_english: "", image_url: "", image_alt: "",
      audio_url: "", audio_example_url: "", notes: "", published: false,
      order_index: (cards?.length ?? 0) + 1,
    });
  };

  const startEdit = (c: any) => { setEditing(c); setForm({ ...c }); };

  const save = async () => {
    const payload = { ...form, unit_id: unitId };
    let error;
    if (editing?.id) {
      ({ error } = await (supabase as any).from("flashcards").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await (supabase as any).from("flashcards").insert(payload));
    }
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-fc-cards", unitId] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this card?")) return;
    const { error } = await (supabase as any).from("flashcards").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["admin-fc-cards", unitId] });
  };

  const genImage = async (c: any) => {
    setBusyId(c.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flashcard-image", {
        body: { cardId: c.id },
      });
      if (error) throw error;
      toast({ title: "Image generated" });
      qc.invalidateQueries({ queryKey: ["admin-fc-cards", unitId] });
    } catch (e: any) {
      toast({ title: "Image generation failed", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const genAudio = async (c: any, kind: "main" | "example" = "main") => {
    setBusyId(c.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flashcard-audio", {
        body: { cardId: c.id, kind },
      });
      if (error) throw error;
      toast({ title: "Audio generated" });
      qc.invalidateQueries({ queryKey: ["admin-fc-cards", unitId] });
    } catch (e: any) {
      toast({ title: "Audio generation failed", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Flash Cards</h1>
          <select
            className="border rounded px-2 py-1 bg-background"
            value={unitId}
            onChange={(e) => { window.location.search = `?unit=${e.target.value}`; }}
          >
            <option value="">— select unit —</option>
            {units?.map((u: any) => <option key={u.id} value={u.id}>{u.title_en}</option>)}
          </select>
        </div>
        <Button onClick={startNew} disabled={!unitId}><Plus className="w-4 h-4 mr-2" /> New Card</Button>
      </div>

      {!unitId ? <p className="text-muted-foreground">Pick a unit to manage its cards.</p> : (
        <div className="grid gap-3">
          {cards?.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex gap-4">
                <div className="w-32 shrink-0">
                  <FlashCardImage src={c.image_url} alt={c.image_alt || c.english_translation} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xl" dir="rtl">{c.arabic_text}</p>
                  <p className="text-sm text-muted-foreground">{c.english_translation}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => genImage(c)} disabled={busyId === c.id}>
                      {busyId === c.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ImageIcon className="w-3 h-3 mr-1" />} Image
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => genAudio(c, "main")} disabled={busyId === c.id}>
                      <Volume2 className="w-3 h-3 mr-1" /> Audio
                    </Button>
                    {c.example_arabic && (
                      <Button size="sm" variant="outline" onClick={() => genAudio(c, "example")} disabled={busyId === c.id}>
                        <Volume2 className="w-3 h-3 mr-1" /> Example audio
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => startEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing !== null && (
        <Card className="mt-6">
          <CardHeader><CardTitle>{editing?.id ? "Edit Card" : "New Card"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Arabic (with tashkeel)" value={form.arabic_text} dir="rtl" onChange={(e) => setForm({ ...form, arabic_text: e.target.value })} />
            <Input placeholder="English translation" value={form.english_translation} onChange={(e) => setForm({ ...form, english_translation: e.target.value })} />
            <Input placeholder="Transliteration" value={form.transliteration ?? ""} onChange={(e) => setForm({ ...form, transliteration: e.target.value })} />
            <Textarea placeholder="Example (Arabic with tashkeel)" value={form.example_arabic ?? ""} dir="rtl" onChange={(e) => setForm({ ...form, example_arabic: e.target.value })} />
            <Textarea placeholder="Example (English)" value={form.example_english ?? ""} onChange={(e) => setForm({ ...form, example_english: e.target.value })} />
            <Input placeholder="Image URL (optional override)" value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <Input placeholder="Image alt text" value={form.image_alt ?? ""} onChange={(e) => setForm({ ...form, image_alt: e.target.value })} />
            <Input placeholder="Audio URL (optional override)" value={form.audio_url ?? ""} onChange={(e) => setForm({ ...form, audio_url: e.target.value })} />
            <Input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} />
            <div className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /> <span>Published</span></div>
            <div className="flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
