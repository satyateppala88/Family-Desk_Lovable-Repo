import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last Updated: {new Date().toLocaleDateString('en-IN')}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                Family Desk ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our household management service, in compliance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 (DPDP Act).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium mb-2 mt-4">2.1 Personal Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Name and display name</li>
                <li>Email address</li>
                <li>Profile picture (optional)</li>
                <li>Household information and member details</li>
                <li>Region and language preferences</li>
              </ul>
              
              <h3 className="text-lg font-medium mb-2 mt-4">2.1.1 Household Preferences Information</h3>
              <p className="text-muted-foreground mb-2">During onboarding, we collect:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Family size and composition (adults and children)</li>
                <li>Household type (nuclear, joint, single)</li>
                <li>Dietary preferences and restrictions (vegetarian, vegan, etc.)</li>
                <li>Food allergies and intolerances</li>
                <li>Religious dietary requirements</li>
                <li>Spice level preferences</li>
                <li>Regional cuisine preferences</li>
                <li>Cooking skill level and available cooking time</li>
                <li>Preferred meal types and pantry size</li>
                <li>Shopping frequency and locations</li>
                <li>Household concerns and priorities</li>
                <li>Work schedule and preferred task times</li>
                <li>Festival celebration importance</li>
                <li>Monthly grocery budget and budget consciousness</li>
                <li>Organic/premium product preferences</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">2.2 Usage Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Tasks created, assigned, and completed</li>
                <li>Meal plans and dietary preferences</li>
                <li>Grocery lists and pantry items</li>
                <li>Calendar events and reminders</li>
                <li>AI meal planning queries and preferences</li>
                <li>Natural language task inputs and scheduling preferences</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">2.3 Google Calendar Data</h3>
              <p className="text-muted-foreground mb-2">When you connect your Google Calendar, we collect:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Calendar event titles, dates, times, and durations</li>
                <li>Event locations and descriptions (if provided)</li>
                <li>Calendar names and ownership information</li>
                <li>OAuth access and refresh tokens for maintaining connection</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We do NOT access or store: event attendee emails, private notes, or calendar settings beyond visibility preferences.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">2.4 Technical Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Device information and browser type</li>
                <li>IP address and location data</li>
                <li>Usage patterns and interaction with features</li>
                <li>Session duration and frequency</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>To provide and maintain our Service</li>
                <li>To personalize your experience with Indian cuisine recommendations</li>
                <li>To generate AI-powered meal suggestions based on your preferences</li>
                <li>To enable household collaboration features</li>
                <li>To send notifications about tasks, events, and updates</li>
                <li>To improve and optimize our Service</li>
                <li>To ensure security and prevent fraud</li>
                <li>To comply with legal obligations</li>
                <li>To provide calendar-aware task prioritization and daily planning</li>
                <li>To extract actionable tasks from your calendar events using AI</li>
                <li>To parse natural language task inputs into structured data</li>
              </ul>
              
              <h3 className="text-lg font-medium mb-2 mt-4">3.1 How We Use Household Preferences</h3>
              <p className="text-muted-foreground mb-2">We use your household preferences data to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Generate customized Indian meal plans that respect your dietary restrictions</li>
                <li>Suggest recipes matching your cooking skill level and available time</li>
                <li>Recommend budget-appropriate grocery items</li>
                <li>Tailor task suggestions to your household size and priorities</li>
                <li>Respect your religious and cultural dietary requirements</li>
                <li>Provide region-specific cuisine recommendations</li>
                <li>Avoid suggesting recipes with allergens you've reported</li>
              </ul>
              
              <p className="text-muted-foreground mt-2">This data is:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Stored securely in encrypted format</li>
                <li>Never shared with third parties for marketing</li>
                <li>Used exclusively to improve your user experience</li>
                <li>Accessible and modifiable by you at any time</li>
                <li>Deleted upon account deletion (within 90 days)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. AI-Powered Features</h2>
              <p className="text-muted-foreground mb-2">
                Our AI features process your data to provide personalized assistance:
              </p>
              
              <h3 className="text-lg font-medium mb-2 mt-4">4.1 Meal Planning AI</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Your complete household profile (diet, allergies, skill, budget) is used to generate suitable meal plans</li>
                <li>Pantry items and cuisine preferences help customize recommendations</li>
                <li>AI processing is done securely through Lovable AI Gateway</li>
                <li>We do not share your personal meal planning data with third-party AI providers</li>
                <li>Generated meal plans are stored in your household account</li>
                <li>Allergy information is given highest priority in AI processing to ensure safety</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">4.2 Natural Language Task Processing</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Your task inputs are processed by AI to extract structured information</li>
                <li>Scheduling context (time preferences, dependencies) is interpreted from natural language</li>
                <li>Task categories and priorities are automatically suggested</li>
                <li>This processing happens in real-time and is not stored separately from your tasks</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">4.3 Calendar-Aware Task Prioritization</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Your calendar events are analyzed to determine daily busyness levels</li>
                <li>AI considers your meeting schedule when recommending task loads</li>
                <li>Free time slots are identified to suggest optimal task timing</li>
                <li>Calendar data is processed in real-time and not stored beyond what's shown in your calendar view</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">4.4 Calendar Task Extraction</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>AI analyzes calendar event titles to identify actionable tasks</li>
                <li>Events like "Call dentist" may be converted to tasks; meetings are not</li>
                <li>Event IDs are stored to prevent duplicate extraction</li>
                <li>Extracted tasks are linked to their source calendar events for transparency</li>
                <li>You can delete any AI-extracted task without affecting the original calendar event</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Storage and Security</h2>
              <p className="text-muted-foreground mb-2">
                We implement appropriate technical and organizational security measures:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Data is encrypted in transit and at rest</li>
                <li>We use secure cloud infrastructure for data storage</li>
                <li>Access to personal data is restricted to authorized personnel only</li>
                <li>Regular security audits and updates are performed</li>
                <li>Data is stored on servers that comply with industry standards</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground mb-2">
                We do not sell your personal data. We may share information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Household Members:</strong> Data you add to a household is visible to other household members</li>
                <li><strong>Service Providers:</strong> We use trusted third-party services for hosting and infrastructure</li>
                <li><strong>AI Processing:</strong> Your household preferences are processed by our AI system (powered by Lovable AI Gateway) to generate personalized suggestions. This processing happens on secure servers. We do not sell or share your preferences data with external AI providers or advertisers.</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with any merger, sale, or acquisition</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Third-Party Services</h2>
              <p className="text-muted-foreground mb-2">
                Our Service integrates with the following third-party services:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Lovable Cloud (powered by Supabase):</strong> For backend infrastructure, including database, authentication, and edge functions</li>
                <li><strong>Lovable AI Gateway:</strong> For AI processing of meal plans, task parsing, and calendar analysis</li>
                <li><strong>Google Calendar API:</strong> For calendar synchronization and event retrieval</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                These services have their own privacy policies and security measures. We encourage you to review their policies. By using these integrations, you acknowledge that your data may be processed by these services in accordance with their terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Google Calendar Integration Privacy</h2>
              <p className="text-muted-foreground mb-2">
                When you connect your Google Calendar:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>We use Google OAuth 2.0 for secure authentication</li>
                <li>We request read-only access to your calendar events</li>
                <li>Access tokens are stored securely and encrypted</li>
                <li>We refresh tokens automatically to maintain your connection</li>
                <li>Calendar data is fetched on-demand and not permanently cached</li>
                <li>You can revoke access at any time through Google Account settings or our app</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Our use of Google Calendar API data complies with Google's Limited Use Requirements. We only use calendar data for the features described in this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Your Rights Under DPDP Act</h2>
              <p className="text-muted-foreground mb-2">
                As per the Digital Personal Data Protection Act, 2023, you have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Access your personal data</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request deletion of your data (subject to legal obligations)</li>
                <li>Withdraw consent for data processing</li>
                <li>Lodge a complaint with the Data Protection Board of India</li>
                <li>Nominate another individual to exercise your rights after your death</li>
                <li>Disconnect third-party integrations (like Google Calendar) at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Data Retention</h2>
              <p className="text-muted-foreground mb-2">
                We retain your personal data for as long as your account is active or as needed to provide services. If you delete your account, we will delete or anonymize your data within 90 days, except where retention is required by law.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Calendar OAuth tokens are deleted when you disconnect your Google Calendar</li>
                <li>Tasks extracted from calendar retain their source reference for your records</li>
                <li>AI-generated content (meal plans, task suggestions) is deleted with your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use essential cookies for authentication and session management. These are necessary for the Service to function properly. We do not use tracking cookies or third-party advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our Service is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Changes to Privacy Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through a prominent notice in the Service. Your continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">14. International Data Transfers</h2>
              <p className="text-muted-foreground">
                Your data may be processed on servers located outside India, including for Google Calendar API processing. We ensure that appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">15. Data Accuracy and User Responsibility</h2>
              <p className="text-muted-foreground mb-2">You are responsible for:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Providing accurate household and dietary preference information</li>
                <li>Updating your preferences when your household situation changes</li>
                <li>Reviewing AI-generated suggestions for suitability</li>
                <li>Verifying ingredient safety, especially for allergies</li>
                <li>Not relying solely on AI suggestions for medical dietary needs</li>
                <li>Managing which calendar accounts are connected and visible</li>
                <li>Reviewing tasks extracted from calendar for accuracy</li>
              </ul>
              
              <p className="text-muted-foreground mt-2 mb-2">We recommend:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Reviewing your preferences quarterly</li>
                <li>Consulting healthcare professionals for specific dietary requirements</li>
                <li>Double-checking allergen information in suggested recipes</li>
                <li>Updating family size when household composition changes</li>
                <li>Periodically reviewing and cleaning up extracted calendar tasks</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">16. Contact Us</h2>
              <p className="text-muted-foreground">
                For any questions, concerns, or requests regarding your privacy or this policy, please contact:
                <br /><br />
                <strong>Data Protection Officer</strong><br />
                Email: contactus@familydesk.in<br />
                Support: contactus@familydesk.in<br />
                Address: [Your registered Indian address]
              </p>
              <p className="text-muted-foreground mt-4">
                You also have the right to lodge a complaint with the Data Protection Board of India if you believe your rights have been violated.
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
