import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/hooks/useHousehold";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";

interface PreferencesData {
  // Step 1
  family_size_adults: number;
  family_size_children: number;
  household_type: string;
  
  // Step 2
  diet_type: string;
  food_allergies: string[];
  religious_restrictions: string;
  spice_level: string;
  regional_cuisines: string[];
  
  // Step 3
  cooking_skill_level: string;
  weekday_cooking_time: string;
  preferred_meal_types: string[];
  pantry_size: string;
  shopping_frequency: string;
  
  // Step 4
  household_concerns: string[];
  work_schedule: string;
  preferred_task_time: string;
  festival_importance: string;
  
  // Step 5
  monthly_grocery_budget: string;
  shopping_locations: string[];
  organic_preference: string;
  budget_consciousness: string;
}

export const UserPreferencesOnboarding = () => {
  const { user } = useAuth();
  const { householdId, isLoading: householdLoading } = useHousehold();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [preferences, setPreferences] = useState<PreferencesData>({
    family_size_adults: 2,
    family_size_children: 0,
    household_type: "nuclear",
    diet_type: "vegetarian",
    food_allergies: [],
    religious_restrictions: "none",
    spice_level: "medium",
    regional_cuisines: [],
    cooking_skill_level: "intermediate",
    weekday_cooking_time: "30_to_60",
    preferred_meal_types: [],
    pantry_size: "medium",
    shopping_frequency: "weekly",
    household_concerns: [],
    work_schedule: "both_working",
    preferred_task_time: "evening",
    festival_importance: "somewhat",
    monthly_grocery_budget: "5000_to_10000",
    shopping_locations: [],
    organic_preference: "sometimes",
    budget_consciousness: "somewhat",
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  // Fetch existing preferences when editing
  useEffect(() => {
    const fetchExistingPreferences = async () => {
      if (!householdId) return;
      
      const { data, error } = await supabase
        .from("household_preferences")
        .select("*")
        .eq("household_id", householdId)
        .maybeSingle();
      
      if (data && !error) {
        // Merge fetched preferences with current state
        setPreferences(prev => ({
          ...prev,
          family_size_adults: data.family_size_adults ?? prev.family_size_adults,
          family_size_children: data.family_size_children ?? prev.family_size_children,
          household_type: data.household_type || prev.household_type,
          diet_type: data.diet_type || prev.diet_type,
          food_allergies: data.food_allergies || [],
          religious_restrictions: data.religious_restrictions || prev.religious_restrictions,
          spice_level: data.spice_level || prev.spice_level,
          regional_cuisines: data.regional_cuisines || [],
          cooking_skill_level: data.cooking_skill_level || prev.cooking_skill_level,
          weekday_cooking_time: data.weekday_cooking_time || prev.weekday_cooking_time,
          preferred_meal_types: data.preferred_meal_types || [],
          pantry_size: data.pantry_size || prev.pantry_size,
          shopping_frequency: data.shopping_frequency || prev.shopping_frequency,
          household_concerns: data.household_concerns || [],
          work_schedule: data.work_schedule || prev.work_schedule,
          preferred_task_time: data.preferred_task_time || prev.preferred_task_time,
          festival_importance: data.festival_importance || prev.festival_importance,
          monthly_grocery_budget: data.monthly_grocery_budget || prev.monthly_grocery_budget,
          shopping_locations: data.shopping_locations || [],
          organic_preference: data.organic_preference || prev.organic_preference,
          budget_consciousness: data.budget_consciousness || prev.budget_consciousness,
        }));
      }
    };
    
    fetchExistingPreferences();
  }, [householdId]);

  useEffect(() => {
    if (!householdLoading && !householdId) {
      navigate("/household-setup");
    }
  }, [householdId, householdLoading, navigate]);

  if (householdLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Loading your household...</p>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCheckboxChange = (field: keyof PreferencesData, value: string) => {
    const currentValues = preferences[field] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setPreferences({ ...preferences, [field]: newValues });
  };

  const handleComplete = async () => {
    if (!householdId || !user) return;

    try {
      // Save preferences
      const { error: prefsError } = await supabase
        .from("household_preferences")
        .upsert({
          household_id: householdId,
          ...preferences,
        });

      if (prefsError) throw prefsError;

      // Update onboarding progress
      const { error: progressError } = await supabase
        .from("user_onboarding_progress")
        .upsert({
          user_id: user.id,
          current_step: totalSteps,
          completed_steps: ["1", "2", "3", "4", "5"],
          preferences_completed: true,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (progressError) throw progressError;

      toast.success("Preferences saved! Let's explore your dashboard.");
      navigate("/");
    } catch (error: any) {
      toast.error("Failed to save preferences: " + error.message);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label>Number of Adults</Label>
              <Input
                type="number"
                min="1"
                value={preferences.family_size_adults}
                onChange={(e) => setPreferences({ ...preferences, family_size_adults: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Number of Children</Label>
              <Input
                type="number"
                min="0"
                value={preferences.family_size_children}
                onChange={(e) => setPreferences({ ...preferences, family_size_children: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Household Type</Label>
              <RadioGroup value={preferences.household_type} onValueChange={(v) => setPreferences({ ...preferences, household_type: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nuclear" id="nuclear" />
                  <Label htmlFor="nuclear">Nuclear Family</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="joint" id="joint" />
                  <Label htmlFor="joint">Joint Family</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single">Single</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label>Diet Type</Label>
              <RadioGroup value={preferences.diet_type} onValueChange={(v) => setPreferences({ ...preferences, diet_type: v })}>
                {["vegetarian", "non_vegetarian", "eggetarian", "vegan", "jain"].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <RadioGroupItem value={type} id={type} />
                    <Label htmlFor={type} className="capitalize">{type.replace("_", " ")}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Food Allergies (Select all that apply)</Label>
              <div className="space-y-2 mt-2">
                {["Dairy", "Nuts", "Gluten", "Seafood", "Eggs", "Soy"].map((allergy) => (
                  <div key={allergy} className="flex items-center space-x-2">
                    <Checkbox
                      checked={preferences.food_allergies.includes(allergy)}
                      onCheckedChange={() => handleCheckboxChange("food_allergies", allergy)}
                    />
                    <Label>{allergy}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Religious Dietary Restrictions</Label>
              <RadioGroup value={preferences.religious_restrictions} onValueChange={(v) => setPreferences({ ...preferences, religious_restrictions: v })}>
                {["none", "hindu", "muslim", "jain"].map((restriction) => (
                  <div key={restriction} className="flex items-center space-x-2">
                    <RadioGroupItem value={restriction} id={`religion-${restriction}`} />
                    <Label htmlFor={`religion-${restriction}`} className="capitalize">{restriction}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Spice Level</Label>
              <RadioGroup value={preferences.spice_level} onValueChange={(v) => setPreferences({ ...preferences, spice_level: v })}>
                {["mild", "medium", "spicy", "very_spicy"].map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <RadioGroupItem value={level} id={`spice-${level}`} />
                    <Label htmlFor={`spice-${level}`} className="capitalize">{level.replace("_", " ")}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Regional Cuisines (Select favorites)</Label>
              <div className="space-y-2 mt-2">
                {["North Indian", "South Indian", "East Indian", "West Indian", "International"].map((cuisine) => (
                  <div key={cuisine} className="flex items-center space-x-2">
                    <Checkbox
                      checked={preferences.regional_cuisines.includes(cuisine)}
                      onCheckedChange={() => handleCheckboxChange("regional_cuisines", cuisine)}
                    />
                    <Label>{cuisine}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label>Cooking Skill Level</Label>
              <RadioGroup value={preferences.cooking_skill_level} onValueChange={(v) => setPreferences({ ...preferences, cooking_skill_level: v })}>
                {["beginner", "intermediate", "expert"].map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <RadioGroupItem value={level} id={`skill-${level}`} />
                    <Label htmlFor={`skill-${level}`} className="capitalize">{level}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Available Cooking Time (Weekdays)</Label>
              <RadioGroup value={preferences.weekday_cooking_time} onValueChange={(v) => setPreferences({ ...preferences, weekday_cooking_time: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="less_than_30" id="time1" />
                  <Label htmlFor="time1">Less than 30 minutes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="30_to_60" id="time2" />
                  <Label htmlFor="time2">30-60 minutes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="more_than_60" id="time3" />
                  <Label htmlFor="time3">More than 60 minutes</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label>Preferred Meal Types</Label>
              <div className="space-y-2 mt-2">
                {["Quick weekday meals", "Traditional weekend meals", "Festival special recipes", "Healthy/Diet meals"].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      checked={preferences.preferred_meal_types.includes(type)}
                      onCheckedChange={() => handleCheckboxChange("preferred_meal_types", type)}
                    />
                    <Label>{type}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Pantry Size</Label>
              <RadioGroup value={preferences.pantry_size} onValueChange={(v) => setPreferences({ ...preferences, pantry_size: v })}>
                {["small", "medium", "large"].map((size) => (
                  <div key={size} className="flex items-center space-x-2">
                    <RadioGroupItem value={size} id={`pantry-${size}`} />
                    <Label htmlFor={`pantry-${size}`} className="capitalize">{size}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Shopping Frequency</Label>
              <RadioGroup value={preferences.shopping_frequency} onValueChange={(v) => setPreferences({ ...preferences, shopping_frequency: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="freq1" />
                  <Label htmlFor="freq1">Daily</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2_3_per_week" id="freq2" />
                  <Label htmlFor="freq2">2-3 times per week</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="freq3" />
                  <Label htmlFor="freq3">Weekly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bi_weekly" id="freq4" />
                  <Label htmlFor="freq4">Bi-weekly</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label>Primary Household Concerns</Label>
              <div className="space-y-2 mt-2">
                {["Time management", "Budget optimization", "Health & nutrition", "Child care", "Elder care", "Pet care"].map((concern) => (
                  <div key={concern} className="flex items-center space-x-2">
                    <Checkbox
                      checked={preferences.household_concerns.includes(concern)}
                      onCheckedChange={() => handleCheckboxChange("household_concerns", concern)}
                    />
                    <Label>{concern}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Work Schedule</Label>
              <RadioGroup value={preferences.work_schedule} onValueChange={(v) => setPreferences({ ...preferences, work_schedule: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both_working" id="work1" />
                  <Label htmlFor="work1">Both working</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one_working" id="work2" />
                  <Label htmlFor="work2">One working</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="retired" id="work3" />
                  <Label htmlFor="work3">Retired</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="students" id="work4" />
                  <Label htmlFor="work4">Students</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label>Preferred Task Time</Label>
              <RadioGroup value={preferences.preferred_task_time} onValueChange={(v) => setPreferences({ ...preferences, preferred_task_time: v })}>
                {["morning", "afternoon", "evening", "flexible"].map((time) => (
                  <div key={time} className="flex items-center space-x-2">
                    <RadioGroupItem value={time} id={`tasktime-${time}`} />
                    <Label htmlFor={`tasktime-${time}`} className="capitalize">{time}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Festival Celebrations Importance</Label>
              <RadioGroup value={preferences.festival_importance} onValueChange={(v) => setPreferences({ ...preferences, festival_importance: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="very_important" id="fest1" />
                  <Label htmlFor="fest1">Very important</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="somewhat" id="fest2" />
                  <Label htmlFor="fest2">Somewhat important</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_important" id="fest3" />
                  <Label htmlFor="fest3">Not important</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label>Monthly Grocery Budget</Label>
              <RadioGroup value={preferences.monthly_grocery_budget} onValueChange={(v) => setPreferences({ ...preferences, monthly_grocery_budget: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="under_5000" id="budget1" />
                  <Label htmlFor="budget1">Under ₹5,000</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5000_to_10000" id="budget2" />
                  <Label htmlFor="budget2">₹5,000 - ₹10,000</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="10000_to_20000" id="budget3" />
                  <Label htmlFor="budget3">₹10,000 - ₹20,000</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="above_20000" id="budget4" />
                  <Label htmlFor="budget4">Above ₹20,000</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label>Preferred Shopping Locations</Label>
              <div className="space-y-2 mt-2">
                {["Local markets/Kirana stores", "Supermarkets (DMart, More, Big Bazaar)", "Online (BigBasket, Blinkit, Zepto)", "Wholesale markets"].map((location) => (
                  <div key={location} className="flex items-center space-x-2">
                    <Checkbox
                      checked={preferences.shopping_locations.includes(location)}
                      onCheckedChange={() => handleCheckboxChange("shopping_locations", location)}
                    />
                    <Label>{location}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Organic/Premium Products Preference</Label>
              <RadioGroup value={preferences.organic_preference} onValueChange={(v) => setPreferences({ ...preferences, organic_preference: v })}>
                {["always", "sometimes", "rarely", "never"].map((pref) => (
                  <div key={pref} className="flex items-center space-x-2">
                    <RadioGroupItem value={pref} id={`organic-${pref}`} />
                    <Label htmlFor={`organic-${pref}`} className="capitalize">{pref}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Budget Consciousness</Label>
              <RadioGroup value={preferences.budget_consciousness} onValueChange={(v) => setPreferences({ ...preferences, budget_consciousness: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="very_conscious" id="conscious1" />
                  <Label htmlFor="conscious1">Very conscious</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="somewhat" id="conscious2" />
                  <Label htmlFor="conscious2">Somewhat conscious</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_much" id="conscious3" />
                  <Label htmlFor="conscious3">Not much</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = [
    "Household Basics",
    "Dietary Preferences",
    "Cooking & Meal Planning",
    "Household Routine",
    "Budget & Shopping",
  ];

  const stepDescriptions = [
    "Tell us about your family",
    "Help us understand your dietary needs",
    "Share your cooking preferences",
    "What are your household priorities?",
    "Let's plan your budget",
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <CardTitle className="text-2xl">{stepTitles[currentStep - 1]}</CardTitle>
          <CardDescription>{stepDescriptions[currentStep - 1]}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {renderStep()}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {currentStep < totalSteps ? (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleComplete}>
                  <Check className="h-4 w-4 mr-2" />
                  Complete Setup
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
