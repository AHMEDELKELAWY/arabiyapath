import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminFlashcardPurchases() {
  const { data: purchases } = useQuery({
    queryKey: ["admin-fc-purchases"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_purchases")
        .select("*, flashcard_packs(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Vocabulary Purchases</h1>
      <div className="grid gap-2">
        {!purchases?.length && <p className="text-muted-foreground">No purchases yet.</p>}
        {purchases?.map((p: any) => (
          <Card key={p.id}>
            <CardContent className="p-4 flex justify-between items-center text-sm">
              <div>
                <p className="font-medium">{p.flashcard_packs?.title ?? p.pack_id}</p>
                <p className="text-xs text-muted-foreground">{p.user_id} · {p.provider_code} · {p.status}</p>
              </div>
              <div className="text-right">
                <p>${(p.amount_cents / 100).toFixed(2)} {p.currency}</p>
                <p className="text-xs text-muted-foreground">{p.purchased_at ?? p.created_at}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
