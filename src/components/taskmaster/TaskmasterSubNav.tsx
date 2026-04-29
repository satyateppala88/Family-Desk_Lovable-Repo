import { Sun, ListChecks, User, Folder, BarChart3 } from "lucide-react";
import { SubNav, type SubNavItem } from "@/components/ui/sub-nav";

const navItems: SubNavItem[] = [
  { path: "/taskmaster/today", label: "Today", icon: Sun },
  { path: "/taskmaster/tasks", label: "All Tasks", icon: ListChecks },
  { path: "/taskmaster/my-tasks", label: "My Tasks", icon: User },
  { path: "/taskmaster/projects", label: "Projects", icon: Folder },
  { path: "/taskmaster/dashboard", label: "Dashboard", icon: BarChart3 },
];

export const TaskmasterSubNav = () => {
  return <SubNav items={navItems} />;
};