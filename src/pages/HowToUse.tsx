import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowLeft } from "lucide-react";
import { HowToUseSection } from "@/components/settings/HowToUseSection";

export default function HowToUse() {
  const navigate = useNavigate();

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

          <HowToUseSection />
        </div>
      </main>
    </>
  );
}
