/// <reference lib="deno.unstable" />

import { Application, Router, send } from "oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Load environment variables from .env file
import "https://deno.land/std@0.207.0/dotenv/load.ts";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check your .env file.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Replace readRestaurantsFromFile
async function readRestaurantsFromDB(): Promise<RestaurantsData> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("name, theme");

  if (error) {
    console.error("Error reading from Supabase:", error);
    throw error;
  }

  // Transform to your existing format
  const restaurants: RestaurantsData = {};
  data?.forEach(({ name, theme }) => {
    if (!restaurants[theme]) {
      restaurants[theme] = [];
    }
    restaurants[theme].push(name);
  });

  return restaurants;
}
// Helper function to get all themes with their restaurants
async function getAllThemesWithRestaurants(): Promise<Record<string, string[]>> {
  try {
    // First get all themes
    const { data: themes, error: themesError } = await supabase
      .from('themes')
      .select('id, name');

    if (themesError) throw themesError;

    // If no themes exist yet, return empty object
    if (!themes || themes.length === 0) {
      return {};
    }

    // Get all restaurants with their theme names
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('name, themes!inner(name)');

    if (restaurantsError) throw restaurantsError;

    // Transform to the expected format
    const result: Record<string, string[]> = {};
    
    // Initialize all themes
    themes.forEach(theme => {
      result[theme.name] = [];
    });

    // Add restaurants to their themes
    if (restaurants) {
      restaurants.forEach(restaurant => {
        const themeName = (restaurant.themes as { name: string })?.name;
        if (themeName && result[themeName]) {
          result[themeName].push(restaurant.name);
        }
      });
    }

    return result;
  } catch (error) {
    console.error('Error in getAllThemesWithRestaurants:', error);
    throw error;
  }
}
// Replace writeRestaurantsToFile
async function saveRestaurantToDB(name: string, theme: string): Promise<void> {
  const { error } = await supabase
    .from("restaurants")
    .insert([{ name, theme }]);

  if (error) {
    console.error("Error saving to Supabase:", error);
    throw error;
  }
}


// Define the type for your restaurant data
type RestaurantsData = Record<string, string[]>;

const RESTAURANTS_FILE_PATH = "./data/restaurants.json";

// Default structure if the JSON file is not found or is empty
const defaultRestaurantStructure: RestaurantsData = {
  "해장 추천": [],
  "가까운곳 추천": [],
  "도전 추천": [],
  "다이어트 추천": [],
  "JSP 추천": []
};

async function readRestaurantsFromFile(): Promise<RestaurantsData> {
  try {
    const fileContent = await Deno.readTextFile(RESTAURANTS_FILE_PATH);
    const jsonData = JSON.parse(fileContent) as RestaurantsData;
    // Ensure all default themes exist if the file is partially empty or new
    return { ...defaultRestaurantStructure, ...jsonData };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.warn(
        `${RESTAURANTS_FILE_PATH} not found. Initializing with default structure.`,
      );
      // Create the file with default content if it doesn't exist
      await writeRestaurantsToFile(defaultRestaurantStructure);
      return defaultRestaurantStructure;
    }
    console.error(
      `Error reading or parsing ${RESTAURANTS_FILE_PATH}:`,
      error,
    );
    // If parsing fails or other read error, return default to prevent crashing
    // Or rethrow if you want the server to fail hard on this
    return defaultRestaurantStructure;
  }
}

async function writeRestaurantsToFile(data: RestaurantsData): Promise<void> {
  try {
    const jsonDataString = JSON.stringify(data, null, 2); // Pretty print JSON
    await Deno.writeTextFile(RESTAURANTS_FILE_PATH, jsonDataString);
    console.log(`Successfully wrote data to ${RESTAURANTS_FILE_PATH}`);
  } catch (error) {
    console.error(`Error writing to ${RESTAURANTS_FILE_PATH}:`, error);
    throw error; // Re-throw to be handled by the endpoint
  }
}

const app = new Application();
const router = new Router();

// Middleware
app.use(oakCors()); // Enable CORS for all routes

// NEW: Middleware to serve main.js from the root
app.use(async (context, next) => {
  if (context.request.url.pathname === "/main.js") {
    try {
      await send(context, context.request.url.pathname, {
        root: `${Deno.cwd()}`, // Serve from project root
        // index: "main.js", // Not strictly necessary for a direct file path but good practice
      });
    } catch {
      // If main.js is not found in root, or other error, pass to next middleware
      await next();
    }
  } else {
    // If not requesting /main.js, pass to the next middleware
    await next();
  }
});

// Existing router
app.use(router.routes());
app.use(router.allowedMethods());

// API: Get all restaurants
router.get("/api/restaurants", async (context) => {
  try {
    const restaurants = await getAllThemesWithRestaurants();
    context.response.body = restaurants;
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    context.response.status = 500;
    context.response.body = { error: "Failed to load restaurants" };
  }
});


// Update the POST /api/restaurants endpoint
router.post("/api/restaurants", async (context) => {
  try {
    const body = await context.request.body().value;
    const { name, theme } = body as { name: string; theme: string };

    if (!name || !theme) {
      context.response.status = 400;
      context.response.body = { error: "Name and theme are required" };
      return;
    }

    // First, try to get the theme
    let { data: themeData, error: themeError } = await supabase
      .from('themes')
      .select('id')
      .eq('name', theme)
      .maybeSingle();

    // If theme doesn't exist, create it
    if (!themeData) {
      const { data: newTheme, error: createThemeError } = await supabase
        .from('themes')
        .insert({ name: theme })
        .select()
        .single();

      if (createThemeError) throw createThemeError;
      themeData = newTheme;
    } else if (themeError) {
      throw themeError;
    }

    // Now add the restaurant with the theme's ID
    const { error: restaurantError } = await supabase
      .from('restaurants')
      .insert([{ 
        name, 
        theme_id: themeData.id 
      }]);

    if (restaurantError) throw restaurantError;

    context.response.body = { 
      success: true, 
      dataChanged: true 
    };
  } catch (error) {
    console.error("Error adding restaurant:", error);
    context.response.status = 500;
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unknown error occurred';
      
    context.response.body = { 
      error: "Failed to save restaurant",
      details: errorMessage
    };
  }
});

// Serve static files from the 'public' directory
app.use(async (context, next) => {
  try {
    await send(context, context.request.url.pathname, {
      root: `${Deno.cwd()}/public`,
      index: "index.html",
    });
  } catch (_e) {
    // If file not found, let Oak handle it (usually results in 404)
    // You could also specifically serve index.html for SPA fallbacks here if needed
    await next();
  }
});

const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });