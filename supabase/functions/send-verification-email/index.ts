import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getEmailWrapper, getVerificationEmailContent } from "../_shared/email-templates.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

import { sendViaQueue } from "../_shared/send-email-queue.ts";
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface SendVerificationRequest {
  userId: string;
  email: string;
  displayName?: string;
  origin: string;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role client to manage tokens
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, email, displayName, origin }: SendVerificationRequest = await req.json();

    if (!userId || !email || !origin) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, email, origin" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check for existing token sent in last 60 seconds (rate limiting)
    const { data: existingTokens } = await supabaseAdmin
      .from("email_verification_tokens")
      .select("created_at")
      .eq("user_id", userId)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingTokens && existingTokens.length > 0) {
      const lastTokenTime = new Date(existingTokens[0].created_at).getTime();
      const now = Date.now();
      const cooldownMs = 60 * 1000; // 60 seconds

      if (now - lastTokenTime < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - (now - lastTokenTime)) / 1000);
        return new Response(
          JSON.stringify({ 
            error: "Please wait before requesting another verification email",
            remainingSeconds 
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Generate secure token
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();

    // Store token in database
    const { error: insertError } = await supabaseAdmin
      .from("email_verification_tokens")
      .insert({
        user_id: userId,
        token,
        email,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      });

    if (insertError) {
      console.error("Error inserting token:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification token" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build verification URL
    const verificationUrl = `${origin}/verify-email?token=${token}`;

    // Send email via Resend
    const emailContent = getVerificationEmailContent(verificationUrl);
    const emailHtml = getEmailWrapper(emailContent, {
      recipientName: displayName || undefined,
      preheader: "Please verify your email address to get started with Family Desk",
    });

    const { data: emailData, error: emailError } = await sendViaQueue(supabaseUrl, supabaseServiceKey, {
      to: email,
      subject: "Verify your email address - Family Desk",
      html: emailHtml,
      templateName: "send-verification-email",
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send verification email", details: emailError }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Verification email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-verification-email:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
