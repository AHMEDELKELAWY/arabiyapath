import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminFlashcardPacks() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    slug: "", title: "", description: "",
    price_cents: 1900, currency: "USD", access_type: "lifetime",
    product_id: "", published: false,
  });

  const { data: packs } = useQuery({
    queryKey: ["admin-fc-packs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("flashcard_packs").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-for-packs"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id,name,price,scope")
        .eq("scope", "flashcard_pack");
      return data ?? [];
    },
  });


  const { data: units } = useQuery({
    queryKey: ["admin-fc-units-for-packs"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("flashcard_units").select("id,title_en").order("order_index");
      return data ?? [];
    },
  });

  const startNew = () => { setEditing({}); setForm({ slug: "", title: "", description: "", price_cents: 1900, currency: "USD", access_type: "lifetime", product_id: "", published: false }); };
  const startEdit = (p: any) => { setEditing(p); setForm({ ...p }); };

  const save = async () => {
    const payload: any = { ...form };
    if (!payload.product_id) payload.product_id = null;
    let error;
    if (editing?.id) {
      ({ error } = await (supabase as any).from("flashcard_packs").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await (supabase as any).from("flashcard_packs").insert(payload));
    }
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-fc-packs"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this pack?")) return;
    const { error } = await (supabase as any).from("flashcard_packs").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["admin-fc-packs"] });
  };

  const toggleUnit = async (packId: string, unitId: string, attached: boolean) => {
    if (attached) {
      await (supabase as any).from("flashcard_pack_units").delete().eq("pack_id", packId).eq("unit_id", unitId);
    } else {
      await (supabase as any).from("flashcard_pack_units").insert({ pack_id: packId, unit_id: unitId });
    }
    qc.invalidateQueries({ queryKey: ["pack-units", packId] });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vocabulary Packs</h1>
        <Button onClick={startNew}><Plus className="w-4 h-4 mr-2" /> New Pack</Button>
      </div>

      <div className="grid gap-3">
        {packs?.map((p: any) => (
          <PackRow key={p.id} pack={p} units={units} onEdit={() => startEdit(p)} onDel={() => del(p.id)} onToggleUnit={toggleUnit} />
        ))}
      </div>

      {editing !== null && (
        <Card className="mt-6">
          <CardHeader><CardTitle>{editing?.id ? "Edit Pack" : "New Pack"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Description" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Price (cents)" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: Number(e.target.value) })} />
              <Input placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              <Input placeholder="Access type" value={form.access_type} onChange={(e) => setForm({ ...form, access_type: e.target.value })} />
            </div>
            <select className="w-full border rounded px-2 py-2 bg-background" value={form.product_id ?? ""} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
              <option value="">— link to product (for PayPal checkout) —</option>
              {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name} (${p.price})</option>)}
            </select>
            <div className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /> <span>Published</span></div>
            <div className="flex gap-2"><Button onClick={save}>Save</Button><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}

function PackRow({ pack, units, onEdit, onDel, onToggleUnit }: any) {
  const { data: attached } = useQuery({
    queryKey: ["pack-units", pack.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("flashcard_pack_units").select("unit_id").eq("pack_id", pack.id);
      return new Set((data ?? []).map((x: any) => x.unit_id));
    },
  });
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium">{pack.title} — ${(pack.price_cents / 100).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">/{pack.slug} · {pack.published ? "published" : "draft"} · product: {pack.product_id ? "linked" : "—"}</p>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="w-4 h-4" /></Button>
            <Button size="sm" variant="ghost" onClick={onDel}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-xs font-medium mb-1">Units in pack:</p>
          <div className="flex flex-wrap gap-1">
            {units?.map((u: any) => {
              const isOn = attached?.has(u.id);
              return (
                <button key={u.id} onClick={() => onToggleUnit(pack.id, u.id, isOn)} className={`text-xs px-2 py-1 rounded border ${isOn ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>
                  {u.title_en}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
