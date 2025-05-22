import { Application, Router } from "oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

const app = new Application();
const router = new Router();

// Initialize Deno KV
const kv = await Deno.openKv();

// Middleware
app.use(oakCors());
app.use(router.routes());
app.use(router.allowedMethods());

// API: Get all restaurants
router.get("/api/restaurants", async (context) => {
  try {
    const restaurants = await kv.get(["restaurants"]);
    context.response.type = "application/json";
    context.response.body = JSON.stringify(restaurants.value || {
      "해장 추천": ["계몽 닭갈비", "sdfs"],
      "가까운곳 추천": ["은성", "버칼", "dasdf"]
    });
  } catch (error) {
    console.error("Error reading restaurants:", error);
    context.response.status = 500;
    context.response.body = { error: "Failed to load restaurants" };
  }
});

// API: Add a new restaurant
router.post("/api/restaurants", async (context) => {
  try {
    const body = await context.request.body().value;
    const { name, theme } = body;

    if (!name || !theme) {
      context.response.status = 400;
      context.response.body = { error: "Name and theme are required" };
      return;
    }

    // Get current restaurants
    const result = await kv.get(["restaurants"]);
    const restaurants = result.value || {
      "해장 추천": [],
      "가까운곳 추천": []
    };

    // Add new restaurant
    if (!restaurants[theme]) {
      restaurants[theme] = [];
    }
    if (!restaurants[theme].includes(name)) {
      restaurants[theme].push(name);
      await kv.set(["restaurants"], restaurants);
    }

    context.response.body = { success: true };
  } catch (error) {
    console.error("Error adding restaurant:", error);
    context.response.status = 500;
    context.response.body = { error: "Failed to save restaurant" };
  }
});

// Serve static files
app.use(async (context) => {
  try {
    await context.send({
      root: `${Deno.cwd()}/public`,
      index: "index.html",
    });
  } catch {
    context.response.status = 404;
    context.response.body = "Not Found";
  }
});

const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`Server running on port ${port}`);
await app.listen({ port });