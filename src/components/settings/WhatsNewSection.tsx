import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  APP_CHANGELOG,
  APP_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
  formatVersionDate,
} from "@/lib/versioning";

export const WhatsNewSection = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              What's new
            </CardTitle>
            <CardDescription>
              Release notes for Family Desk. Newer entries appear on top.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm">
            App v{APP_VERSION}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="single" collapsible defaultValue={APP_CHANGELOG[0]?.version} className="w-full">
          {APP_CHANGELOG.map((entry) => (
            <AccordionItem key={entry.version} value={entry.version}>
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant={entry.type === "major" ? "default" : "secondary"}>
                    v{entry.version}
                  </Badge>
                  <span className="font-medium">{entry.title}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {formatVersionDate(entry.date)}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                  {entry.changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="pt-2 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/privacy")}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Privacy Policy v{PRIVACY_VERSION}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/terms")}>
            <FileText className="h-4 w-4 mr-2" />
            Terms v{TERMS_VERSION}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
