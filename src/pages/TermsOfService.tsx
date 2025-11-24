import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
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
              Last Updated: {new Date().toLocaleDateString('en-IN')}
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
                Family Desk is a household management platform designed for Indian families, providing features including task management, AI-powered meal planning with Indian cuisine focus, grocery list management, and calendar organization.
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
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Household Sharing Features</h2>
              <p className="text-muted-foreground">
                When you create or join a household, you agree to share certain data with household members. You are responsible for managing household member access and permissions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The Service and its original content, features, and functionality are owned by HomeMate and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                To the maximum extent permitted by applicable law, HomeMate shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Compliance with Indian Laws</h2>
              <p className="text-muted-foreground">
                This Service complies with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 (DPDP Act). We are committed to protecting your personal data in accordance with Indian data protection regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
              <p className="text-muted-foreground">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the Service. Your continued use after such modifications constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of courts in India.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Contact Information</h2>
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
