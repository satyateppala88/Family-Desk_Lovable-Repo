import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CALENDAR_ENCRYPTION_KEY = Deno.env.get("CALENDAR_ENCRYPTION_KEY");

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action;

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader && action !== "callback") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!CALENDAR_ENCRYPTION_KEY) {
      console.error("CALENDAR_ENCRYPTION_KEY is not configured");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    if (action === "init") {
      // Generate OAuth URL
      const { redirectUri, householdId } = body;

      // Store state with user info for callback
      const state = btoa(JSON.stringify({ userId, householdId, redirectUri }));

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPES);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      // Exchange auth code for tokens
      const { code, redirectUri, state } = body;

      // Decode state
      let stateData;
      try {
        stateData = JSON.parse(atob(state));
      } catch {
        return new Response(JSON.stringify({ error: "Invalid state" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { userId: stateUserId, householdId } = stateData;

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error("Token exchange error:", tokenData);
        return new Response(JSON.stringify({ error: tokenData.error_description || tokenData.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user email from Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoResponse.json();

      // Calculate token expiry
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Store in database
      const { data: existingConnection } = await supabase
        .from("calendar_connections")
        .select("id")
        .eq("user_id", stateUserId)
        .eq("google_account_email", userInfo.email)
        .single();

      if (existingConnection) {
        // Update existing connection (encrypts tokens server-side; preserves
        // existing refresh_token when Google omits one)
        const { error: updateError } = await supabase.rpc("upsert_calendar_tokens", {
          _connection_id: existingConnection.id,
          _access_token: tokenData.access_token,
          _refresh_token: tokenData.refresh_token ?? null,
          _expires_at: expiresAt.toISOString(),
          _key: CALENDAR_ENCRYPTION_KEY,
        });

        if (updateError) {
          console.error("Update error:", updateError);
          return new Response(JSON.stringify({ error: "Failed to update connection" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        // Create new connection with a default color
        const colors = ["#4786ff", "#B241D1", "#3FBF3F", "#FF9500", "#FF6B9D", "#00BCD4"];
        
        // Get existing connections count to assign different color
        const { count } = await supabase
          .from("calendar_connections")
          .select("*", { count: "exact", head: true })
          .eq("household_id", householdId);

        const colorIndex = (count || 0) % colors.length;

        const { error: insertError } = await supabase.rpc("insert_calendar_connection", {
          _user_id: stateUserId,
          _household_id: householdId,
          _email: userInfo.email,
          _access_token: tokenData.access_token,
          _refresh_token: tokenData.refresh_token,
          _expires_at: expiresAt.toISOString(),
          _display_name: userInfo.email.split("@")[0],
          _color: colors[colorIndex],
          _key: CALENDAR_ENCRYPTION_KEY,
        });

        if (insertError) {
          console.error("Insert error:", insertError);
          return new Response(JSON.stringify({ error: "Failed to save connection" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ success: true, email: userInfo.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      const { connectionId } = body;

      const { error } = await supabase
        .from("calendar_connections")
        .delete()
        .eq("id", connectionId)
        .eq("user_id", userId);

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to disconnect" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { connectionId, displayName, color, isVisible } = body;

      const updates: Record<string, unknown> = {};
      if (displayName !== undefined) updates.display_name = displayName;
      if (color !== undefined) updates.color = color;
      if (isVisible !== undefined) updates.is_visible = isVisible;

      const { error } = await supabase
        .from("calendar_connections")
        .update(updates)
        .eq("id", connectionId)
        .eq("user_id", userId);

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to update" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
