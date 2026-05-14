import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";

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

// Expand a manual event into all occurrences within [windowStart, windowEnd)
// based on its repeat_type.
function expandRecurrence(
  ev: { start_at: string; end_at: string; repeat_type?: string | null },
  windowStart: Date,
  windowEnd: Date,
): { start: Date; end: Date }[] {
  const baseStart = new Date(ev.start_at);
  const baseEnd = new Date(ev.end_at);
  const duration = baseEnd.getTime() - baseStart.getTime();
  const repeat = (ev.repeat_type || "none").toLowerCase();

  if (repeat === "none") {
    if (baseStart >= windowStart && baseStart < windowEnd) {
      return [{ start: baseStart, end: baseEnd }];
    }
    return [];
  }

  const out: { start: Date; end: Date }[] = [];
  // Cap iterations defensively (e.g. 5 years of daily = ~1825 entries)
  const MAX_ITER = 2000;

  if (repeat === "daily") {
    let cur = new Date(Math.max(baseStart.getTime(), windowStart.getTime()));
    // Align to baseStart time-of-day
    cur.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
    if (cur < windowStart) cur = new Date(cur.getTime() + 86400000);
    let i = 0;
    while (cur < windowEnd && i++ < MAX_ITER) {
      if (cur >= baseStart) out.push({ start: new Date(cur), end: new Date(cur.getTime() + duration) });
      cur = new Date(cur.getTime() + 86400000);
    }
  } else if (repeat === "weekly") {
    let cur = new Date(baseStart);
    while (cur < windowStart && (cur = new Date(cur.getTime() + 7 * 86400000))) {
      if (cur.getTime() > windowEnd.getTime() + 365 * 86400000) break;
    }
    let i = 0;
    while (cur < windowEnd && i++ < MAX_ITER) {
      if (cur >= baseStart) out.push({ start: new Date(cur), end: new Date(cur.getTime() + duration) });
      cur = new Date(cur.getTime() + 7 * 86400000);
    }
  } else if (repeat === "monthly") {
    const day = baseStart.getDate();
    let y = Math.max(baseStart.getFullYear(), windowStart.getFullYear());
    let m = baseStart.getFullYear() === y ? baseStart.getMonth() : 0;
    if (y === windowStart.getFullYear()) m = Math.max(m, windowStart.getMonth());
    let i = 0;
    while (i++ < MAX_ITER) {
      const lastDay = new Date(y, m + 1, 0).getDate();
      const d = Math.min(day, lastDay);
      const occ = new Date(y, m, d, baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds());
      if (occ >= windowEnd) break;
      if (occ >= baseStart && occ >= windowStart) {
        out.push({ start: occ, end: new Date(occ.getTime() + duration) });
      }
      m++;
      if (m > 11) { m = 0; y++; }
    }
  } else if (repeat === "yearly") {
    const month = baseStart.getMonth();
    const day = baseStart.getDate();
    let y = Math.max(baseStart.getFullYear(), windowStart.getFullYear());
    let i = 0;
    while (i++ < MAX_ITER) {
      const occ = new Date(y, month, day, baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds());
      if (occ >= windowEnd) break;
      if (occ >= baseStart && occ >= windowStart) {
        out.push({ start: occ, end: new Date(occ.getTime() + duration) });
      }
      y++;
    }
  }

  return out;
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
  console.log("Fetching calendar list from Google...");
  const calendarsResponse = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const calendarsData = await calendarsResponse.json();
  
  if (calendarsData.error) {
    console.error("Calendar list error:", calendarsData.error);
    throw new Error(calendarsData.error.message);
  }

  console.log(`Found ${calendarsData.items?.length || 0} calendars in Google account`);

  const allEvents: any[] = [];

  // Fetch events from primary calendar and shared calendars
  // Prioritize primary calendar first, then owned calendars, then others
  const calendars = calendarsData.items
    ?.filter((cal: any) => cal.accessRole !== "freeBusyReader")
    .sort((a: any, b: any) => {
      // Primary calendar first
      if (a.primary) return -1;
      if (b.primary) return 1;
      // Then owned calendars
      if (a.accessRole === 'owner' && b.accessRole !== 'owner') return -1;
      if (b.accessRole === 'owner' && a.accessRole !== 'owner') return 1;
      return 0;
    }) || [];
  
  const calendarIds = calendars.map((cal: any) => cal.id);
  if (calendarIds.length === 0) {
    calendarIds.push("primary");
  }

  console.log(`Fetching events from ${calendarIds.length} calendars`);
  console.log(`Calendar order: ${calendarIds.slice(0, 3).join(', ')}...`);

  for (const calendarId of calendarIds) { // Fetch from all calendars
    try {
      const eventsUrl = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
      );
      eventsUrl.searchParams.set("timeMin", new Date(startDate).toISOString());
      eventsUrl.searchParams.set("timeMax", new Date(endDate).toISOString());
      eventsUrl.searchParams.set("singleEvents", "true");
      eventsUrl.searchParams.set("orderBy", "startTime");
      eventsUrl.searchParams.set("maxResults", "100");

      console.log(`Fetching events for calendar: ${calendarId}`);
      const eventsResponse = await fetch(eventsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const eventsData = await eventsResponse.json();
      
      if (eventsData.error) {
        console.error(`Error fetching calendar ${calendarId}:`, eventsData.error);
        continue;
      }

      console.log(`Calendar ${calendarId}: found ${eventsData.items?.length || 0} events`);
      
      if (eventsData.items) {
        allEvents.push(...eventsData.items);
      }
    } catch (err) {
      console.error(`Error fetching calendar ${calendarId}:`, err);
    }
  }

  console.log(`Total events fetched from Google: ${allEvents.length}`);
  return allEvents;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  
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

    console.log(`Found ${connections?.length || 0} visible connections for household ${householdId}`);

    const allEvents: CalendarEvent[] = [];

    const windowStart = new Date(startDate);
    const windowEnd = new Date(endDate);

    // Fetch manual (household-created) events: in-window OR any recurring
    try {
      const { data: manualEvents, error: manualErr } = await supabase
        .from("manual_calendar_events")
        .select("*")
        .eq("household_id", householdId)
        .or(
          `and(start_at.gte.${windowStart.toISOString()},start_at.lt.${windowEnd.toISOString()}),repeat_type.neq.none`
        );

      if (manualErr) {
        console.error("Manual events fetch error:", manualErr);
      } else if (manualEvents) {
        for (const ev of manualEvents as any[]) {
          const occurrences = expandRecurrence(ev, windowStart, windowEnd);
          for (const occ of occurrences) {
            allEvents.push({
              id: `manual-${ev.id}-${occ.start.toISOString().slice(0,10)}`,
              manualEventId: ev.id,
              title: ev.title,
              start: occ.start.toISOString(),
              end: occ.end.toISOString(),
              allDay: ev.all_day,
              color: "#0F6E56",
              calendarName: "Family events",
              calendarOwner: "household",
              calendarId: "manual",
              location: ev.location ?? undefined,
              description: ev.description ?? undefined,
            });
          }
        }
      }
    } catch (err) {
      console.error("Manual events fetch failed:", err);
    }

    // Fetch system events (festivals & national holidays) for the same range
    try {
      const startDay = windowStart.toISOString().slice(0, 10);
      const endDay = windowEnd.toISOString().slice(0, 10);
      const { data: sysEvents, error: sysErr } = await supabase
        .from("system_calendar_events")
        .select("*")
        .gte("event_date", startDay)
        .lt("event_date", endDay);

      if (sysErr) {
        console.error("System events fetch error:", sysErr);
      } else if (sysEvents) {
        for (const s of sysEvents as any[]) {
          allEvents.push({
            id: `system-${s.id}`,
            title: s.name,
            start: `${s.event_date}T00:00:00.000Z`,
            end: `${s.event_date}T23:59:59.000Z`,
            allDay: true,
            color: s.kind === "festival" ? "#F97316" : "#3B82F6",
            calendarName: s.kind === "festival" ? "Festivals" : "National holidays",
            calendarOwner: "system",
            calendarId: "system",
            description: s.kind === "festival" ? "Festival" : "National holiday",
          });
        }
      }
    } catch (err) {
      console.error("System events fetch failed:", err);
    }

    if (!connections || connections.length === 0) {
      console.log("No Google connections; returning manual + system events only");
      allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      return new Response(JSON.stringify({ events: allEvents }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch events from each connected calendar
    for (const conn of connections) {
      const calConnection = conn as unknown as CalendarConnection;
      console.log(`Processing connection for: ${calConnection.google_account_email}`);
      console.log(`Token expires at: ${calConnection.token_expires_at}`);
      
      try {
        let accessToken = calConnection.access_token;

        // Check if token needs refresh
        const expiresAt = new Date(calConnection.token_expires_at);
        const now = new Date();
        console.log(`Token expiry check - expires: ${expiresAt.toISOString()}, now: ${now.toISOString()}, needs refresh: ${expiresAt <= new Date(Date.now() + 60000)}`);
        
        if (expiresAt <= new Date(Date.now() + 60000)) { // 1 minute buffer
          console.log("Token expired or expiring soon, refreshing...");
          accessToken = await refreshAccessToken(calConnection, supabase);
          console.log("Token refreshed successfully");
        }

        console.log("Calling fetchEventsFromGoogle...");
        const googleEvents = await fetchEventsFromGoogle(accessToken, startDate, endDate);
        console.log(`Got ${googleEvents.length} events from Google`);

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
        console.log(`Processed ${googleEvents.length} events for ${calConnection.google_account_email}`);
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
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
