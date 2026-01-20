import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Create Household Request Started ===");
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No Authorization header found");
      throw new Error("Missing authorization header");
    }

    console.log("Authorization header present:", authHeader.substring(0, 20) + "...");

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("Failed to verify user:", userError);
      throw new Error("Invalid authorization token");
    }

    console.log("User verified successfully:", user.id);

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
