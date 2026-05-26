import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Input validation schema
const CreateHouseholdSchema = z.object({
  householdName: z.string()
    .trim()
    .min(1, "Household name cannot be empty")
    .max(100, "Household name must be less than 100 characters")
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Create Household Request Started ===");
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("No Authorization header found");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log("Authorization header present");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's auth header for JWT verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the JWT token and get user using the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      console.error("Failed to verify user:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log("User verified successfully:", user.id);

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = CreateHouseholdSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input",
          details: validationResult.error.errors 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const { householdName } = validationResult.data;
    console.log("Creating household:", householdName, "for user:", user.id);

    // Create household
    const { data: household, error: householdError } = await supabaseAdmin
      .from("households")
      .insert({
        name: householdName,
        created_by: user.id,
      })
      .select()
      .single();

    if (householdError) {
      console.error("Household creation error:", householdError);
      throw householdError;
    }

    console.log("Household created:", household.id);

    // Add creator as admin member
    const { error: memberError } = await supabaseAdmin
      .from("household_members")
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: "admin",
      });

    if (memberError) {
      console.error("Member creation error:", memberError);
      throw memberError;
    }

    console.log("Member added successfully");

    // Add admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: user.id,
        household_id: household.id,
        role: "household_admin",
      });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      throw roleError;
    }

    console.log("Role assigned successfully");
    console.log("=== Create Household Request Completed Successfully ===");

    return new Response(
      JSON.stringify({ 
        success: true,
        household: household 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("=== Create Household Error ===");
    console.error("Error details:", error);
    
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unexpected error occurred",
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
