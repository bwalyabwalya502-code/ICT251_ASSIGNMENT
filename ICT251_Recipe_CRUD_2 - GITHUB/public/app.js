const API_URL = "/api/recipes";

const form = document.getElementById("recipe-form");
const recipeId = document.getElementById("recipe-id");
const title = document.getElementById("title");
const description = document.getElementById("description");
const ingredients = document.getElementById("ingredients");
const instructions = document.getElementById("instructions");
const category = document.getElementById("category");
const prepTime = document.getElementById("prep-time");
const cookTime = document.getElementById("cook-time");
const servings = document.getElementById("servings");

const recipesContainer = document.getElementById("recipes");
const recipeCount = document.getElementById("recipe-count");
const searchInput = document.getElementById("search");
const message = document.getElementById("message");
const formHeading = document.getElementById("form-heading");
const submitButton = document.getElementById("submit-button");
const cancelButton = document.getElementById("cancel-button");

let allRecipes = [];
let messageTimer;

// Display success and error messages
function showMessage(text, type = "success") {
    clearTimeout(messageTimer);

    message.textContent = text;
    message.className = `message show ${type}`;

    messageTimer = setTimeout(() => {
        message.className = "message";
    }, 4500);
}

// Make an API request and handle errors
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.error || `Request failed with status ${response.status}.`
        );
    }

    return data;
}

// Create an element safely using textContent
function addTextElement(parent, tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    element.textContent = text;
    parent.appendChild(element);

    return element;
}

// Build a recipe card
function createRecipeCard(recipe) {
    const card = document.createElement("article");
    card.className = "recipe";

    addTextElement(card, "span", "category", recipe.category);
    addTextElement(card, "h3", "", recipe.title);
    addTextElement(card, "p", "", recipe.description);

    addTextElement(card, "p", "meta",
        `Preparation: ${recipe.prep_time_minutes} min\n` +
        `Cooking: ${recipe.cook_time_minutes} min\n` +
        `Servings: ${recipe.servings}`
    );

    addTextElement(card, "p", "", `Ingredients: ${recipe.ingredients}`);
    addTextElement(card, "p", "", `Instructions: ${recipe.instructions}`);

    const actions = document.createElement("div");
    actions.className = "recipe-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
        startEditing(recipe);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
        deleteRecipe(recipe);
    });

    actions.append(editButton, deleteButton);
    card.appendChild(actions);

    return card;
}

// Display recipes, applying the search filter
function renderRecipes() {
    const query = searchInput.value.trim().toLowerCase();

    const filteredRecipes = allRecipes.filter(recipe => {
        const searchableText = [
            recipe.title,
            recipe.description,
            recipe.ingredients,
            recipe.instructions,
            recipe.category
        ].join(" ").toLowerCase();

        return searchableText.includes(query);
    });

    recipesContainer.replaceChildren();

    recipeCount.textContent =
        `${filteredRecipes.length} recipe(s) shown` +
        (query ? ` for "${searchInput.value.trim()}"` : "");

    if (filteredRecipes.length === 0) {
        addTextElement(
            recipesContainer,
            "div",
            "empty",
            query
                ? "No recipes match your search."
                : "No recipes yet. Add your first recipe using the form."
        );
        return;
    }

    filteredRecipes.forEach(recipe => {
        recipesContainer.appendChild(createRecipeCard(recipe));
    });
}

// Load recipes from the backend
async function loadRecipes() {
    recipeCount.textContent = "Loading recipes...";

    try {
        allRecipes = await apiRequest(API_URL);
        renderRecipes();
    } catch (error) {
        recipesContainer.replaceChildren();

        addTextElement(
            recipesContainer,
            "div",
            "empty",
            "Unable to load recipes. Check that the server is running, then refresh."
        );

        recipeCount.textContent = "Could not load recipes.";
        showMessage(error.message, "error");
    }
}

// Reset the form after saving or cancelling
function resetForm() {
    form.reset();
    recipeId.value = "";

    formHeading.textContent = "Add a Recipe";
    submitButton.textContent = "Save Recipe";
    cancelButton.hidden = true;

    prepTime.value = 10;
    cookTime.value = 20;
    servings.value = 2;
}

// Load a recipe into the form for editing
function startEditing(recipe) {
    recipeId.value = recipe.id;
    title.value = recipe.title;
    description.value = recipe.description;
    ingredients.value = recipe.ingredients;
    instructions.value = recipe.instructions;
    category.value = recipe.category;
    prepTime.value = recipe.prep_time_minutes;
    cookTime.value = recipe.cook_time_minutes;
    servings.value = recipe.servings;

    formHeading.textContent = "Edit Recipe";
    submitButton.textContent = "Update Recipe";
    cancelButton.hidden = false;

    form.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// Validate and submit a new or updated recipe
form.addEventListener("submit", async event => {
    event.preventDefault();

    const recipe = {
        title: title.value.trim(),
        description: description.value.trim(),
        ingredients: ingredients.value.trim(),
        instructions: instructions.value.trim(),
        category: category.value,
        prep_time_minutes: Number(prepTime.value),
        cook_time_minutes: Number(cookTime.value),
        servings: Number(servings.value)
    };

    if (
        !recipe.title ||
        !recipe.description ||
        !recipe.ingredients ||
        !recipe.instructions ||
        !recipe.category
    ) {
        showMessage("Please complete all recipe fields.", "error");
        return;
    }

    if (
        !Number.isInteger(recipe.prep_time_minutes) ||
        recipe.prep_time_minutes < 0 ||
        !Number.isInteger(recipe.cook_time_minutes) ||
        recipe.cook_time_minutes < 0 ||
        !Number.isInteger(recipe.servings) ||
        recipe.servings < 1
    ) {
        showMessage(
            "Enter valid times and a serving count of at least 1.",
            "error"
        );
        return;
    }

    const editingId = recipeId.value;
    const url = editingId
        ? `${API_URL}/${encodeURIComponent(editingId)}`
        : API_URL;

    const method = editingId ? "PUT" : "POST";

    submitButton.disabled = true;
    submitButton.textContent = editingId ? "Updating..." : "Saving...";

    try {
        await apiRequest(url, {
            method,
            body: JSON.stringify(recipe)
        });

        resetForm();
        await loadRecipes();

        showMessage(
            editingId
                ? "Recipe updated successfully."
                : "Recipe added successfully."
        );
    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        submitButton.disabled = false;

        if (recipeId.value) {
            submitButton.textContent = "Update Recipe";
        } else {
            submitButton.textContent = "Save Recipe";
        }
    }
});

// Delete a recipe after confirmation
async function deleteRecipe(recipe) {
    const confirmed = window.confirm(
        `Are you sure you want to delete "${recipe.title}"?`
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(
            `${API_URL}/${encodeURIComponent(recipe.id)}`,
            { method: "DELETE" }
        );

        if (recipeId.value === String(recipe.id)) {
            resetForm();
        }

        await loadRecipes();
        showMessage("Recipe deleted successfully.");
    } catch (error) {
        showMessage(error.message, "error");
    }
}

// Search as the user types
searchInput.addEventListener("input", renderRecipes);

// Cancel editing
cancelButton.addEventListener("click", resetForm);

// Initial page load
loadRecipes();