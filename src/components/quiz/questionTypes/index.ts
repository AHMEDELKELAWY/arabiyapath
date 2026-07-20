// Side-effect module: registers all built-in quiz question renderers.
// Import this once from the quiz page to activate the registry.
import "./MultipleChoice";

export { getRenderer, registerQuestionType } from "./registry";
export type { QuestionRenderer, QuestionRendererProps } from "./registry";
