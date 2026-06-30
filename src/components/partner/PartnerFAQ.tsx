import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PartnerFAQItem } from "@/lib/partnerConfig";

interface Props {
  items: PartnerFAQItem[];
}

export function PartnerFAQ({ items }: Props) {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Questions, answered
          </h2>
        </div>
        <Accordion type="single" collapsible className="w-full space-y-3">
          {items.map((item, i) => (
            <AccordionItem
              key={i}
              value={`q${i}`}
              className="bg-card border border-border rounded-2xl px-5 data-[state=open]:border-primary/40 data-[state=open]:shadow-sm"
            >
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
