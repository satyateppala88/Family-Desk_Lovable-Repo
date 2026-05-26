import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { 
  sendWhatsAppTemplate, 
  isValidPhoneNumber, 
  formatPhoneNumber,
  generateOTP,
  WHATSAPP_TEMPLATES 
} from "../_shared/whatsapp.ts";

interface SendOTPRequest {
  phoneNumber: string;
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
    const { phoneNumber }: SendOTPRequest = await req.json();

    // Validate phone number
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Rate limiting: Check for recent OTP requests (max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentRequests } = await supabaseAdmin
      .from("phone_verification_tokens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);

    if (recentRequests && recentRequests >= 3) {
      return new Response(
        JSON.stringify({ 
          error: "Too many OTP requests. Please try again in an hour.",
          retryAfter: 3600
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in database
    const { error: insertError } = await supabaseAdmin
      .from("phone_verification_tokens")
      .insert({
        user_id: userId,
        phone_number: formattedPhone,
        token: otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile with phone number (not verified yet)
    await supabaseAdmin
      .from("profiles")
      .update({ 
        phone_number: formattedPhone,
        phone_verified: false,
        phone_verified_at: null,
        whatsapp_opted_in: false
      })
      .eq("id", userId);

    // Send OTP via WhatsApp
    const result = await sendWhatsAppTemplate(
      formattedPhone,
      WHATSAPP_TEMPLATES.OTP_VERIFICATION,
      [otp]
    );

    if (!result.success) {
      console.error("Failed to send WhatsApp OTP:", result.error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send OTP via WhatsApp. Please check your number and try again.",
          details: result.error
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`OTP sent to ${formattedPhone} for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent to your WhatsApp",
        expiresIn: 600 // 10 minutes in seconds
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in whatsapp-send-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

Deno.serve(handler);
