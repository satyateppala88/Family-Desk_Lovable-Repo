import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, ShieldCheck, ArrowRight, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  APP_CHANGELOG,
  APP_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
  formatVersionDate,
  type ChangelogLink,
} from "@/lib/versioning";

export const WhatsNewSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleLinkClick = async (link: ChangelogLink) => {
    // If this link replays a feature tour, clear its completion flag first.
    if (link.tour && user?.id) {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("completed_tours")
          .eq("id", user.id)
          .single();
        const tours = (data?.completed_tours as Record<string, boolean>) || {};
        await supabase
          .from("profiles")
          .update({ completed_tours: { ...tours, [link.tour]: false } })
          .eq("id", user.id);
        queryClient.invalidateQueries({ queryKey: ["completed-tours", user.id] });
      } catch (err) {
        console.error("Failed to reset tour", err);
      }
    }
    navigate(link.to);
  };

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
                {entry.links && entry.links.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Try it now
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {entry.links.map((link, i) => (
                        <Button
                          key={i}
                          size="sm"
                          variant="outline"
                          onClick={() => handleLinkClick(link)}
                        >
                          {link.tour ? (
                            <PlayCircle className="h-3 w-3 mr-2" />
                          ) : (
                            <ArrowRight className="h-3 w-3 mr-2" />
                          )}
                          {link.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
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
