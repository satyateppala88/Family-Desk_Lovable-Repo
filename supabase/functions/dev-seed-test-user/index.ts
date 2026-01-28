import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const TEST_USER_EMAIL = "testuser@familydesk.dev";
const TEST_USER_PASSWORD = "TestUser123!";
const TEST_USER_NAME = "Test User";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow in non-production environments
    const environment = Deno.env.get("ENVIRONMENT") || "development";
    if (environment === "production") {
      return new Response(
        JSON.stringify({ error: "This endpoint is not available in production" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== Dev Seed Test User Started ===");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if test user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingTestUser = existingUsers?.users?.find(u => u.email === TEST_USER_EMAIL);

    let userId: string;
    
    if (existingTestUser) {
      console.log("Test user already exists, using existing user");
      userId = existingTestUser.id;
    } else {
      // Create auth user with verified email
      console.log("Creating new test user...");
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        email_confirm: true,
        user_metadata: {
          display_name: TEST_USER_NAME,
        },
      });

      if (authError) {
        console.error("Auth user creation error:", authError);
        throw authError;
      }

      userId = authUser.user.id;
      console.log("Created auth user:", userId);
    }

    // Create or update profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        display_name: TEST_USER_NAME,
        onboarding_completed: true,
        terms_accepted_at: new Date().toISOString(),
        region: "IN",
        preferred_language: "en",
      }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    // Create access request (approved)
    await supabaseAdmin
      .from("access_requests")
      .upsert({
        email: TEST_USER_EMAIL,
        full_name: TEST_USER_NAME,
        status: "approved",
        reason: "Development test user",
      }, { onConflict: "email" });

    // Check if household exists
    const { data: existingMembership } = await supabaseAdmin
      .from("household_members")
      .select("household_id")
      .eq("user_id", userId)
      .single();

    let householdId: string;

    if (existingMembership) {
      householdId = existingMembership.household_id;
      console.log("Using existing household:", householdId);
    } else {
      // Create household
      const { data: household, error: householdError } = await supabaseAdmin
        .from("households")
        .insert({
          name: "Test Household",
          created_by: userId,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_completed_by: userId,
        })
        .select()
        .single();

      if (householdError) {
        console.error("Household error:", householdError);
        throw householdError;
      }

      householdId = household.id;
      console.log("Created household:", householdId);

      // Add as household member (admin)
      await supabaseAdmin
        .from("household_members")
        .insert({
          household_id: householdId,
          user_id: userId,
          role: "admin",
        });

      // Add household_admin role
      await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          household_id: householdId,
          role: "household_admin",
        });
    }

    // Seed household preferences
    await supabaseAdmin
      .from("household_preferences")
      .upsert({
        household_id: householdId,
        family_size_adults: 2,
        family_size_children: 1,
        household_type: "nuclear",
        diet_type: "vegetarian",
        cooking_skill_level: "intermediate",
        weekday_cooking_time: "30-45",
        budget_consciousness: "moderate",
        week_start_day: "monday",
      }, { onConflict: "household_id" });

    // Enable all products
    const products = ["tasks", "meals", "grocery", "calendar", "habits"];
    for (const product of products) {
      await supabaseAdmin
        .from("household_enabled_products")
        .upsert({
          household_id: householdId,
          product_name: product,
          enabled_by: userId,
        }, { onConflict: "household_id,product_name" });
    }

    // Seed sample tasks
    const tasks = [
      { title: "Weekly grocery shopping", priority: "medium", due_date: new Date(Date.now() + 86400000).toISOString(), task_status: "today" },
      { title: "Pay electricity bill", priority: "high", due_date: new Date(Date.now() + 3 * 86400000).toISOString(), task_status: "backlog" },
      { title: "Schedule dentist appointment", priority: "low", due_date: null, task_status: "backlog" },
      { title: "Clean out garage", priority: "low", due_date: new Date(Date.now() - 86400000).toISOString(), task_status: "backlog" },
      { title: "Plan birthday party", priority: "high", due_date: new Date(Date.now() + 7 * 86400000).toISOString(), task_status: "today" },
    ];

    for (const task of tasks) {
      await supabaseAdmin.from("tasks").insert({
        household_id: householdId,
        created_by: userId,
        ...task,
      });
    }

    // Seed sample recipes
    const recipes = [
      {
        title: "Dal Tadka",
        description: "Traditional North Indian lentil dish with tempered spices",
        cuisine_type: "North Indian",
        difficulty: "easy",
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        tags: ["vegetarian", "vegan", "gluten-free"],
        ingredients: [
          { name: "Yellow lentils", quantity: "1", unit: "cup" },
          { name: "Onion", quantity: "1", unit: "medium" },
          { name: "Tomatoes", quantity: "2", unit: "medium" },
          { name: "Cumin seeds", quantity: "1", unit: "tsp" },
        ],
        instructions: [
          { step: 1, instruction: "Wash and boil lentils until soft" },
          { step: 2, instruction: "Prepare tempering with cumin, onions, and tomatoes" },
          { step: 3, instruction: "Pour tempering over cooked lentils and mix well" },
        ],
      },
      {
        title: "Chicken Biryani",
        description: "Fragrant South Indian style layered rice dish",
        cuisine_type: "South Indian",
        difficulty: "hard",
        prep_time: 45,
        cook_time: 60,
        servings: 6,
        tags: ["non-vegetarian", "festive"],
        ingredients: [
          { name: "Basmati rice", quantity: "2", unit: "cups" },
          { name: "Chicken", quantity: "500", unit: "g" },
          { name: "Yogurt", quantity: "1", unit: "cup" },
          { name: "Biryani masala", quantity: "2", unit: "tbsp" },
        ],
        instructions: [
          { step: 1, instruction: "Marinate chicken with yogurt and spices" },
          { step: 2, instruction: "Par-boil rice with whole spices" },
          { step: 3, instruction: "Layer rice and chicken, cook on dum" },
        ],
      },
      {
        title: "Palak Paneer",
        description: "Creamy spinach curry with cottage cheese",
        cuisine_type: "North Indian",
        difficulty: "medium",
        prep_time: 20,
        cook_time: 25,
        servings: 4,
        tags: ["vegetarian", "protein-rich"],
        ingredients: [
          { name: "Spinach", quantity: "500", unit: "g" },
          { name: "Paneer", quantity: "200", unit: "g" },
          { name: "Cream", quantity: "2", unit: "tbsp" },
          { name: "Garam masala", quantity: "1", unit: "tsp" },
        ],
        instructions: [
          { step: 1, instruction: "Blanch and puree spinach" },
          { step: 2, instruction: "Fry paneer cubes until golden" },
          { step: 3, instruction: "Cook spinach puree with spices and add paneer" },
        ],
      },
    ];

    for (const recipe of recipes) {
      await supabaseAdmin.from("recipes").insert({
        household_id: householdId,
        created_by: userId,
        ...recipe,
      });
    }

    // Seed pantry items
    const pantryItems = [
      { name: "Rice", quantity: 5, unit: "kg", category: "Grains & Cereals" },
      { name: "Wheat flour", quantity: 2, unit: "kg", category: "Grains & Cereals" },
      { name: "Sugar", quantity: 1, unit: "kg", category: "Baking" },
      { name: "Milk", quantity: 2, unit: "L", category: "Dairy", expiry_date: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0] },
      { name: "Yogurt", quantity: 500, unit: "g", category: "Dairy", expiry_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0] },
      { name: "Onions", quantity: 2, unit: "kg", category: "Vegetables" },
      { name: "Tomatoes", quantity: 1, unit: "kg", category: "Vegetables" },
      { name: "Potatoes", quantity: 3, unit: "kg", category: "Vegetables" },
      { name: "Cooking oil", quantity: 2, unit: "L", category: "Oils & Fats" },
      { name: "Spices variety pack", quantity: 1, unit: "pack", category: "Spices" },
    ];

    for (const item of pantryItems) {
      await supabaseAdmin.from("pantry_items").insert({
        household_id: householdId,
        added_by: userId,
        ...item,
      });
    }

    // Seed habits
    const habits = [
      { name: "Morning meditation", description: "10 minutes of mindful meditation", frequency_type: "daily", target_value: 10, target_unit: "minutes", icon: "brain", color: "#8B5CF6" },
      { name: "Evening walk", description: "30 minutes walk around the neighborhood", frequency_type: "daily", target_value: 30, target_unit: "minutes", icon: "footprints", color: "#10B981" },
      { name: "Read a book", description: "20 minutes of reading", frequency_type: "specific_days", frequency_days: [1, 3, 5], target_value: 20, target_unit: "minutes", icon: "book-open", color: "#F59E0B" },
    ];

    for (const habit of habits) {
      await supabaseAdmin.from("habits").insert({
        household_id: householdId,
        user_id: userId,
        ...habit,
      });
    }

    console.log("=== Dev Seed Test User Completed ===");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test user created successfully",
        credentials: {
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
        },
        userId,
        householdId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("=== Dev Seed Test User Error ===", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
