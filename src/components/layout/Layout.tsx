import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatbaseInit, openChatbase } from "@/hooks/useChatbase";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Initialize Chatbase widget globally
  useChatbaseInit();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
      
      {/* Floating AI Advisor Button - Opens Chatbase Widget */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 z-50 shadow-lg hover:shadow-xl gap-2 rounded-full px-5"
        onClick={openChatbase}
      >
        <MessageCircle className="w-5 h-5" />
        Ask the AI Advisor
      </Button>
    </div>
  );
}
