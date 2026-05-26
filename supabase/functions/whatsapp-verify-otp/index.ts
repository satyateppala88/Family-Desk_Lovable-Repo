import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { formatPhoneNumber, isValidPhoneNumber } from "../_shared/whatsapp.ts";

interface VerifyOTPRequest {
  phoneNumber: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const { phoneNumber, otp }: VerifyOTPRequest = await req.json();

    // Validate inputs
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!otp || otp.length !== 6) {
      return new Response(
        JSON.stringify({ error: "Invalid OTP format. Must be 6 digits." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    const { data: activeTokens } = await supabaseAdmin
      .from('phone_verification_tokens')
      .select('id, token, failed_attempts')
      .eq('user_id', userId)
      .eq('phone_number', formattedPhone)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    const activeToken = activeTokens?.[0];
    if (!activeToken) {
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if ((activeToken.failed_attempts ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (activeToken.token !== otp) {
      await supabaseAdmin.from('phone_verification_tokens')
        .update({ failed_attempts: (activeToken.failed_attempts ?? 0) + 1 })
        .eq('id', activeToken.id);
      const remaining = 4 - (activeToken.failed_attempts ?? 0);
      return new Response(JSON.stringify({ error: `Invalid OTP. ${remaining} attempt${remaining===1?'':'s'} remaining.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabaseAdmin.from('phone_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', activeToken.id);

    // Update profile - phone is now verified
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        phone_number: formattedPhone,
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
        whatsapp_opted_in: true, // Auto opt-in after verification
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to update profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Phone ${formattedPhone} verified for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Phone number verified successfully!",
        phoneVerified: true
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in whatsapp-verify-otp:", error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred.' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
