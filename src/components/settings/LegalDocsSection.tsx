import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, FileText, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  PRIVACY_VERSION,
  PRIVACY_EFFECTIVE_DATE,
  TERMS_VERSION,
  TERMS_EFFECTIVE_DATE,
  formatVersionDate,
} from "@/lib/versioning";

export const TermsSection = () => {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Terms &amp; Conditions
            </CardTitle>
            <CardDescription>
              The agreement that governs your use of Family Desk.
            </CardDescription>
          </div>
          <Badge variant="secondary">v{TERMS_VERSION}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Last updated {formatVersionDate(TERMS_EFFECTIVE_DATE)}. Covers eligibility,
          AI features, finance disclosures, Google Calendar integration and Indian
          governing law.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/terms")}>
          Read full Terms
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};

export const PrivacySection = () => {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Privacy Policy
            </CardTitle>
            <CardDescription>
              How we collect, use and protect your household data.
            </CardDescription>
          </div>
          <Badge variant="secondary">v{PRIVACY_VERSION}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Effective {formatVersionDate(PRIVACY_EFFECTIVE_DATE)}. DPDP Act compliant,
          with detail on AI usage, WhatsApp OTP, calendar OAuth, retention and your
          data rights.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/privacy")}>
          Read full Privacy Policy
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};
