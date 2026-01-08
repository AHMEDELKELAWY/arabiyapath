import { useState } from "react";
import { useLessons, useUnits, useLevels, useDialects } from "@/hooks/useAdminData";
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
import { Plus, Pencil, Trash2, Search, Image, Volume2, Eye, Loader2, Mic } from "lucide-react";
import { toast } from "sonner";

interface LessonForm {
  title: string;
  unit_id: string;
  order_index: number;
  arabic_text: string;
  transliteration: string;
  image_url: string;
  audio_url: string;
}

export function LessonsTab() {
  const { data: lessons, isLoading } = useLessons();
  const { data: units } = useUnits();
  const { data: levels } = useLevels();
  const { data: dialects } = useDialects();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<any>(null);
  const [deleteLesson, setDeleteLesson] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [form, setForm] = useState<LessonForm>({
    title: "",
    unit_id: "",
    order_index: 0,
    arabic_text: "",
    transliteration: "",
    image_url: "",
    audio_url: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: LessonForm) => {
      const { error } = await supabase.from("lessons").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Lesson created successfully");
      closeDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LessonForm }) => {
      const { error } = await supabase.from("lessons").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Lesson updated successfully");
      closeDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Lesson deleted successfully");
      setDeleteLesson(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingLesson(null);
    setGeneratedAudioUrl(null);
    setForm({
      title: "",
      unit_id: "",
      order_index: 0,
      arabic_text: "",
      transliteration: "",
      image_url: "",
      audio_url: "",
    });
  };

  const generateAudio = async () => {
    if (!form.arabic_text.trim()) {
      toast.error("Please enter Arabic text first");
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: form.arabic_text }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate audio");
      }

      const audioBlob = await response.blob();
      
      // Upload to Supabase storage
      const fileName = `lessons/${editingLesson?.id || Date.now()}_${Date.now()}.mp3`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("content")
        .upload(fileName, audioBlob, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("content")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      setForm({ ...form, audio_url: publicUrl });
      setGeneratedAudioUrl(publicUrl);
      toast.success("Audio generated successfully!");
    } catch (error) {
      console.error("Audio generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate audio");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const openEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setForm({
      title: lesson.title,
      unit_id: lesson.unit_id,
      order_index: lesson.order_index,
      arabic_text: lesson.arabic_text || "",
      transliteration: lesson.transliteration || "",
      image_url: lesson.image_url || "",
      audio_url: lesson.audio_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLesson) {
      updateMutation.mutate({ id: editingLesson.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filteredLessons = lessons?.filter((l) => {
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase());
    const matchesUnit = filterUnit === "all" || l.unit_id === filterUnit;
    return matchesSearch && matchesUnit;
  });

  // Group units for the select
  const unitsGrouped = units?.map((u) => {
    const level = levels?.find((l) => l.id === u.level_id);
    const dialect = dialects?.find((d) => d.id === level?.dialect_id);
    return {
      ...u,
      levelName: level?.name,
      dialectName: dialect?.name,
    };
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lessons</CardTitle>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Lesson
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lessons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterUnit} onValueChange={setFilterUnit}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {unitsGrouped?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.dialectName} - {u.levelName} - {u.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="w-20">Media</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLessons?.length ? (
                  filteredLessons.map((lesson) => (
                    <TableRow key={lesson.id}>
                      <TableCell>{lesson.order_index}</TableCell>
                      <TableCell className="font-medium">{lesson.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lesson.units?.levels?.dialects?.name} → {lesson.units?.levels?.name} → {lesson.units?.title}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {lesson.image_url && (
                            <Image className="h-4 w-4 text-muted-foreground" />
                          )}
                          {lesson.audio_url && (
                            <Volume2 className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewLesson(lesson)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(lesson)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteLesson(lesson.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No lessons found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Create Lesson"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Hello & Goodbye"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={form.unit_id}
                  onValueChange={(value) => setForm({ ...form, unit_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitsGrouped?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.dialectName} - {u.levelName} - {u.title}
                      </SelectItem>
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
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="arabic_text">Arabic Text</Label>
                <Textarea
                  id="arabic_text"
                  value={form.arabic_text}
                  onChange={(e) => setForm({ ...form, arabic_text: e.target.value })}
                  className="text-right text-xl font-arabic"
                  dir="rtl"
                  rows={3}
                  placeholder="النص العربي..."
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="transliteration">Transliteration</Label>
                <Textarea
                  id="transliteration"
                  value={form.transliteration}
                  onChange={(e) => setForm({ ...form, transliteration: e.target.value })}
                  rows={2}
                  placeholder="al-naṣṣ al-ʿarabī..."
                />
              </div>
              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="audio_url">Audio URL</Label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={generateAudio}
                    disabled={isGeneratingAudio || !form.arabic_text.trim()}
                    className="gap-2"
                  >
                    {isGeneratingAudio ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" />
                        Generate with ElevenLabs
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  id="audio_url"
                  value={form.audio_url}
                  onChange={(e) => setForm({ ...form, audio_url: e.target.value })}
                  placeholder="https://..."
                />
                {(generatedAudioUrl || form.audio_url) && (
                  <div className="flex items-center gap-2 mt-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <audio controls className="flex-1 h-10">
                      <source src={generatedAudioUrl || form.audio_url} type="audio/mpeg" />
                    </audio>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || !form.unit_id}
              >
                {editingLesson ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewLesson} onOpenChange={() => setPreviewLesson(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lesson Preview</DialogTitle>
          </DialogHeader>
          {previewLesson && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{previewLesson.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {previewLesson.units?.levels?.dialects?.name} → {previewLesson.units?.levels?.name} → {previewLesson.units?.title}
                </p>
              </div>
              
              {previewLesson.image_url && (
                <div className="rounded-lg overflow-hidden border">
                  <img
                    src={previewLesson.image_url}
                    alt={previewLesson.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {previewLesson.arabic_text && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl text-right font-arabic" dir="rtl">
                    {previewLesson.arabic_text}
                  </p>
                  {previewLesson.transliteration && (
                    <p className="text-muted-foreground mt-2 italic">
                      {previewLesson.transliteration}
                    </p>
                  )}
                </div>
              )}

              {previewLesson.audio_url && (
                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-muted-foreground" />
                  <audio controls className="flex-1">
                    <source src={previewLesson.audio_url} />
                  </audio>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLesson} onOpenChange={() => setDeleteLesson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lesson? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLesson && deleteMutation.mutate(deleteLesson)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
