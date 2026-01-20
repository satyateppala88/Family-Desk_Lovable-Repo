import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CalendarConnection {
  id: string;
  user_id: string;
  google_account_email: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  display_name: string;
  color: string;
  is_visible: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color: string;
  calendarName: string;
  calendarOwner: string;
  calendarId: string;
  location?: string;
  description?: string;
}

// deno-lint-ignore no-explicit-any
async function refreshAccessToken(
  connection: CalendarConnection,
  supabaseClient: any
): Promise<string> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    console.error("Token refresh error:", tokenData);
    throw new Error(`Failed to refresh token: ${tokenData.error}`);
  }

  // Update token in database
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  await supabaseClient
    .from("calendar_connections")
    .update({
      access_token: tokenData.access_token,
      token_expires_at: expiresAt.toISOString(),
    })
    .eq("id", connection.id);

  return tokenData.access_token;
}

async function fetchEventsFromGoogle(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  // First get list of calendars
  const calendarsResponse = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const calendarsData = await calendarsResponse.json();
  
  if (calendarsData.error) {
    console.error("Calendar list error:", calendarsData);
    throw new Error(calendarsData.error.message);
  }

  const allEvents: any[] = [];

  // Fetch events from primary calendar and shared calendars
  const calendarIds = calendarsData.items
    ?.filter((cal: any) => cal.accessRole !== "freeBusyReader")
    .map((cal: any) => cal.id) || ["primary"];

  for (const calendarId of calendarIds.slice(0, 5)) { // Limit to 5 calendars
    try {
      const eventsUrl = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
      );
      eventsUrl.searchParams.set("timeMin", new Date(startDate).toISOString());
      eventsUrl.searchParams.set("timeMax", new Date(endDate).toISOString());
      eventsUrl.searchParams.set("singleEvents", "true");
      eventsUrl.searchParams.set("orderBy", "startTime");
      eventsUrl.searchParams.set("maxResults", "100");

      const eventsResponse = await fetch(eventsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const eventsData = await eventsResponse.json();

      if (eventsData.items) {
        allEvents.push(...eventsData.items);
      }
    } catch (err) {
      console.error(`Error fetching calendar ${calendarId}:`, err);
    }
  }

  return allEvents;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { startDate, endDate, householdId } = body;

    if (!startDate || !endDate || !householdId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all visible calendar connections for the household
    const { data: connections, error: connectionsError } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("household_id", householdId)
      .eq("is_visible", true);

    if (connectionsError) {
      console.error("Connections error:", connectionsError);
      return new Response(JSON.stringify({ error: "Failed to fetch connections" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ events: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allEvents: CalendarEvent[] = [];

    // Fetch events from each connected calendar
    for (const conn of connections) {
      const calConnection = conn as unknown as CalendarConnection;
      try {
        let accessToken = calConnection.access_token;

        // Check if token needs refresh
        const expiresAt = new Date(calConnection.token_expires_at);
        if (expiresAt <= new Date(Date.now() + 60000)) { // 1 minute buffer
          accessToken = await refreshAccessToken(calConnection, supabase);
        }

        const googleEvents = await fetchEventsFromGoogle(accessToken, startDate, endDate);

        // Transform events
        for (const event of googleEvents) {
          if (event.status === "cancelled") continue;

          const isAllDay = !!event.start?.date;
          
          allEvents.push({
            id: event.id,
            title: event.summary || "(No title)",
            start: isAllDay ? event.start.date : event.start.dateTime,
            end: isAllDay ? event.end.date : event.end.dateTime,
            allDay: isAllDay,
            color: calConnection.color,
            calendarName: calConnection.display_name,
            calendarOwner: calConnection.google_account_email,
            calendarId: calConnection.id,
            location: event.location,
            description: event.description,
          });
        }
      } catch (err) {
        console.error(`Error fetching events for ${calConnection.google_account_email}:`, err);
        // Continue with other calendars even if one fails
      }
    }

    // Sort by start time
    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return new Response(JSON.stringify({ events: allEvents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
