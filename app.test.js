import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./app.js";

// =============================================
// CRUD Básico — estos tests pasan desde el inicio
// =============================================

describe("GET /movies", () => {
  it("should return an array of movies", async () => {
    const res = await request(app).get("/movies");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("each movie should have an id and title", async () => {
    const res = await request(app).get("/movies");

    res.body.forEach((movie) => {
      expect(movie).toHaveProperty("id");
      expect(movie).toHaveProperty("title");
    });
  });
});

describe("GET /movies/:id", () => {
  it("should return a single movie by id", async () => {
    const res = await request(app).get("/movies/1");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", "1");
    expect(res.body).toHaveProperty("title");
  });
});

describe("POST /movies", () => {
  it("should create a new movie and return 201", async () => {
    const newMovie = {
      title: "Arrival",
      year: "2016",
      director: "Denis Villeneuve",
    };
    const res = await request(app).post("/movies").send(newMovie);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.title).toBe("Arrival");
    expect(res.body.year).toBe("2016");
  });
});

describe("PATCH /movies/:id", () => {
  it("should update an existing movie", async () => {
    const res = await request(app).patch("/movies/1").send({ rate: "9.9" });

    expect(res.status).toBe(200);
    expect(res.body.rate).toBe("9.9");
    expect(res.body).toHaveProperty("id", "1");
  });
});

describe("DELETE /movies/:id", () => {
  it("should delete a movie and return 204", async () => {
    const res = await request(app).delete("/movies/2");

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it("should no longer find the deleted movie", async () => {
    await request(app).delete("/movies/3");
    const res = await request(app).get("/movies/3");

    expect(res.status).toBe(404);
  });
});

// =============================================
// Iteración 2: Gestionar 404 en controladores
// =============================================

describe("Iteración 2: 404 para películas no encontradas", () => {
  it("GET /movies/:id should return 404 for a non-existent movie", async () => {
    const res = await request(app).get("/movies/999");

    expect(res.status).toBe(404);
  });

  it("PATCH /movies/:id should return 404 for a non-existent movie", async () => {
    const res = await request(app).patch("/movies/999").send({ rate: "5.0" });

    expect(res.status).toBe(404);
  });

  it("DELETE /movies/:id should return 404 for a non-existent movie", async () => {
    const res = await request(app).delete("/movies/999");

    expect(res.status).toBe(404);
  });
});

// =============================================
// Iteración 3: Middleware centralizado de errores
// =============================================

describe("Iteración 3: Middleware centralizado de errores", () => {
  it("404 response should be JSON", async () => {
    const res = await request(app).get("/movies/999");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
  });

  it("404 response body should have an 'error' property with a message", async () => {
    const res = await request(app).get("/movies/999");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  it("PATCH 404 response body should have an 'error' property", async () => {
    const res = await request(app).patch("/movies/999").send({ rate: "5.0" });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(typeof res.body.error).toBe("string");
  });

  it("DELETE 404 response body should have an 'error' property", async () => {
    const res = await request(app).delete("/movies/999");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(typeof res.body.error).toBe("string");
  });
});

// =============================================
// Bonus: Catch-all 404 para rutas no definidas
// =============================================

describe("Bonus: Catch-all 404 para rutas no definidas", () => {
  it("GET /unknown should return 404", async () => {
    const res = await request(app).get("/unknown");

    expect(res.status).toBe(404);
  });

  it("GET /unknown should return JSON with 'error' property", async () => {
    const res = await request(app).get("/unknown");

    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("error");
    expect(typeof res.body.error).toBe("string");
  });

  it("POST /unknown should return 404 with JSON error", async () => {
    const res = await request(app).post("/unknown").send({ foo: "bar" });

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("error");
  });
});
