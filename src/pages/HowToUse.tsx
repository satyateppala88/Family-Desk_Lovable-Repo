import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowLeft, ListTree, ChevronRight } from "lucide-react";
import { HowToUseSection } from "@/components/settings/HowToUseSection";
import { HOW_TO_USE_SECTIONS } from "@/lib/howToUse";

export default function HowToUse() {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<string>("");

  const jumpTo = (id: string) => {
    setOpenSection(id);
    // Wait for accordion to expand, then scroll into view.
    requestAnimationFrame(() => {
      const el = document.getElementById(`how-to-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <>
      <Header />
      <main className="page-content">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              aria-label="Back to settings"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="page-heading flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                How to use
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Short walkthroughs for every Family Desk module.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListTree className="h-4 w-4 text-primary" />
                On this page
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {HOW_TO_USE_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => jumpTo(section.id)}
                        className="group w-full flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted transition-colors"
                      >
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <span className="flex-1 truncate">{section.title}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <HowToUseSection value={openSection} onValueChange={setOpenSection} />
        </div>
      </main>
    </>
  );
}
