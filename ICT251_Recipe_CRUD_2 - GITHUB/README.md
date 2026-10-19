Personal Recipe Card — ICT251 CRUD Application

Project Overview

The Personal Recipe Card is a web-based application for managing cooking recipes. Users can create, view, search, update, and delete recipes.

Technologies Used

- Node.js
- Express.js
- SQLite database
- better-sqlite3
- HTML, CSS, and JavaScript
- Postman for API testing
- dotenv for environment configuration
- CORS for cross-origin requests

Database

Database file: "recipes.db"

Table: "recipes"

Fields:

- "id" — auto-incrementing primary key
- "title" — recipe title
- "description" — recipe description
- "ingredients" — ingredients and quantities
- "instructions" — preparation instructions
- "category" — recipe category
- "prep_time_minutes" — preparation time
- "cook_time_minutes" — cooking time
- "servings" — number of servings
- "created_at" — creation timestamp
- "updated_at" — last-update timestamp

The application automatically creates the table and inserts sample recipes when the table is empty.

Installation and Setup

1. Install Node.js.

2. Open a terminal in the project directory.

3. Install dependencies:
   
   npm install

4. Ensure the ".env" file contains:
   
   PORT=3000

5. Start the application:
   
   node server.js

6. Open "http://localhost:3000" in a web browser.

REST API Endpoints

Method| Endpoint| Purpose
GET| "/api/recipes"| Retrieve all recipes
GET| "/api/recipes/:id"| Retrieve one recipe
POST| "/api/recipes"| Create a recipe
PUT| "/api/recipes/:id"| Update a recipe
DELETE| "/api/recipes/:id"| Delete a recipe

Example

Retrieve all recipes:

"GET http://localhost:3000/api/recipes"

Create, update, and delete requests should use JSON where required.

Validation and Error Handling

The API validates required text fields and numeric recipe values. It returns appropriate JSON responses for successful operations, invalid input, missing recipes, and server errors.

Testing

The REST API has been tested using Postman. Successful tests include retrieving recipes, creating a recipe, updating a recipe, and deleting a recipe.

Project Structure

ICT251_Recipe_CRUD_2/
├── public/
│   ├── index.html
│   └── app.js
├── node_modules/
├── .env
├── package.json
├── package-lock.json
├── recipes.db
└── server.js

Running the Project

Run "node server.js" from the project directory and visit "http://localhost:3000".

Deployment

The application is designed for deployment to a compatible Node.js hosting platform. Configure the port using the hosting environment and ensure the SQLite database is stored persistently.

Author:
Self