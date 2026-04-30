import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowLeft, ListTree, ChevronRight, ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { HowToUseSection } from "@/components/settings/HowToUseSection";
import { HOW_TO_USE_SECTIONS } from "@/lib/howToUse";

export default function HowToUse() {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<string>("");
  const [tocOpen, setTocOpen] = useState(false);

  const jumpTo = (id: string) => {
    setOpenSection(id);
    setTocOpen(false);
    // Wait for accordion to expand, then scroll into view.
    requestAnimationFrame(() => {
      const el = document.getElementById(`how-to-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const activeSection = HOW_TO_USE_SECTIONS.find((s) => s.id === openSection);
  const ActiveIcon = activeSection?.icon ?? ListTree;

  return (
    <>
      <Header />

      {/* Mobile-only sticky jump-to bar */}
      <div className="md:hidden sticky top-14 z-30 bg-background/90 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <Sheet open={tocOpen} onOpenChange={setTocOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                aria-label="Jump to topic"
              >
                <ActiveIcon className="h-4 w-4 text-primary shrink-0" />
                <span className="flex-1 truncate">
                  {activeSection ? activeSection.title : "Jump to topic"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-base">
                  <ListTree className="h-4 w-4 text-primary" />
                  On this page
                </SheetTitle>
              </SheetHeader>
              <ul className="mt-3 space-y-1">
                {HOW_TO_USE_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = section.id === openSection;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => jumpTo(section.id)}
                        className={`w-full flex items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition-colors ${
                          isActive ? "bg-muted" : "hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <span className="flex-1 truncate">{section.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </SheetContent>
          </Sheet>
        </div>
      </div>

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

          {/* Compact TOC — tablet only (md to lg). Horizontal scrolling pills. */}
          <div className="hidden md:block lg:hidden">
            <div className="flex items-center gap-2 mb-2 px-1">
              <ListTree className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">On this page</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]">
              {HOW_TO_USE_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = section.id === openSection;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => jumpTo(section.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-muted"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "" : "text-primary"}`} />
                    <span className="whitespace-nowrap">{section.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full TOC card — desktop only (lg+) */}
          <Card className="hidden lg:block">
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
