import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { type ChangelogEntry, formatVersionDate } from "@/lib/versioning";

interface VersionHistoryProps {
  title?: string;
  entries: ChangelogEntry[];
}

export const VersionHistory = ({ title = "Version history", entries }: VersionHistoryProps) => {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <Accordion type="single" collapsible defaultValue={entries[0]?.version} className="w-full">
        {entries.map((entry) => (
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
    </section>
  );
};
