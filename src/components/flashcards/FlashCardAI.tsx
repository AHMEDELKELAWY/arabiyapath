import { useState, useRef, useEffect } from "react";
import { Send, Bot, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { FlashCard } from "@/data/flashCardsData";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface FlashCardAIProps {
  currentCard: FlashCard | null;
  onNeedEmail?: () => void;
  hasEmail: boolean;
  questionCount: number;
  onQuestionAsked: () => void;
}

const SUGGESTED_QUESTIONS = [
  "When should I use this phrase?",
  "Is this appropriate for executives?",
  "What are the consequences of misusing this?",
  "Give me a politer alternative",
];

export function FlashCardAI({
  currentCard,
  onNeedEmail,
  hasEmail,
  questionCount,
  onQuestionAsked,
}: FlashCardAIProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const FREE_QUESTIONS = 3;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const askAI = async (question: string) => {
    if (!question.trim()) return;
    
    // Check if user needs to provide email
    if (!hasEmail && questionCount >= FREE_QUESTIONS) {
      onNeedEmail?.();
      return;
    }

    const userMessage: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    onQuestionAsked();

    try {
      const systemPrompt = `You are an expert Gulf Arabic cultural advisor and communication coach for executives and professionals. You help users understand the nuances of Gulf Arabic business and social language.

Current phrase being studied:
- Arabic: ${currentCard?.arabicPhrase || "N/A"}
- Meaning: ${currentCard?.englishMeaning || "N/A"}
- Context: ${currentCard?.usageContext || "N/A"}
- Cultural insight: ${currentCard?.culturalInsight || "N/A"}

Respond in a professional, helpful manner. Keep responses concise but insightful. Focus on:
1. Cultural appropriateness
2. Status implications
3. When to use vs. avoid
4. Politer or stronger alternatives when asked
5. Consequences of misuse

Always maintain respect for Gulf culture and customs.`;

      const { data, error } = await supabase.functions.invoke("lovable-ai", {
        body: {
          model: "openai/gpt-5-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: question },
          ],
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.choices?.[0]?.message?.content || "I apologize, I couldn't generate a response. Please try again.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, there was an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    askAI(question);
  };

  return (
    <div className="w-full rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">AI Cultural Advisor</h3>
            <p className="text-xs text-muted-foreground">
              Ask about usage, appropriateness, or alternatives
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Expandable content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isExpanded ? "max-h-[500px]" : "max-h-0"
        )}
      >
        <div className="p-4 pt-0 space-y-4">
          {/* Free questions indicator */}
          {!hasEmail && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/50 text-xs">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">
                {FREE_QUESTIONS - questionCount} free questions remaining
              </span>
            </div>
          )}

          {/* Messages area */}
          {messages.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-3 p-3 rounded-lg bg-muted/30">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "text-sm animate-fade-in",
                    msg.role === "user"
                      ? "text-foreground font-medium"
                      : "text-muted-foreground pl-4 border-l-2 border-primary/30"
                  )}
                >
                  {msg.role === "assistant" && (
                    <span className="text-xs text-primary font-medium block mb-1">
                      AI Advisor:
                    </span>
                  )}
                  {msg.content}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-100" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-200" />
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Suggested questions */}
          {currentCard && messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestedQuestion(q)}
                    className="px-3 py-1.5 text-xs rounded-full border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this phrase..."
              className="min-h-[60px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  askAI(input);
                }
              }}
            />
            <Button
              onClick={() => askAI(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
