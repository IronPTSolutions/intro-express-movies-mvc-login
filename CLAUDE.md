# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `npm run dev` (uses `node --watch app.js`)
- **Run tests**: `npm test` (runs `cross-env NODE_ENV=test vitest run`)
- **No build step** — uses ES modules directly

## Architecture

Express 5 + Mongoose MVC REST API for a movie ratings system. ES modules throughout (`"type": "module"`).

### MVC Layout

- `app.js` — Express app setup and server entry point
- `config/db.config.js` — MongoDB connection (defaults to `mongodb://localhost:27017/movies-db`, overridable via `MONGODB_URI`)
- `config/routes.config.js` — All route definitions, maps paths to controller methods
- `controllers/` — Route handlers (business logic)
- `models/` — Mongoose schemas/models
- `middlewares/error-handler.middleware.js` — Centralized error handler (ValidationError, CastError, http-errors, generic 500)

### Key Patterns

- **Express 5**: Async exceptions are auto-captured — no try/catch needed in controllers
- **Error responses**: Use `http-errors` library (e.g., `throw createError(404, "Movie not found")`)
- **Mongoose 9**: Uses `toJSON: { virtuals: true }` on schemas for virtual field serialization
- **Testing**: Vitest + Supertest against the Express app; test DB is shared (collections cleaned in hooks)

### Current State (branch: lab-relationships)

Movie CRUD is complete. The lab task is adding a Ratings system with Mongoose relationships:
1. Rating model with ObjectId ref to Movie
2. Rating CRUD with `populate()` for movie data
3. Virtual populate on Movie model to include ratings in detail view
