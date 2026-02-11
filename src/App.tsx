import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DevModeProvider } from "@/contexts/DevModeContext";
import { DevModeBanner } from "@/components/development/DevModeBanner";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AIChatWidget } from "./components/ai/AIChatWidget";

// Eagerly loaded (landing/auth flow)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loaded pages
const Index = lazy(() => import("./pages/Index"));
const RequestAccess = lazy(() => import("./pages/RequestAccess"));
const AdminAccessRequests = lazy(() => import("./pages/AdminAccessRequests"));
const HouseholdSetup = lazy(() => import("./pages/HouseholdSetup"));
const UserPreferencesOnboarding = lazy(() => import("./components/onboarding/UserPreferencesOnboarding").then(m => ({ default: m.UserPreferencesOnboarding })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const TaskmasterToday = lazy(() => import("./pages/TaskmasterToday"));
const TaskmasterTasks = lazy(() => import("./pages/TaskmasterTasks"));
const TaskmasterProjects = lazy(() => import("./pages/TaskmasterProjects"));
const TaskmasterProjectDetail = lazy(() => import("./pages/TaskmasterProjectDetail"));
const TaskmasterMyTasks = lazy(() => import("./pages/TaskmasterMyTasks"));
const TaskmasterDashboard = lazy(() => import("./pages/TaskmasterDashboard"));
const Meals = lazy(() => import("./pages/Meals"));
const Grocery = lazy(() => import("./pages/Grocery"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Habits = lazy(() => import("./pages/Habits"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const HouseholdInvitations = lazy(() => import("./pages/HouseholdInvitations"));
const HouseholdMembers = lazy(() => import("./pages/HouseholdMembers"));
const HouseholdProductSettings = lazy(() => import("./pages/HouseholdProductSettings"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DevModeProvider>
          <AuthProvider>
            <DevModeBanner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/request-access" element={<RequestAccess />} />
                <Route
                  path="/admin/access-requests"
                  element={
                    <ProtectedRoute>
                      <AdminAccessRequests />
                    </ProtectedRoute>
                  }
                />
                <Route path="/household-setup" element={
                  <ProtectedRoute>
                    <HouseholdSetup />
                  </ProtectedRoute>
                } />
                <Route path="/onboarding/preferences" element={
                  <ProtectedRoute>
                    <UserPreferencesOnboarding />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/invitations" element={
                  <ProtectedRoute>
                    <HouseholdInvitations />
                  </ProtectedRoute>
                } />
                <Route path="/members" element={
                  <ProtectedRoute>
                    <HouseholdMembers />
                  </ProtectedRoute>
                } />
                <Route path="/household/products" element={
                  <ProtectedRoute>
                    <HouseholdProductSettings />
                  </ProtectedRoute>
                } />
                <Route path="/account-settings" element={
                  <ProtectedRoute>
                    <AccountSettings />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/tasks" element={
                  <ProtectedRoute>
                    <TaskmasterToday />
                  </ProtectedRoute>
                } />
                <Route path="/taskmaster/today" element={
                  <ProtectedRoute>
                    <TaskmasterToday />
                  </ProtectedRoute>
                } />
                <Route path="/taskmaster/tasks" element={
                  <ProtectedRoute>
                    <TaskmasterTasks />
                  </ProtectedRoute>
                } />
                <Route path="/taskmaster/projects" element={
                  <ProtectedRoute>
                    <TaskmasterProjects />
                  </ProtectedRoute>
                } />
                <Route path="/taskmaster/projects/:id" element={
                  <ProtectedRoute>
                    <TaskmasterProjectDetail />
                  </ProtectedRoute>
                } />
                <Route path="/taskmaster/my-tasks" element={
                  <ProtectedRoute>
                    <TaskmasterMyTasks />
                  </ProtectedRoute>
                } />
                <Route path="/taskmaster/dashboard" element={
                  <ProtectedRoute>
                    <TaskmasterDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/meals" element={
                  <ProtectedRoute>
                    <Meals />
                  </ProtectedRoute>
                } />
                <Route path="/grocery" element={
                  <ProtectedRoute>
                    <Grocery />
                  </ProtectedRoute>
                } />
                <Route path="/calendar" element={
                  <ProtectedRoute>
                    <Calendar />
                  </ProtectedRoute>
                } />
                <Route path="/habits" element={
                  <ProtectedRoute>
                    <Habits />
                  </ProtectedRoute>
                } />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <AIChatWidget />
          </AuthProvider>
        </DevModeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
