import { useState } from "react";
import { useUnits, useLevels, useDialects } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface UnitForm {
  title: string;
  description: string;
  level_id: string;
  order_index: number;
}

export function UnitsTab() {
  const { data: units, isLoading } = useUnits();
  const { data: levels } = useLevels();
  const { data: dialects } = useDialects();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteUnit, setDeleteUnit] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [form, setForm] = useState<UnitForm>({
    title: "",
    description: "",
    level_id: "",
    order_index: 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: UnitForm) => {
      const { error } = await supabase.from("units").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("Unit created successfully");
      closeDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UnitForm }) => {
      const { error } = await supabase.from("units").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("Unit updated successfully");
      closeDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success("Unit deleted successfully");
      setDeleteUnit(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUnit(null);
    setForm({ title: "", description: "", level_id: "", order_index: 0 });
  };

  const openEdit = (unit: any) => {
    setEditingUnit(unit);
    setForm({
      title: unit.title,
      description: unit.description || "",
      level_id: unit.level_id,
      order_index: unit.order_index,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filteredUnits = units?.filter((u) => {
    const matchesSearch = u.title.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = filterLevel === "all" || u.level_id === filterLevel;
    return matchesSearch && matchesLevel;
  });

  // Group levels by dialect for the select
  const levelsByDialect = dialects?.map((d) => ({
    dialect: d,
    levels: levels?.filter((l) => l.dialect_id === d.id) || [],
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Units</CardTitle>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Unit
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search units..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {levelsByDialect?.map((group) => (
                group.levels.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {group.dialect.name} - {l.name}
                  </SelectItem>
                ))
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Dialect</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits?.length ? (
                filteredUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>{unit.order_index}</TableCell>
                    <TableCell className="font-medium">{unit.title}</TableCell>
                    <TableCell>{unit.levels?.name}</TableCell>
                    <TableCell>{unit.levels?.dialects?.name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(unit)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteUnit(unit.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No units found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Edit Unit" : "Create Unit"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Greetings, Numbers"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Select
                  value={form.level_id}
                  onValueChange={(value) => setForm({ ...form, level_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levelsByDialect?.map((group) => (
                      group.levels.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {group.dialect.name} - {l.name}
                        </SelectItem>
                      ))
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Order Index</Label>
                <Input
                  id="order"
                  type="number"
                  value={form.order_index}
                  onChange={(e) => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || !form.level_id}
              >
                {editingUnit ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUnit} onOpenChange={() => setDeleteUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this unit? This action cannot be undone
              and will also delete all related lessons.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUnit && deleteMutation.mutate(deleteUnit)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
