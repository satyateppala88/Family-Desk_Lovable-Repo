import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface SubNavItem {
  path: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
}

interface SubNavProps {
  items: SubNavItem[];
  className?: string;
}

export const SubNav = ({ items, className }: SubNavProps) => {
  const location = useLocation();

  return (
    <nav className={cn("flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide snap-x snap-mandatory", className)} role="tablist">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all snap-start min-w-0 shrink-0",
              isActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {item.label}
            {item.badge !== undefined && item.badge !== 0 && (
              <span className={cn(
                "ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full leading-none",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary/10 text-primary"
              )}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};
