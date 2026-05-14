import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getEmailWrapper, getWelcomeEmailContent } from "../_shared/email-templates.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface VerifyTokenRequest {
  token: string;
  origin: string;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role client to manage tokens and update user
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { token, origin }: VerifyTokenRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing token" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find the token
    const { data: tokenData, error: findError } = await supabaseAdmin
      .from("email_verification_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (findError || !tokenData) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification link" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already used
    if (tokenData.used_at) {
      return new Response(
        JSON.stringify({ error: "This verification link has already been used" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This verification link has expired. Please request a new one." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark token as used
    const { error: updateTokenError } = await supabaseAdmin
      .from("email_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    if (updateTokenError) {
      console.error("Error marking token as used:", updateTokenError);
    }

    // Update user's email_confirmed_at via Admin API
    const { data: userData, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (updateUserError) {
      console.error("Error confirming user email:", updateUserError);
      return new Response(
        JSON.stringify({ error: "Failed to verify email. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark profile as verified — this is the source of truth for sign-in gating
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", tokenData.user_id);

    if (profileUpdateError) {
      console.error("Error updating profile email_verified_at:", profileUpdateError);
    }

    // Get user's display name for welcome email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", tokenData.user_id)
      .single();

    // Send welcome email
    const dashboardUrl = `${origin || "https://familydesk.in"}/household-setup`;
    const welcomeContent = getWelcomeEmailContent(dashboardUrl);
    const welcomeHtml = getEmailWrapper(welcomeContent, {
      recipientName: profile?.display_name || undefined,
      preheader: "Welcome to Family Desk! Your account is ready.",
    });

    try {
      await resend.emails.send({
        from: "Family Desk <noreply@familydesk.in>",
        to: [tokenData.email],
        subject: "Welcome to Family Desk! 🎉",
        html: welcomeHtml,
      });
      console.log("Welcome email sent to:", tokenData.email);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the verification if welcome email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email verified successfully",
        userId: tokenData.user_id 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in verify-email-token:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
