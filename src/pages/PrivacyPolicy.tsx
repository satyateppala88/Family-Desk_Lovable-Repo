import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PRIVACY_VERSION,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_CHANGELOG,
  formatVersionDate,
} from "@/lib/versioning";
import { VersionHistory } from "@/components/settings/VersionHistory";

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
            <p className="text-muted-foreground text-sm">Family Desk</p>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <Badge variant="secondary">Version {PRIVACY_VERSION}</Badge>
              <span className="text-sm text-muted-foreground">
                Effective {formatVersionDate(PRIVACY_EFFECTIVE_DATE)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <p className="text-muted-foreground">
              This Privacy Policy explains how Family Desk ("Family Desk", "we", "us", or "our") collects, uses, stores, and protects information when you use the Family Desk mobile app, website, and related services.
            </p>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. About Family Desk</h2>
              <p className="text-muted-foreground">
                Family Desk is a household organization app that helps users manage shared tasks, meals, groceries, calendar items, habits, finance-related planning, and other household information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              <p className="text-muted-foreground mb-2">We may collect the following categories of information:</p>

              <h3 className="text-lg font-medium mb-2 mt-4">a. Account Information</h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Name</li>
                <li>Email address</li>
                <li>Authentication credentials or account identifiers</li>
                <li>Household name or profile details</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">b. User Content</h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Tasks, reminders, chores, and assignments</li>
                <li>Meal plans, recipes, grocery lists, pantry items</li>
                <li>Calendar entries and habits</li>
                <li>Budget, savings, spending, and finance-related planning entries</li>
                <li>Subscription and recurring expense details (names, amounts, frequencies, categories)</li>
                <li>Credit card selections from our pre-built catalog (no card numbers or payment credentials are stored)</li>
                <li>Photos and avatars you upload for yourself, your household, or family members</li>
                <li>Voice input you choose to dictate (see Section 3 — voice is converted to text on your device and the audio is not stored)</li>
                <li>Preferences, settings, and onboarding selections</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">c. Device and Technical Information</h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Device type</li>
                <li>Operating system version</li>
                <li>App version</li>
                <li>Crash logs</li>
                <li>Diagnostics and performance information</li>
                <li>Push notification token, if notifications are enabled</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">d. Support and Communication Data</h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Messages you send to support</li>
                <li>Feedback, bug reports, and survey responses</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Information</h2>
              <p className="text-muted-foreground mb-2">We use information to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Create and manage user accounts</li>
                <li>Authenticate users and secure access</li>
                <li>Store and sync household data</li>
                <li>Provide core app functionality</li>
                <li>Personalize the user experience</li>
                <li>Send reminders, alerts, and notifications</li>
                <li>Maintain security and prevent misuse</li>
                <li>Diagnose bugs and improve app performance</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Device Permissions &amp; Sensitive Data</h2>
              <p className="text-muted-foreground mb-3">
                Family Desk only requests sensitive device permissions at the moment you tap the related feature, never on app launch. You can decline any permission and continue to use the rest of the app, and you can revoke permissions at any time from your device settings.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">a. Microphone &amp; Voice Processing</h3>
              <p className="text-muted-foreground mb-2">
                When you tap the microphone icon (for example to dictate a task or chat with the assistant), Family Desk requests microphone access so your speech can be converted into text.
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Speech-to-text is performed by your <strong>device&rsquo;s built-in speech recognition</strong> (Web Speech API on browsers, the OS recognizer on mobile).</li>
                <li>We do <strong>not</strong> record audio, store audio files, or transmit raw audio to our servers or to any third party.</li>
                <li>Only the resulting text is processed by Family Desk, and only if you choose to send or save it (for example by submitting a task).</li>
                <li>You can stop voice input at any time by tapping the microphone icon again.</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">b. Camera &amp; Photo Library</h3>
              <p className="text-muted-foreground mb-2">
                When you choose to add or change a profile picture (for yourself, your household, or a family member), Family Desk requests permission to access your camera or photo library.
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>We only access the single photo you select &mdash; we never browse your library.</li>
                <li>Selected photos are uploaded to our secure cloud storage (Lovable Cloud), scoped to your household, and protected by row-level security so only co-members can view them.</li>
                <li>You can replace or delete any uploaded photo at any time from the relevant settings screen.</li>
                <li>If you delete a photo, the file is removed from active storage; encrypted backup copies may persist for a limited period before being purged.</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">c. Notifications</h3>
              <p className="text-muted-foreground mb-2">
                Notifications are optional and only enabled if you grant permission. We send notifications strictly for things you have asked Family Desk to track.
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Categories include task reminders, habit nudges, meal-prep alerts, pantry low-stock and expiry alerts, and household activity.</li>
                <li>We do not send marketing or promotional notifications.</li>
                <li>A push token (an anonymous identifier issued by Apple Push Notification service or Firebase Cloud Messaging) is stored to deliver notifications. It is not used for tracking across other apps or websites.</li>
                <li>You can mute, fine-tune categories, or fully disable notifications at any time from <em>Settings &rarr; Notifications</em>, or from your device&rsquo;s system settings.</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">d. Permission Priming</h3>
              <p className="text-muted-foreground">
                Before the operating system shows its native permission dialog, Family Desk displays a brief in-app explanation of why the permission is needed. This is to help you make an informed choice. Tapping &ldquo;Not now&rdquo; in the in-app dialog will not trigger the system prompt; you can re-enable the request later from the relevant feature.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Legal Basis and Consent</h2>
              <p className="text-muted-foreground">
                Where required by applicable law, we process personal data based on user consent, performance of a contract, legitimate interests in operating and securing the service, and compliance with legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Storage</h2>
              <p className="text-muted-foreground mb-2">Data may be stored:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Locally on your device</li>
                <li>In secure cloud infrastructure used to operate the service</li>
                <li>Through carefully selected service providers acting on our behalf</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                If certain features use local-only storage, that does not necessarily mean all app data remains exclusively on the device. Storage behavior depends on the features you use and the technical services enabled in the app.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Data Sharing</h2>
              <p className="text-muted-foreground mb-2">We do not sell personal information.</p>
              <p className="text-muted-foreground mb-2">We may share data only as needed with:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Hosting and infrastructure providers</li>
                <li>Authentication providers</li>
                <li>Database and storage providers</li>
                <li>Crash reporting and analytics providers</li>
                <li>Notification delivery providers</li>
                <li>Customer support or security service providers</li>
                <li>Legal or regulatory authorities when required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Third-Party Services</h2>
              <p className="text-muted-foreground mb-2">
                Family Desk may use third-party services to operate core features. These may include hosting, authentication, analytics, crash reporting, notifications, AI services, or file storage.
              </p>
              <p className="text-muted-foreground mb-2">Services used by the app include:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li><strong>Supabase:</strong> Backend infrastructure (database, authentication, edge functions, storage)</li>
                <li><strong>Lovable AI Gateway:</strong> AI processing for meal plans, task parsing, and assistant features</li>
                <li><strong>Google Calendar API:</strong> Calendar synchronization and event retrieval</li>
                <li><strong>Apple Push Notification service / Firebase Cloud Messaging:</strong> Delivering notifications to your device (token-based; no message content is shared with the platform beyond what is required to deliver the alert)</li>
                <li><strong>Device speech recognition (Apple, Google, browser):</strong> Converts your voice to text on your device when you use voice input</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Data Retention</h2>
              <p className="text-muted-foreground mb-2">
                We retain personal data only for as long as necessary to provide the service, comply with legal obligations, resolve disputes, enforce agreements, and maintain security.
              </p>
              <p className="text-muted-foreground">
                When data is no longer needed, we delete it or anonymize it where reasonably possible.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. User Choices and Rights</h2>
              <p className="text-muted-foreground mb-2">Depending on your jurisdiction, you may have the right to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Request export of your data</li>
                <li>Withdraw consent where processing is based on consent</li>
                <li>Object to certain processing activities</li>
                <li>Revoke any device permission (microphone, camera, photos, notifications) at any time via your device&rsquo;s system settings</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                To exercise these rights, contact us at <strong>contactus@familydesk.in</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Account Deletion</h2>
              <p className="text-muted-foreground mb-2">You may request deletion of your account and associated personal data by:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Using the in-app account deletion feature, if available, or</li>
                <li>Contacting us at <strong>contactus@familydesk.in</strong></li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Some information may be retained where required for legal, security, fraud prevention, or backup purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Security</h2>
              <p className="text-muted-foreground mb-2">
                We use reasonable administrative, technical, and organizational safeguards to protect personal information. These include:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Role-based access controls enforced at the database level</li>
                <li>Row-level security policies restricting data visibility to authorized users</li>
                <li>Rate limiting on AI and sensitive API endpoints to prevent abuse</li>
                <li>JWT-based authentication with server-side validation on all backend functions</li>
                <li>Input validation on both frontend and backend to prevent injection attacks</li>
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Structured logging and monitoring for anomaly detection</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                No system is completely secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Children&rsquo;s Privacy</h2>
              <p className="text-muted-foreground mb-2">
                Family Desk is not directed to children unless explicitly stated otherwise. If children use the app as part of a household, such use should occur under parent or guardian supervision where required by law.
              </p>
              <p className="text-muted-foreground">
                If you believe a child has provided personal data in violation of applicable law, contact us at <strong>contactus@familydesk.in</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">14. International Transfers</h2>
              <p className="text-muted-foreground">
                If data is processed outside your country of residence, we will take reasonable steps to protect it in accordance with applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">15. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. If we make material changes, we will update the Effective Date and provide notice where required.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">16. Contact Us</h2>
              <p className="text-muted-foreground">
                Family Desk<br />
                Email: <strong>contactus@familydesk.in</strong><br />
                Website: <strong>familydesk.in</strong>
              </p>
            </section>

            <VersionHistory entries={PRIVACY_CHANGELOG} />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
