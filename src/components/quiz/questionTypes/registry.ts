// Client-side registry for quiz question renderers.
// Adding a new type = register a renderer here; QuizPage stays untouched.
import type { ComponentType } from "react";
import type { StartQuizQuestion } from "@/hooks/useLearning";

export interface QuestionRendererProps {
  question: StartQuizQuestion;
  answer: string | undefined;
  onAnswer: (value: string) => void;
}

export type QuestionRenderer = ComponentType<QuestionRendererProps>;

const registry = new Map<string, QuestionRenderer>();

export function registerQuestionType(type: string, renderer: QuestionRenderer) {
  registry.set(type, renderer);
}

export function getRenderer(type: string): QuestionRenderer | undefined {
  return registry.get(type);
}
