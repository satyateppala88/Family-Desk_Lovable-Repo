import { APP_VERSION } from "@/lib/versioning";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto py-6">
      <div className="container mx-auto px-4">
        <p className="text-center text-xs text-muted-foreground">
          © {currentYear} FamilyDesk · App v{APP_VERSION}
        </p>
      </div>
    </footer>
  );
};
