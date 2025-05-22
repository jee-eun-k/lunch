import { Application, Router } from "oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

const app = new Application();
app.use(oakCors()); // Enable CORS for all routes
const router = new Router();
const DATA_FILE = "./data/restaurants.json";

// Ensure data directory exists
try {
  await Deno.mkdir("./data", { recursive: true });
} catch (err) {
  if (!(err instanceof Deno.errors.AlreadyExists)) {
    console.error("Failed to create data directory:", err);
    // Remove Deno.exit(1) and just log the error
  }
}

// Initialize data file if it doesn't exist
try {
  await Deno.stat(DATA_FILE);
} catch {
  const defaultData = {
    "랜덤 추천": [],
    "해장 추천": [],
    "가까운곳 추천": [],
  };
  await Deno.writeTextFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
}

// Middleware
app.use(oakCors());
app.use(router.routes());
app.use(router.allowedMethods());

// Serve static files from the public directory
app.use(async (context) => {
  try {
    await context.send({
      root: "./public",
      index: "index.html",
    });
  } catch {
    context.response.status = 404;
    context.response.body = "Not Found";
  }
});

// API: Add a new restaurant
router.post("/api/restaurants", async (context) => {
  try {
    console.log("Received request to add restaurant");
    const body = await context.request.body().value;
    console.log("Request body:", body);
    
    const { name, theme } = body;
    console.log("Parsed name and theme:", { name, theme });

    if (!name || !theme) {
      console.log("Missing name or theme");
      context.response.status = 400;
      context.response.body = { error: "Name and theme are required" };
      return;
    }

    console.log("Reading data file...");
    const data = JSON.parse(await Deno.readTextFile(DATA_FILE));
    console.log("Current data:", data);

    if (!data[theme]) {
      console.log(`Creating new theme: ${theme}`);
      data[theme] = [];
    } else if (data[theme].includes(name)) {
      console.log(`Restaurant "${name}" already exists in theme "${theme}"`);
      context.response.status = 400;
      context.response.body = { error: "This restaurant already exists in the selected theme" };
      return;
    }

    console.log(`Adding "${name}" to theme "${theme}"`);
    data[theme].push(name);
    
    console.log("Writing updated data to file...");
    await Deno.writeTextFile(DATA_FILE, JSON.stringify(data, null, 2));
    console.log("Successfully updated data file");

    context.response.body = { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Error in POST /api/restaurants:", error);
    context.response.status = 500;
    context.response.body = { 
      error: "Failed to save restaurant",
      details: errorMessage 
    };
  }
});

// API: Get all restaurants
router.get("/api/restaurants", async (context) => {
  try {
    console.log("Fetching restaurants data...");
    const data = await Deno.readTextFile(DATA_FILE);
    console.log("Successfully read restaurants data");
    
    // Set proper content type
    context.response.type = "application/json";
    context.response.body = data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
    console.error("Error reading restaurants data:", error);
    context.response.status = 500;
    context.response.body = { 
      error: "Failed to load restaurants",
      details: errorMessage 
    };
  }
});
const port = parseInt(Deno.env.get("PORT") || "8000");
await app.listen({ port });
