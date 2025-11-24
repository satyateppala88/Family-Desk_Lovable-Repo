import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo-family-desk-primary.png";
import { Menu, X } from "lucide-react";

export const LandingNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-lg border-b border-landing-accent/10 shadow-sm" : "bg-white/50 backdrop-blur-sm"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logoImg} alt="Family Desk Logo" className="h-12 w-12 object-contain" />
            <span className="text-2xl font-bold text-landing-text">Family Desk</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("features")}
              className="text-landing-text-muted hover:text-landing-accent transition-colors uppercase text-sm tracking-wider"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-landing-text-muted hover:text-landing-accent transition-colors uppercase text-sm tracking-wider"
            >
              How It Works
            </button>
            <Link to="/auth">
              <Button variant="ghost" className="text-landing-text hover:text-landing-accent">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-landing-accent text-white hover:bg-landing-accent/90 shadow-md hover:shadow-lg hover:shadow-landing-accent/30 transition-all">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-landing-text p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-landing-accent/10 animate-fade-in">
            <div className="flex flex-col gap-4">
              <button
                onClick={() => scrollToSection("features")}
                className="text-landing-text-muted hover:text-landing-accent transition-colors uppercase text-sm tracking-wider text-left"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-landing-text-muted hover:text-landing-accent transition-colors uppercase text-sm tracking-wider text-left"
              >
                How It Works
              </button>
              <Link to="/auth" className="w-full">
                <Button variant="ghost" className="w-full text-landing-text hover:text-landing-accent">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth" className="w-full">
                <Button className="w-full bg-landing-accent text-white hover:bg-landing-accent/90 shadow-md">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
