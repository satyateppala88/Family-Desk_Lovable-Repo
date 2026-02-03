// WhatsApp Cloud API utilities for sending messages

const WHATSAPP_API_VERSION = "v21.0";

interface WhatsAppTemplateComponent {
  type: "header" | "body" | "button";
  parameters: Array<{
    type: "text" | "image" | "document" | "video";
    text?: string;
    image?: { link: string };
  }>;
}

interface WhatsAppTemplateMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "template";
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: WhatsAppTemplateComponent[];
  };
}

interface WhatsAppTextMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "text";
  text: {
    preview_url: boolean;
    body: string;
  };
}

interface WhatsAppAPIResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface WhatsAppAPIError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

/**
 * Send a WhatsApp template message
 */
export async function sendWhatsAppTemplate(
  phoneNumber: string,
  templateName: string,
  templateParams: string[],
  languageCode: string = "en"
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

  if (!phoneNumberId || !accessToken) {
    console.error("WhatsApp credentials not configured");
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  // Format phone number - remove spaces, dashes, and ensure it starts with country code
  const formattedPhone = formatPhoneNumber(phoneNumber);

  const message: WhatsAppTemplateMessage = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
    },
  };

  // Add parameters if provided
  if (templateParams.length > 0) {
    message.template.components = [
      {
        type: "body",
        parameters: templateParams.map((param) => ({
          type: "text" as const,
          text: param,
        })),
      },
    ];
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppAPIError;
      console.error("WhatsApp API error:", errorData);
      return {
        success: false,
        error: errorData.error?.message || "Failed to send WhatsApp message",
      };
    }

    const successData = data as WhatsAppAPIResponse;
    console.log("WhatsApp message sent:", successData);

    return {
      success: true,
      messageId: successData.messages?.[0]?.id,
    };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a plain text WhatsApp message (only works within 24h session window)
 */
export async function sendWhatsAppText(
  phoneNumber: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

  if (!phoneNumberId || !accessToken) {
    console.error("WhatsApp credentials not configured");
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);

  const message: WhatsAppTextMessage = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "text",
    text: {
      preview_url: false,
      body: text,
    },
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppAPIError;
      console.error("WhatsApp API error:", errorData);
      return {
        success: false,
        error: errorData.error?.message || "Failed to send WhatsApp message",
      };
    }

    const successData = data as WhatsAppAPIResponse;
    return {
      success: true,
      messageId: successData.messages?.[0]?.id,
    };
  } catch (error) {
    console.error("Error sending WhatsApp text:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Format phone number for WhatsApp API
 * Removes spaces, dashes, parentheses and ensures proper format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Remove leading + if present (WhatsApp API expects digits only)
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // If number doesn't start with country code (assuming India as default)
  // You may want to make this configurable
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }

  return cleaned;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[^\d]/g, "");
  // Valid if 10 digits (local) or 12+ digits (with country code)
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Template names as constants for consistency
export const WHATSAPP_TEMPLATES = {
  OTP_VERIFICATION: "otp_verification_new",
  TASK_ASSIGNED: "task_assigned",
  DAILY_PLAN_SUMMARY: "daily_plan_summary",
  PANTRY_EXPIRY_ALERT: "pantry_expiry_alert",
} as const;
