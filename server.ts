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

// API: Get all restaurants
router.get("/api/restaurants", async (context) => {
  try {
    const data = await Deno.readTextFile(DATA_FILE);
    context.response.body = data;
  } catch (error) {
    console.error("Error reading data:", error);
    context.response.status = 500;
    context.response.body = { error: "Failed to load data" };
  }
});

// API: Add a new restaurant
router.post("/api/restaurants", async (context) => {
  try {
    const { name, theme } = await context.request.body().value;

    if (!name || !theme) {
      context.response.status = 400;
      context.response.body = { error: "Name and theme are required" };
      return;
    }

    const data = JSON.parse(await Deno.readTextFile(DATA_FILE));

    if (!data[theme]) {
      data[theme] = [];
    } else if (data[theme].includes(name)) {
      context.response.status = 400;
      context.response.body = {
        error: "This restaurant already exists in the selected theme",
      };
      return;
    }

    data[theme].push(name);
    await Deno.writeTextFile(DATA_FILE, JSON.stringify(data, null, 2));

    context.response.body = { success: true };
  } catch (error) {
    console.error("Error saving restaurant:", error);
    context.response.status = 500;
    context.response.body = { error: "Failed to save restaurant" };
  }
});
const port = parseInt(Deno.env.get("PORT") || "8000");
await app.listen({ port });
