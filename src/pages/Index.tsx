import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, UtensilsCrossed, ShoppingCart, Calendar as CalendarIcon } from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasHousehold, setHasHousehold] = useState(false);

  useEffect(() => {
    checkHousehold();
  }, [user]);

  const checkHousehold = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from("household_members")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        navigate("/household-setup");
        return;
      }

      setHasHousehold(true);
    } catch (error) {
      console.error("Error checking household:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-6 pb-20">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  const quickActions = [
    {
      title: "Tasks",
      description: "Manage your to-dos",
      icon: CheckSquare,
      path: "/tasks",
      color: "text-blue-500",
    },
    {
      title: "Meals",
      description: "Plan your menu",
      icon: UtensilsCrossed,
      path: "/meals",
      color: "text-green-500",
    },
    {
      title: "Grocery",
      description: "Shopping lists",
      icon: ShoppingCart,
      path: "/grocery",
      color: "text-orange-500",
    },
    {
      title: "Calendar",
      description: "Important dates",
      icon: CalendarIcon,
      path: "/calendar",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-6 pb-20">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Welcome Home</h2>
          <p className="text-muted-foreground">
            Manage your household with ease
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.path}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(action.path)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {action.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Your household management platform is ready to use
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              HomeMate helps you manage daily household activities:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                <span>Track and assign tasks to household members</span>
              </li>
              <li className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-primary" />
                <span>Plan meals with AI-powered recipe suggestions</span>
              </li>
              <li className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <span>Generate and share grocery lists</span>
              </li>
              <li className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span>Never miss important dates and bills</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
};

export default Index;
