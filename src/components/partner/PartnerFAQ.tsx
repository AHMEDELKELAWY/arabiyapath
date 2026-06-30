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
    <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
      <div className="container mx-auto max-w-4xl" data-reveal>
        <div className="text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Questions, answered.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            Clear answers for the few things students usually want to know before unlocking access.
          </p>
        </div>
        <Accordion type="single" collapsible className="mt-8 space-y-4">
          {items.map((item, index) => (
            <AccordionItem
              key={item.q}
              value={`faq-${index}`}
              className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/92 px-6 shadow-[0_16px_40px_hsl(var(--foreground)/0.05)]"
            >
              <AccordionTrigger className="py-6 text-left text-lg font-semibold text-foreground hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pb-6 text-base leading-8 text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
