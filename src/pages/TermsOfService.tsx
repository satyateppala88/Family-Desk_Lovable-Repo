import { Header } from "@/components/layout/Header";

import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last Updated: February 3, 2026
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Family Desk ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
              <p className="text-muted-foreground">
                Family Desk is a household management platform designed for Indian families, providing features including task management, AI-powered meal planning with Indian cuisine focus, grocery list management, calendar organization, habit tracking, project management (Taskmaster), and Google Calendar integration with AI-powered task extraction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>You must be at least 13 years old to use this Service</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You must provide accurate and complete information during registration</li>
                <li>You agree to notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. User Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Use the Service only for lawful purposes and in accordance with these Terms</li>
                <li>Not use the Service in any way that could damage, disable, or impair the Service</li>
                <li>Not attempt to gain unauthorized access to any portion of the Service</li>
                <li>Not upload or transmit any harmful code, viruses, or malicious software</li>
                <li>Respect the intellectual property rights of others</li>
              </ul>
              
              <h3 className="text-lg font-medium mb-2 mt-4">4.1 User-Provided Household Data</h3>
              <p className="text-muted-foreground mb-2">
                When you complete the onboarding process, you provide household information including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Family composition and size</li>
                <li>Dietary preferences, restrictions, and food allergies</li>
                <li>Cooking habits and skill levels</li>
                <li>Budget and shopping preferences</li>
                <li>Household routines and priorities</li>
              </ul>
              <p className="text-muted-foreground mt-2">You acknowledge that:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>This information is used to personalize AI suggestions</li>
                <li>You are responsible for keeping this information accurate and up-to-date</li>
                <li>Inaccurate information may result in unsuitable meal suggestions</li>
                <li>You can update your preferences at any time through Settings</li>
                <li>You must report allergies accurately to prevent health risks</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Usage and AI Features</h2>
              
              <h3 className="text-lg font-medium mb-2">5.1 Personalization Data</h3>
              <p className="text-muted-foreground mb-2">
                Our AI-powered features use your household profile data to generate personalized suggestions:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Meal plans are customized based on dietary restrictions, allergies, and preferences</li>
                <li>Task suggestions consider your household size and priorities</li>
                <li>Grocery recommendations reflect your budget and shopping preferences</li>
                <li>All personalization data is stored securely and used only for your benefit</li>
              </ul>
              
              <h3 className="text-lg font-medium mb-2 mt-4">5.2 Data Quality and Accuracy</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>You are responsible for providing accurate household information</li>
                <li>We recommend reviewing and updating your preferences periodically</li>
                <li>The AI suggestions are only as good as the data you provide</li>
                <li>We are not liable for suggestions based on incomplete or inaccurate user data</li>
              </ul>
              
              <h3 className="text-lg font-medium mb-2 mt-4">5.3 AI Limitations</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>AI suggestions are generated based on patterns and may not always be perfect</li>
                <li>Always verify ingredient safety, especially for allergies and dietary restrictions</li>
                <li>Consult healthcare professionals for specific dietary needs</li>
                <li>We do not guarantee the accuracy of nutritional information</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">5.4 Natural Language Task Processing</h3>
              <p className="text-muted-foreground mb-2">
                Our AI processes natural language task inputs to extract structured information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Task titles, descriptions, priorities, and due dates are extracted from conversational input</li>
                <li>Scheduling context (e.g., "after my meeting", "before school pickup") is interpreted</li>
                <li>Category classification (home, work, kid-related) is automatically assigned</li>
                <li>You can always edit or correct AI-interpreted task details</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">5.5 Calendar-Aware Task Prioritization</h3>
              <p className="text-muted-foreground mb-2">
                When you connect your Google Calendar, our AI uses your schedule to enhance task management:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Daily task plans consider your meeting load and available time slots</li>
                <li>On busy days, fewer tasks are recommended to avoid overwhelm</li>
                <li>Task scheduling suggestions align with your free time windows</li>
                <li>Work tasks are prioritized during work hours, home tasks during evenings</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">5.6 Calendar Task Extraction</h3>
              <p className="text-muted-foreground mb-2">
                Our AI can automatically identify actionable tasks from your calendar events:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Calendar events that represent actions (e.g., "Call dentist") may be converted to tasks</li>
                <li>Appointments and meetings (e.g., "Team standup") are not converted to tasks</li>
                <li>You retain full control to delete or modify any extracted tasks</li>
                <li>Duplicate task extraction is prevented through event tracking</li>
                <li>AI-extracted tasks are marked with their calendar source for transparency</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">5.7 Habit Tracking Features</h3>
              <p className="text-muted-foreground mb-2">When using the Habits feature:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Personal habits are visible only to you unless marked as household habits</li>
                <li>Household habits and completion data are visible to all household members</li>
                <li>Leaderboards show relative performance of household members</li>
                <li>AI coach suggestions are based on your habit patterns and may not be personalized medical advice</li>
                <li>Habit streaks reset if you miss a scheduled day</li>
                <li>You can delete habits and their history at any time</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">5.8 Taskmaster Project Management</h3>
              <p className="text-muted-foreground mb-2">The Taskmaster feature provides advanced project management:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Projects and tasks are visible to all household members</li>
                <li>AI parsing of task inputs may not always be accurate; verify extracted details</li>
                <li>Project completion status is tracked and stored</li>
                <li>AI-generated daily plans prioritize tasks based on multiple factors including urgency, your schedule, and task dependencies</li>
                <li>You maintain full control over accepting or modifying AI-suggested plans</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Google Calendar Integration</h2>
              <p className="text-muted-foreground mb-2">
                When you connect your Google Calendar to Family Desk:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>You authorize us to read your calendar events for display and task planning purposes</li>
                <li>We access all calendars associated with your Google account that you make visible</li>
                <li>Calendar data is used to provide unified family calendar views and AI-powered insights</li>
                <li>We store OAuth tokens securely to maintain your calendar connection</li>
                <li>You can disconnect your Google Calendar at any time through Settings</li>
                <li>Disconnecting will stop calendar synchronization but won't delete previously extracted tasks</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                By connecting Google Calendar, you agree to Google's Terms of Service and acknowledge that your use is also subject to Google's Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Household Sharing Features</h2>
              <p className="text-muted-foreground">
                When you create or join a household, you agree to share certain data with household members. You are responsible for managing household member access and permissions. Connected calendars and extracted tasks are visible to all household members. Habit leaderboards and completion data are shared within your household.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The Service and its original content, features, and functionality are owned by Family Desk and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                To the maximum extent permitted by applicable law, Family Desk shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Compliance with Indian Laws</h2>
              <p className="text-muted-foreground">
                This Service complies with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 (DPDP Act). We are committed to protecting your personal data in accordance with Indian data protection regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Third-Party Services</h2>
              <p className="text-muted-foreground mb-2">
                Our Service integrates with third-party services:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Google Calendar:</strong> For calendar synchronization and event display</li>
                <li><strong>Lovable AI Gateway:</strong> For AI-powered meal planning, task parsing, and calendar analysis</li>
                <li><strong>Lovable Cloud:</strong> For database, authentication, and backend infrastructure</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Each third-party service has its own terms and privacy policies. By using these integrations, you agree to comply with their respective terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Termination</h2>
              <p className="text-muted-foreground">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the Service. Your continued use after such modifications constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">14. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of courts in India.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">15. Contact Information</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms, please contact us at:
                <br />
                Email: contactus@familydesk.in
                <br />
                Support: contactus@familydesk.in
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
