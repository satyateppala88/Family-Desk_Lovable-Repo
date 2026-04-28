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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="-ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="page-heading">What's new</h1>
          </div>

          <WhatsNewSection />
        </div>
      </main>
    </>
  );
}
