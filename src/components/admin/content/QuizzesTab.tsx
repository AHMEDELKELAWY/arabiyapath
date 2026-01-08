import { useState } from "react";
import { useQuizzes, useUnits, useLevels, useDialects } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AudioUploader } from "../AudioUploader";

interface QuestionForm {
  prompt: string;
  type: string;
  correct_answer: string;
  options_json: string[];
  order_index: number;
  audio_url: string;
}

export function QuizzesTab() {
  const { data: quizzes, isLoading } = useQuizzes();
  const { data: units } = useUnits();
  const { data: levels } = useLevels();
  const { data: dialects } = useDialects();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [deleteQuestion, setDeleteQuestion] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);

  const [questionForm, setQuestionForm] = useState<QuestionForm>({
    prompt: "",
    type: "multiple_choice",
    correct_answer: "",
    options_json: ["", "", "", ""],
    order_index: 0,
    audio_url: "",
  });

  // Fetch questions for expanded quiz
  const { data: questions } = useQuery({
    queryKey: ["quiz-questions", expandedQuiz],
    queryFn: async () => {
      if (!expandedQuiz) return [];
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", expandedQuiz)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!expandedQuiz,
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: QuestionForm & { quiz_id: string }) => {
      const { error } = await supabase.from("quiz_questions").insert({
        ...data,
        options_json: data.options_json.filter(o => o.trim()),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions", expandedQuiz] });
      toast.success("Question created successfully");
      closeQuestionDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: QuestionForm }) => {
      const { error } = await supabase
        .from("quiz_questions")
        .update({
          ...data,
          options_json: data.options_json.filter(o => o.trim()),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions", expandedQuiz] });
      toast.success("Question updated successfully");
      closeQuestionDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions", expandedQuiz] });
      toast.success("Question deleted successfully");
      setDeleteQuestion(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const createQuizMutation = useMutation({
    mutationFn: async (unitId: string) => {
      const { error } = await supabase.from("quizzes").insert({ unit_id: unitId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast.success("Quiz created successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const closeQuestionDialog = () => {
    setIsQuestionDialogOpen(false);
    setEditingQuestion(null);
    setCurrentQuizId(null);
    setQuestionForm({
      prompt: "",
      type: "multiple_choice",
      correct_answer: "",
      options_json: ["", "", "", ""],
      order_index: 0,
      audio_url: "",
    });
  };

  const openAddQuestion = (quizId: string) => {
    setCurrentQuizId(quizId);
    setQuestionForm({
      prompt: "",
      type: "multiple_choice",
      correct_answer: "",
      options_json: ["", "", "", ""],
      order_index: (questions?.length || 0) + 1,
      audio_url: "",
    });
    setIsQuestionDialogOpen(true);
  };

  const openEditQuestion = (question: any) => {
    setEditingQuestion(question);
    setCurrentQuizId(question.quiz_id);
    const options = Array.isArray(question.options_json) 
      ? question.options_json 
      : [];
    setQuestionForm({
      prompt: question.prompt,
      type: question.type,
      correct_answer: question.correct_answer,
      options_json: [...options, "", "", "", ""].slice(0, 4),
      order_index: question.order_index,
      audio_url: question.audio_url || "",
    });
    setIsQuestionDialogOpen(true);
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuestion) {
      updateQuestionMutation.mutate({ id: editingQuestion.id, data: questionForm });
    } else if (currentQuizId) {
      createQuestionMutation.mutate({ ...questionForm, quiz_id: currentQuizId });
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...questionForm.options_json];
    newOptions[index] = value;
    setQuestionForm({ ...questionForm, options_json: newOptions });
  };

  // Get units that don't have quizzes
  const unitsWithoutQuiz = units?.filter(
    (u) => !quizzes?.some((q) => q.unit_id === u.id)
  );

  // Group units for select
  const unitsGrouped = units?.map((u) => {
    const level = levels?.find((l) => l.id === u.level_id);
    const dialect = dialects?.find((d) => d.id === level?.dialect_id);
    return {
      ...u,
      levelName: level?.name,
      dialectName: dialect?.name,
    };
  });

  const filteredQuizzes = quizzes?.filter((q) => {
    const unit = unitsGrouped?.find((u) => u.id === q.unit_id);
    const matchesSearch = unit?.title.toLowerCase().includes(search.toLowerCase()) ||
      unit?.dialectName?.toLowerCase().includes(search.toLowerCase());
    const matchesUnit = filterUnit === "all" || q.unit_id === filterUnit;
    return matchesSearch && matchesUnit;
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Quizzes & Questions</CardTitle>
          {unitsWithoutQuiz && unitsWithoutQuiz.length > 0 && (
            <Select onValueChange={(unitId) => createQuizMutation.mutate(unitId)}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Create quiz for unit..." />
              </SelectTrigger>
              <SelectContent>
                {unitsWithoutQuiz.map((u) => {
                  const level = levels?.find((l) => l.id === u.level_id);
                  const dialect = dialects?.find((d) => d.id === level?.dialect_id);
                  return (
                    <SelectItem key={u.id} value={u.id}>
                      {dialect?.name} - {level?.name} - {u.title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quizzes..."
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
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQuizzes?.length ? (
                filteredQuizzes.map((quiz) => {
                  const unit = unitsGrouped?.find((u) => u.id === quiz.unit_id);
                  const isExpanded = expandedQuiz === quiz.id;
                  
                  return (
                    <div key={quiz.id} className="border rounded-lg">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedQuiz(isExpanded ? null : quiz.id)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                          <div>
                            <p className="font-medium">{unit?.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {unit?.dialectName} → {unit?.levelName}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {quiz.questions_count || 0} questions
                        </Badge>
                      </div>

                      {isExpanded && (
                        <div className="border-t p-4 bg-muted/30">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-medium">Questions</h4>
                            <Button
                              size="sm"
                              onClick={() => openAddQuestion(quiz.id)}
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add Question
                            </Button>
                          </div>

                          {questions?.length ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16">#</TableHead>
                                  <TableHead>Prompt</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Answer</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {questions.map((q) => (
                                  <TableRow key={q.id}>
                                    <TableCell>{q.order_index}</TableCell>
                                    <TableCell className="max-w-xs truncate">
                                      {q.prompt}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{q.type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {q.correct_answer}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditQuestion(q)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setDeleteQuestion(q.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-center text-muted-foreground py-4">
                              No questions yet. Add your first question!
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No quizzes found. Create a quiz for a unit to get started.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Question" : "Add Question"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuestionSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={questionForm.type}
                    onValueChange={(value) =>
                      setQuestionForm({ ...questionForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="listening">Listening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Order</Label>
                  <Input
                    type="number"
                    value={questionForm.order_index}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        order_index: parseInt(e.target.value) || 0,
                      })
                    }
                    min={0}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Question Prompt</Label>
                <Textarea
                  value={questionForm.prompt}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, prompt: e.target.value })
                  }
                  placeholder="What does 'مرحبا' mean?"
                  rows={2}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Answer Options</Label>
                <div className="grid grid-cols-2 gap-2">
                  {questionForm.options_json.map((option, i) => (
                    <Input
                      key={i}
                      value={option}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Select
                  value={questionForm.correct_answer}
                  onValueChange={(value) =>
                    setQuestionForm({ ...questionForm, correct_answer: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {questionForm.options_json
                      .filter((o) => o.trim())
                      .map((option, i) => (
                        <SelectItem key={i} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {questionForm.type === "listening" && (
                <div className="space-y-2">
                  <Label>Audio (for listening questions)</Label>
                  <AudioUploader
                    value={questionForm.audio_url}
                    onChange={(url) =>
                      setQuestionForm({ ...questionForm, audio_url: url })
                    }
                    arabicText={questionForm.prompt}
                    folder="quiz-audio"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeQuestionDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createQuestionMutation.isPending ||
                  updateQuestionMutation.isPending ||
                  !questionForm.correct_answer
                }
              >
                {editingQuestion ? "Save Changes" : "Add Question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteQuestion} onOpenChange={() => setDeleteQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteQuestion && deleteQuestionMutation.mutate(deleteQuestion)}
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
