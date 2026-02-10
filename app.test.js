import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./app.js";

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

  it("should return 404 for a non-existent movie", async () => {
    const res = await request(app).get("/movies/999");

    expect(res.status).toBe(404);
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

  it("should return 404 for a non-existent movie", async () => {
    const res = await request(app).patch("/movies/999").send({ rate: "5.0" });

    expect(res.status).toBe(404);
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
