import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { 
  sendWhatsAppTemplate, 
  sendWhatsAppText, 
  isValidPhoneNumber,
  WHATSAPP_TEMPLATES 
} from "../_shared/whatsapp.ts";

interface NotifyRequest {
  phoneNumber: string;
  templateName: string;
  templateParams?: string[];
  languageCode?: string;
  // For text messages (session window only)
  textMessage?: string;
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      phoneNumber, 
      templateName, 
      templateParams = [], 
      languageCode = "en",
      textMessage 
    }: NotifyRequest = await req.json();

    // Validate phone number
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    // If text message is provided, send as text (session window)
    if (textMessage) {
      result = await sendWhatsAppText(phoneNumber, textMessage);
    } else {
      // Validate template name
      const validTemplates = Object.values(WHATSAPP_TEMPLATES);
      if (!templateName || !validTemplates.includes(templateName as any)) {
        return new Response(
          JSON.stringify({ 
            error: "Invalid template name", 
            validTemplates 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      result = await sendWhatsAppTemplate(
        phoneNumber,
        templateName,
        templateParams,
        languageCode
      );
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messageId 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in whatsapp-notify:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
