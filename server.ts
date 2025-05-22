/// <reference lib="deno.unstable" />

import { Application, Router, send } from "oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

// Define the type for your restaurant data
type RestaurantsData = Record<string, string[]>;

const RESTAURANTS_FILE_PATH = "./data/restaurants.json";

// Default structure if the JSON file is not found or is empty
const defaultRestaurantStructure: RestaurantsData = {
  "해장 추천": [],
  "가까운곳 추천": [],
  // You can add other default themes here if needed
  // "다이어트 추천": [],
  // "JI 추천": []
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
app.use(router.routes());
app.use(router.allowedMethods());

// API: Get all restaurants
router.get("/api/restaurants", async (context) => {
  try {
    console.log(`Attempting to GET restaurants from ${RESTAURANTS_FILE_PATH}...`);
    const restaurants = await readRestaurantsFromFile();
    console.log("Data read from file:", restaurants);
    context.response.type = "application/json";
    context.response.body = restaurants;
  } catch (error) {
    const err = error as Error;
    console.error("Error serving restaurants:", err.message, err.stack);
    context.response.status = 500;
    context.response.body = {
      error: "Failed to load restaurants",
      details: err.message,
    };
  }
});

// API: Add a new restaurant
router.post("/api/restaurants", async (context) => {
  try {
    const body = await context.request.body().value;
    const { name, theme } = body as { name: string; theme: string };

    if (!name || !theme) {
      context.response.status = 400;
      context.response.body = { error: "Name and theme are required" };
      return;
    }

    console.log(
      `Attempting to POST to file. Theme: "${theme}", Restaurant: "${name}"`,
    );

    const currentRestaurants = await readRestaurantsFromFile();
    console.log(
      "Current restaurants from file (before update):",
      currentRestaurants,
    );

    if (!currentRestaurants[theme]) {
      console.log(
        `Theme "${theme}" not found in file, initializing as empty array.`,
      );
      currentRestaurants[theme] = [];
    }

    let dataChanged = false;
    if (!currentRestaurants[theme].includes(name)) {
      currentRestaurants[theme].push(name);
      console.log(
        `Added "${name}" to theme "${theme}". New list for theme:`,
        currentRestaurants[theme],
      );
      dataChanged = true;
    } else {
      console.log(
        `Restaurant "${name}" already exists in theme "${theme}". No changes made to data.`,
      );
    }

    if (dataChanged) {
      console.log("Writing updated restaurants data to file:", currentRestaurants);
      await writeRestaurantsToFile(currentRestaurants);
      console.log("File write operation successful.");
    }

    context.response.body = { success: true, dataChanged };
  } catch (error) {
    const err = error as Error;
    console.error("Error adding restaurant to file:", err.message, err.stack);
    context.response.status = 500;
    context.response.body = {
      error: "Failed to save restaurant",
      details: err.message,
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