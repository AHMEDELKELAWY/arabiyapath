import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
      
      {/* Floating AI Advisor Button */}
      <a
        href="https://chatgpt.com/g/g-6977f174a4248191a8ea6210842fdf09-arabiyapath-course-advisor"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50"
      >
        <Button size="lg" className="shadow-lg hover:shadow-xl gap-2 rounded-full px-5">
          <MessageCircle className="w-5 h-5" />
          Ask the AI Advisor
        </Button>
      </a>
    </div>
  );
}
