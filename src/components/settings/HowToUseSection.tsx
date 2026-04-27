import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HOW_TO_USE_SECTIONS } from "@/lib/howToUse";

export const HowToUseSection = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          How to use Family Desk
        </CardTitle>
        <CardDescription>
          Step-by-step guides for every module. Tap a link to jump straight in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {HOW_TO_USE_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs text-muted-foreground font-normal">
                        {section.description}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="space-y-3 pl-7 list-decimal text-sm text-muted-foreground">
                    {section.steps.map((step, i) => (
                      <li key={i} className="space-y-2">
                        <p>{step.text}</p>
                        {step.to && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(step.to!)}
                          >
                            {step.cta ?? "Open"}
                            <ArrowRight className="ml-2 h-3 w-3" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};
