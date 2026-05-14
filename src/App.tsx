import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { AIChatWidget } from "./components/ai/AIChatWidget";
import ScrollToTop from "./components/ScrollToTop";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { SyncingIndicator } from "@/components/layout/SyncingIndicator";
import { createPersistedQueryClient } from "@/lib/query-client";
import { NotificationPermissionPrompt } from "@/components/notifications/NotificationPermissionPrompt";
import { NotificationActionRunner } from "@/components/notifications/NotificationActionRunner";
import { InstallPrompt } from "@/components/install/InstallPrompt";
import { HouseholdRealtimeProvider } from "@/components/realtime/HouseholdRealtimeProvider";

// Eagerly loaded (auth flow)
import Auth from "./pages/Auth";
import { AppEntryGate } from "./components/launch/AppEntryGate";
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
const TaskmasterTemplates = lazy(() => import("./pages/TaskmasterTemplates"));
const Meals = lazy(() => import("./pages/Meals"));
const Grocery = lazy(() => import("./pages/Grocery"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Habits = lazy(() => import("./pages/Habits"));
const Finance = lazy(() => import("./pages/Finance"));
const FinanceTransactions = lazy(() => import("./pages/FinanceTransactions"));
const FinanceBudget = lazy(() => import("./pages/FinanceBudget"));
const FinanceBudgetAnnual = lazy(() => import("./pages/FinanceBudgetAnnual"));
const FinanceBudgetCategories = lazy(() => import("./pages/FinanceBudgetCategories"));
const FinanceSavings = lazy(() => import("./pages/FinanceSavings"));
const FinanceChat = lazy(() => import("./pages/FinanceChat"));
const FinanceMonthlyReview = lazy(() => import("./pages/FinanceMonthlyReview"));
const FinanceSubscriptions = lazy(() => import("./pages/FinanceSubscriptions"));
const FinanceCards = lazy(() => import("./pages/FinanceCards"));
const FinanceTrends = lazy(() => import("./pages/FinanceTrends"));
const FinanceReport = lazy(() => import("./pages/FinanceReport"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const HouseholdInvitations = lazy(() => import("./pages/HouseholdInvitations"));
const HouseholdMembers = lazy(() => import("./pages/HouseholdMembers"));
const HouseholdProductSettings = lazy(() => import("./pages/HouseholdProductSettings"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Install = lazy(() => import("./pages/Install"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const PermissionsSettings = lazy(() => import("./pages/PermissionsSettings"));
const AdminPermissionAnalytics = lazy(() => import("./pages/AdminPermissionAnalytics"));
const HowToUse = lazy(() => import("./pages/HowToUse"));
const WhatsNew = lazy(() => import("./pages/WhatsNew"));
const Welcome = lazy(() => import("./pages/Welcome"));
const AskAi = lazy(() => import("./pages/AskAi"));

const queryClient = createPersistedQueryClient();


const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineBanner />
      <SyncingIndicator />
      <BrowserRouter>

          <AuthProvider>
            <ScrollToTop />
            <NotificationActionRunner />
            <HouseholdRealtimeProvider />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<AppEntryGate />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/request-access" element={<RequestAccess />} />
                <Route
                  path="/admin/access-requests"
                  element={
                    <AdminRoute>
                      <AdminAccessRequests />
                    </AdminRoute>
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
                <Route path="/taskmaster" element={
                  <ProtectedRoute>
                    <Navigate to="/taskmaster/today" replace />
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
                <Route path="/taskmaster/templates" element={
                  <ProtectedRoute>
                    <TaskmasterTemplates />
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
                <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
                <Route path="/ai" element={<ProtectedRoute><AskAi /></ProtectedRoute>} />
                <Route path="/finance/transactions" element={<ProtectedRoute><FinanceTransactions /></ProtectedRoute>} />
                <Route path="/finance/subscriptions" element={<ProtectedRoute><FinanceSubscriptions /></ProtectedRoute>} />
                <Route path="/finance/budget" element={<ProtectedRoute><FinanceBudget /></ProtectedRoute>} />
                <Route path="/finance/budget/annual" element={<ProtectedRoute><FinanceBudgetAnnual /></ProtectedRoute>} />
                <Route path="/finance/budget/categories" element={<ProtectedRoute><FinanceBudgetCategories /></ProtectedRoute>} />
                <Route path="/finance/savings" element={<ProtectedRoute><FinanceSavings /></ProtectedRoute>} />
                <Route path="/finance/chat" element={<ProtectedRoute><FinanceChat /></ProtectedRoute>} />
                <Route path="/finance/review" element={<ProtectedRoute><FinanceMonthlyReview /></ProtectedRoute>} />
                <Route path="/finance/cards" element={<ProtectedRoute><FinanceCards /></ProtectedRoute>} />
                <Route path="/finance/trends" element={<ProtectedRoute><FinanceTrends /></ProtectedRoute>} />
                <Route path="/finance/report" element={<ProtectedRoute><FinanceReport /></ProtectedRoute>} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/install" element={<Install />} />
                <Route path="/settings/notifications" element={
                  <ProtectedRoute>
                    <NotificationSettings />
                  </ProtectedRoute>
                } />
                <Route path="/settings/permissions" element={
                  <ProtectedRoute>
                    <PermissionsSettings />
                  </ProtectedRoute>
                } />
                <Route path="/admin/permission-analytics" element={
                  <AdminRoute>
                    <AdminPermissionAnalytics />
                  </AdminRoute>
                } />
                <Route path="/how-to-use" element={
                  <ProtectedRoute>
                    <HowToUse />
                  </ProtectedRoute>
                } />
                <Route path="/whats-new" element={
                  <ProtectedRoute>
                    <WhatsNew />
                  </ProtectedRoute>
                } />
                <Route path="/welcome" element={<Welcome />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <AIChatWidget />
            <NotificationPermissionPrompt />
            <InstallPrompt />
          </AuthProvider>
        
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
