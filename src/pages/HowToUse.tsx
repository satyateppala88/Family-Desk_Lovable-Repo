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
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="page-heading">How to use</h1>
          </div>

          <HowToUseSection />
        </div>
      </main>
    </>
  );
}
