import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MinimalFooter } from "./MinimalFooter";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatbaseInit, openChatbase } from "@/hooks/useChatbase";

const HIDDEN_CHATBASE_PREFIXES = [
  "/dashboard",
  "/flashcards",
  "/courses",
  "/lesson",
  "/learn",
];

function shouldHideChatbase(pathname: string): boolean {
  return HIDDEN_CHATBASE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
}

interface LayoutProps {
  children: ReactNode;
  minimalFooter?: boolean;
}

export function Layout({ children, minimalFooter }: LayoutProps) {
  // Initialize Chatbase widget (lazy loaded after 4s or on click)
  useChatbaseInit();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      {minimalFooter ? <MinimalFooter /> : <Footer />}
      
      {/* Floating AI Advisor Button - Opens Chatbase Widget */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 z-50 shadow-lg hover:shadow-xl gap-2 rounded-full px-5"
        onClick={openChatbase}
        aria-label="Open AI Advisor chat"
      >
        <MessageCircle className="w-5 h-5" aria-hidden="true" />
        Ask the AI Advisor
      </Button>
    </div>
  );
}