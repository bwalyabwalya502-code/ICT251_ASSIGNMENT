require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// DATABASE
// --------------------------------------------------
const db = new Database(path.join(__dirname, "recipes.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    prep_time INTEGER NOT NULL DEFAULT 0,
    cook_time INTEGER NOT NULL DEFAULT 0,
    servings INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add missing columns if an older database already exists.
const existingColumns = db
  .prepare("PRAGMA table_info(recipes)")
  .all()
  .map((column) => column.name);

const requiredColumns = {
  ingredients: "TEXT NOT NULL DEFAULT ''",
  description: "TEXT NOT NULL DEFAULT ''",
  category: "TEXT NOT NULL DEFAULT 'Other'",
  prep_time: "INTEGER NOT NULL DEFAULT 0",
  cook_time: "INTEGER NOT NULL DEFAULT 0",
  servings: "INTEGER NOT NULL DEFAULT 1",
  created_at: "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
  updated_at: "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"
};

for (const [column, definition] of Object.entries(requiredColumns)) {
  if (!existingColumns.includes(column)) {
    db.exec(`ALTER TABLE recipes ADD COLUMN ${column} ${definition}`);
  }
}

// Seed at least 10 records when the table is empty.
const recipeCount = db
  .prepare("SELECT COUNT(*) AS count FROM recipes")
  .get().count;

if (recipeCount === 0) {
  const insertRecipe = db.prepare(`
    INSERT INTO recipes
      (title, ingredients, description, category,
       prep_time, cook_time, servings)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleRecipes = [
    ["Pancakes", "Flour, eggs, milk, sugar", "Mix ingredients and fry until golden.", "Breakfast", 10, 15, 4],
    ["Vegetable Omelette", "Eggs, tomatoes, onion, salt", "Beat eggs, add vegetables and cook.", "Breakfast", 5, 10, 2],
    ["Chicken Rice", "Rice, chicken, onion, spices", "Cook chicken and serve with rice.", "Lunch", 15, 35, 4],
    ["Tomato Pasta", "Pasta, tomatoes, garlic, oil", "Boil pasta and mix with tomato sauce.", "Lunch", 10, 20, 3],
    ["Fruit Salad", "Bananas, apples, oranges", "Chop fruits and mix together.", "Dessert", 10, 0, 2],
    ["Vegetable Soup", "Carrots, potatoes, onion, water", "Simmer vegetables until tender.", "Dinner", 15, 30, 4],
    ["Grilled Fish", "Fish, lemon, salt, oil", "Season fish and grill until cooked.", "Dinner", 10, 20, 2],
    ["Peanut Porridge", "Maize meal, peanut butter, water", "Cook maize meal and stir in peanut butter.", "Breakfast", 5, 15, 3],
    ["Bean Stew", "Beans, tomatoes, onion, spices", "Simmer cooked beans with vegetables.", "Dinner", 15, 30, 4],
    ["Avocado Sandwich", "Bread, avocado, salt", "Mash avocado and spread on bread.", "Snack", 5, 0, 1]
  ];

  const seed = db.transaction((recipes) => {
    for (const recipe of recipes) {
      insertRecipe.run(...recipe);
    }
  });

  seed(sampleRecipes);
}

// --------------------------------------------------
// FRONTEND
// --------------------------------------------------
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------------------------------------
// VALIDATION
// --------------------------------------------------
function validateRecipe(body) {
  const requiredText = [
    "title",
    "ingredients",
    "description",
    "category"
  ];

  for (const field of requiredText) {
    if (
      typeof body[field] !== "string" ||
      body[field].trim().length === 0
    ) {
      return `${field} must be a non-empty string.`;
    }
  }

  for (const field of ["prep_time", "cook_time", "servings"]) {
    const value = Number(body[field]);

    if (
      body[field] === undefined ||
      body[field] === null ||
      body[field] === "" ||
      !Number.isInteger(value) ||
      value < (field === "servings" ? 1 : 0)
    ) {
      return `${field} must be a valid non-negative integer${
        field === "servings" ? " greater than zero" : ""
      }.`;
    }
  }

  return null;
}

function getRecipeValues(body) {
  return [
    body.title.trim(),
    body.ingredients.trim(),
    body.description.trim(),
    body.category.trim(),
    Number(body.prep_time),
    Number(body.cook_time),
    Number(body.servings)
  ];
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// --------------------------------------------------
// GET ALL RECIPES
// GET /api/recipes
// --------------------------------------------------
app.get("/api/recipes", (req, res) => {
  try {
    const recipes = db
      .prepare("SELECT * FROM recipes ORDER BY id DESC")
      .all();

    res.status(200).json({
      success: true,
      count: recipes.length,
      data: recipes
    });
  } catch (error) {
    console.error("Get recipes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve recipes."
    });
  }
});

// --------------------------------------------------
// GET ONE RECIPE
// GET /api/recipes/:id
// --------------------------------------------------
app.get("/api/recipes/:id", (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid recipe ID."
    });
  }

  try {
    const recipe = db
      .prepare("SELECT * FROM recipes WHERE id = ?")
      .get(id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found."
      });
    }

    res.status(200).json({
      success: true,
      data: recipe
    });
  } catch (error) {
    console.error("Get recipe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve recipe."
    });
  }
});

// --------------------------------------------------
// CREATE RECIPE
// POST /api/recipes
// --------------------------------------------------
app.post("/api/recipes", (req, res) => {
  const validationError = validateRecipe(req.body);

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError
    });
  }

  try {
    const result = db.prepare(`
      INSERT INTO recipes
        (title, ingredients, description, category,
         prep_time, cook_time, servings)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(...getRecipeValues(req.body));

    const recipe = db
      .prepare("SELECT * FROM recipes WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Recipe created successfully.",
      data: recipe
    });
  } catch (error) {
    console.error("Create recipe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create recipe."
    });
  }
});

// --------------------------------------------------
// UPDATE RECIPE
// PUT /api/recipes/:id
// --------------------------------------------------
app.put("/api/recipes/:id", (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid recipe ID."
    });
  }

  const validationError = validateRecipe(req.body);

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError
    });
  }

  try {
    const existing = db
      .prepare("SELECT id FROM recipes WHERE id = ?")
      .get(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found."
      });
    }

    db.prepare(`
      UPDATE recipes
      SET title = ?,
          ingredients = ?,
          description = ?,
          category = ?,
          prep_time = ?,
          cook_time = ?,
          servings = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(...getRecipeValues(req.body), id);

    const updatedRecipe = db
      .prepare("SELECT * FROM recipes WHERE id = ?")
      .get(id);

    res.status(200).json({
      success: true,
      message: "Recipe updated successfully.",
      data: updatedRecipe
    });
  } catch (error) {
    console.error("Update recipe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update recipe."
    });
  }
});

// --------------------------------------------------
// DELETE RECIPE
// DELETE /api/recipes/:id
// --------------------------------------------------
app.delete("/api/recipes/:id", (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid recipe ID."
    });
  }

  try {
    const result = db
      .prepare("DELETE FROM recipes WHERE id = ?")
      .run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found."
      });
    }

    res.status(200).json({
      success: true,
      message: "Recipe deleted successfully.",
      id
    });
  } catch (error) {
    console.error("Delete recipe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete recipe."
    });
  }
});

// --------------------------------------------------
// UNKNOWN API ROUTES
// --------------------------------------------------
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found."
  });
});

// --------------------------------------------------
// INVALID JSON AND OTHER ERRORS
// --------------------------------------------------
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body."
    });
  }

  console.error("Server error:", error);
  res.status(500).json({
    success: false,
    message: "An unexpected server error occurred."
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});

// Graceful shutdown
function shutdown() {
  server.close(() => {
    try {
      db.close();
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
