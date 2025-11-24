import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © {currentYear} Family Desk. All rights reserved.
          </div>
          
          <nav className="flex flex-wrap justify-center gap-4 text-sm">
            <Link 
              to="/terms" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <Link 
              to="/privacy" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <a 
              href="mailto:contactus@familydesk.in" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact Support
            </a>
          </nav>

          <div className="text-xs text-muted-foreground">
            Made for Indian households 🇮🇳
          </div>
        </div>
      </div>
    </footer>
  );
};
