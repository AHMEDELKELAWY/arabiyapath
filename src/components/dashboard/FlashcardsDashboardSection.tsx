import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Flame, Sparkles, Layers, ShoppingBag } from "lucide-react";
import { useFlashcardsDashboard } from "@/hooks/useFlashcardsDashboard";

export function FlashcardsDashboardSection() {
  const { data, isLoading } = useFlashcardsDashboard();

  if (isLoading) return null;
  const summary = data;
  if (!summary) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Membership</h2>
        <Button variant="outline" size="sm" asChild>
          <Link to="/flashcards">Explore</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<Flame className="w-4 h-4 text-orange-500" />} label="Current streak" value={`${summary.streak?.current_streak ?? 0}d`} />
        <Stat icon={<Sparkles className="w-4 h-4 text-primary" />} label="Mastered" value={summary.total_mastered} />
        <Stat icon={<Layers className="w-4 h-4 text-emerald-500" />} label="Units completed" value={`${summary.units.filter(u => u.total > 0 && (u.reviewed ?? u.mastered ?? 0) >= u.total).length}/${summary.units.length}`} />
        <Stat icon={<ShoppingBag className="w-4 h-4 text-muted-foreground" />} label="Due today" value={summary.due_today} />
      </div>


      {summary.units.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress by unit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.units.map((u) => {
              const reviewed = u.reviewed ?? u.mastered ?? 0;
              const pct = u.total ? Math.round((reviewed / u.total) * 100) : 0;
              return (
                <div key={u.unit_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <Link to={`/flashcards/unit/${u.slug}?from=dashboard`} className="hover:underline">
                      {u.title}
                    </Link>
                    <span className="text-muted-foreground">{reviewed}/{u.total}</span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
