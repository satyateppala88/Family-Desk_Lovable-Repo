import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import RequestAccess from "./pages/RequestAccess";
import AdminAccessRequests from "./pages/AdminAccessRequests";
import HouseholdSetup from "./pages/HouseholdSetup";
import { UserPreferencesOnboarding } from "./components/onboarding/UserPreferencesOnboarding";
import { Settings } from "./pages/Settings";
import AccountSettings from "./pages/AccountSettings";
import TaskmasterToday from "./pages/TaskmasterToday";
import TaskmasterTasks from "./pages/TaskmasterTasks";
import TaskmasterProjects from "./pages/TaskmasterProjects";
import TaskmasterProjectDetail from "./pages/TaskmasterProjectDetail";
import TaskmasterMyTasks from "./pages/TaskmasterMyTasks";
import TaskmasterDashboard from "./pages/TaskmasterDashboard";
import Meals from "./pages/Meals";
import Grocery from "./pages/Grocery";
import Calendar from "./pages/Calendar";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import HouseholdInvitations from "./pages/HouseholdInvitations";
import HouseholdMembers from "./pages/HouseholdMembers";
import HouseholdProductSettings from "./pages/HouseholdProductSettings";
import { AIChatWidget } from "./components/ai/AIChatWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
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
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIChatWidget />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
