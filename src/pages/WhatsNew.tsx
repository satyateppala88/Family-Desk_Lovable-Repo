import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft } from "lucide-react";
import { WhatsNewSection } from "@/components/settings/WhatsNewSection";

export default function WhatsNew() {
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
              <div className="fd-eyebrow mb-0.5">UPDATES</div>
              <h1 className="fd-display text-[24px] text-fd-ink flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                What's new
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Recent updates and improvements across the platform.
              </p>
            </div>
          </div>

          <WhatsNewSection />
        </div>
      </main>
    </>
  );
}
