import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import app from "./app.js";
import Movie from "./models/movie.model.js";

let movie1, movie2;
let sessionCookie;
let user1;
const fakeId = new mongoose.Types.ObjectId();

const validUser = {
  email: "test@example.com",
  password: "secret123",
  fullName: "Test User",
  birthDate: "1990-01-15",
};

beforeAll(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  [movie1, movie2] = await Movie.create([
    { title: "The Shawshank Redemption", year: "1994", director: "Frank Darabont" },
    { title: "The Godfather", year: "1972", director: "Francis Ford Coppola" },
  ]);
});

afterAll(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  await mongoose.disconnect();
});

// =============================================
// Iteración 1: Modelo User — Validaciones
// =============================================

describe("Iteración 1: Modelo User — Validaciones", () => {
  it("POST /api/users should return 400 when email is missing", async () => {
    const { email, ...body } = validUser;
    const res = await request(app).post("/api/users").send(body);

    expect(res.status).toBe(400);
  });

  it("POST /api/users should return 400 when email format is invalid", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ ...validUser, email: "not-an-email" });

    expect(res.status).toBe(400);
  });

  it("POST /api/users should return 400 when password is missing", async () => {
    const { password, ...body } = validUser;
    const res = await request(app).post("/api/users").send(body);

    expect(res.status).toBe(400);
  });

  it("POST /api/users should return 400 when password is too short", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ ...validUser, email: "short@test.com", password: "1234" });

    expect(res.status).toBe(400);
  });

  it("POST /api/users should return 400 when fullName is missing", async () => {
    const { fullName, ...body } = validUser;
    const res = await request(app).post("/api/users").send(body);

    expect(res.status).toBe(400);
  });

  it("POST /api/users should return 400 when birthDate is missing", async () => {
    const { birthDate, ...body } = validUser;
    const res = await request(app).post("/api/users").send(body);

    expect(res.status).toBe(400);
  });

  it("POST /api/users should return 400 when user is under 18", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ ...validUser, email: "minor@test.com", birthDate: "2015-01-01" });

    expect(res.status).toBe(400);
  });
});

// =============================================
// Iteración 2: Registro con contraseña cifrada
// =============================================

describe("Iteración 2: Registro con contraseña cifrada", () => {
  it("should create a user and return 201", async () => {
    const res = await request(app).post("/api/users").send(validUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.email).toBe(validUser.email);
    expect(res.body.fullName).toBe(validUser.fullName);

    user1 = res.body;
  });

  it("should not return the password field in the response", async () => {
    const res = await request(app).post("/api/users").send({
      ...validUser,
      email: "nopassword@test.com",
    });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty("password");
  });

  it("should store the password hashed in the database", async () => {
    const User = (await import("./models/user.model.js")).default;
    const dbUser = await User.findById(user1.id);

    expect(dbUser.password).not.toBe(validUser.password);
    const match = await bcrypt.compare(validUser.password, dbUser.password);
    expect(match).toBe(true);
  });

  it("should create a user without bio (optional field)", async () => {
    const res = await request(app).post("/api/users").send({
      ...validUser,
      email: "nobio@test.com",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  it("should return 409 when email already exists", async () => {
    const res = await request(app).post("/api/users").send(validUser);

    expect(res.status).toBe(409);
  });
});

// =============================================
// Iteración 3 & 4: Login
// =============================================

describe("Iteración 4: Login", () => {
  it("POST /api/users/login should return 200 and set a sessionId cookie", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const sessionCookieHeader = Array.isArray(cookies)
      ? cookies.find((c) => c.startsWith("sessionId="))
      : cookies;

    expect(sessionCookieHeader).toBeDefined();
    expect(sessionCookieHeader).toMatch(/sessionId=.+/);
    expect(sessionCookieHeader).toMatch(/httponly/i);

    // Store the cookie for subsequent tests
    sessionCookie = sessionCookieHeader.split(";")[0];
  });

  it("POST /api/users/login should return 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ password: "secret123" });

    expect(res.status).toBe(400);
  });

  it("POST /api/users/login should return 400 when password is missing", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(400);
  });

  it("POST /api/users/login should return 401 for non-existent email", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "nonexistent@test.com", password: "secret123" });

    expect(res.status).toBe(401);
  });

  it("POST /api/users/login should return 401 for wrong password", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: validUser.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
  });
});

// =============================================
// Iteración 5: Middleware de autenticación
// =============================================

describe("Iteración 5: Middleware de autenticación", () => {
  it("GET /movies without cookie should return 401", async () => {
    const res = await request(app).get("/movies");

    expect(res.status).toBe(401);
  });

  it("GET /movies with valid cookie should return 200", async () => {
    const res = await request(app)
      .get("/movies")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /ratings without cookie should return 401", async () => {
    const res = await request(app).get("/ratings");

    expect(res.status).toBe(401);
  });

  it("GET /ratings with valid cookie should return 200", async () => {
    const res = await request(app)
      .get("/ratings")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
  });

  it("POST /api/users (register) should work without cookie", async () => {
    const res = await request(app).post("/api/users").send({
      ...validUser,
      email: "public-register@test.com",
    });

    expect(res.status).toBe(201);
  });

  it("POST /api/users/login should work without cookie", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
  });

  it("should return 401 with an invalid sessionId cookie", async () => {
    const res = await request(app)
      .get("/movies")
      .set("Cookie", `sessionId=${fakeId}`);

    expect(res.status).toBe(401);
  });

  it("GET /api/users without cookie should return 401", async () => {
    const res = await request(app).get("/api/users");

    expect(res.status).toBe(401);
  });

  it("GET /api/users with valid cookie should return 200", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// =============================================
// Iteración 6: Profile y Logout
// =============================================

describe("Iteración 6: Profile", () => {
  it("GET /api/users/profile should return the authenticated user", async () => {
    const res = await request(app)
      .get("/api/users/profile")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("email", validUser.email);
    expect(res.body).toHaveProperty("fullName", validUser.fullName);
    expect(res.body).not.toHaveProperty("password");
  });

  it("GET /api/users/profile without cookie should return 401", async () => {
    const res = await request(app).get("/api/users/profile");

    expect(res.status).toBe(401);
  });
});

describe("Iteración 6: Logout", () => {
  let logoutCookie;

  beforeAll(async () => {
    // Login to get a fresh session for logout tests
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: validUser.email, password: validUser.password });

    const cookies = res.headers["set-cookie"];
    const header = Array.isArray(cookies)
      ? cookies.find((c) => c.startsWith("sessionId="))
      : cookies;
    logoutCookie = header.split(";")[0];
  });

  it("DELETE /api/users/logout should return 204", async () => {
    const res = await request(app)
      .delete("/api/users/logout")
      .set("Cookie", logoutCookie);

    expect(res.status).toBe(204);
  });

  it("after logout, the session cookie should no longer be valid", async () => {
    const res = await request(app)
      .get("/api/users/profile")
      .set("Cookie", logoutCookie);

    expect(res.status).toBe(401);
  });
});

// =============================================
// CRUD Movies (con autenticación)
// =============================================

describe("Movies (autenticado)", () => {
  it("GET /movies should return an array of movies", async () => {
    const res = await request(app)
      .get("/movies")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("each movie should have an id and title", async () => {
    const res = await request(app)
      .get("/movies")
      .set("Cookie", sessionCookie);

    res.body.forEach((movie) => {
      expect(movie).toHaveProperty("id");
      expect(movie).toHaveProperty("title");
    });
  });

  it("GET /movies/:id should return a single movie", async () => {
    const res = await request(app)
      .get(`/movies/${movie1.id}`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", movie1.id);
    expect(res.body).toHaveProperty("title");
  });

  it("GET /movies/:id should return 404 for non-existent movie", async () => {
    const res = await request(app)
      .get(`/movies/${fakeId}`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(404);
  });

  it("POST /movies should create a new movie and return 201", async () => {
    const res = await request(app)
      .post("/movies")
      .set("Cookie", sessionCookie)
      .send({ title: "Arrival", year: "2016", director: "Denis Villeneuve" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.title).toBe("Arrival");
  });

  it("PATCH /movies/:id should update an existing movie", async () => {
    const res = await request(app)
      .patch(`/movies/${movie1.id}`)
      .set("Cookie", sessionCookie)
      .send({ rate: "9.9" });

    expect(res.status).toBe(200);
    expect(res.body.rate).toBe("9.9");
  });

  it("DELETE /movies/:id should return 404 for non-existent movie", async () => {
    const res = await request(app)
      .delete(`/movies/${fakeId}`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(404);
  });
});

// =============================================
// CRUD Ratings (con autenticación)
// =============================================

describe("Ratings (autenticado)", () => {
  let rating1, rating2;

  it("POST /ratings should return 400 when text is missing", async () => {
    const res = await request(app)
      .post("/ratings")
      .set("Cookie", sessionCookie)
      .send({ movie: movie1.id, score: 3 });

    expect(res.status).toBe(400);
  });

  it("POST /ratings should create a rating and return 201", async () => {
    const res = await request(app)
      .post("/ratings")
      .set("Cookie", sessionCookie)
      .send({
        movie: movie1.id,
        text: "An absolute masterpiece of cinema",
        score: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    rating1 = res.body;
  });

  it("POST /ratings should create a second rating", async () => {
    const res = await request(app)
      .post("/ratings")
      .set("Cookie", sessionCookie)
      .send({
        movie: movie1.id,
        text: "Great movie but a bit too long",
        score: 4,
      });

    expect(res.status).toBe(201);
    rating2 = res.body;
  });

  it("GET /ratings should return an array of ratings", async () => {
    const res = await request(app)
      .get("/ratings")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("each rating should have id, text, score and movie", async () => {
    const res = await request(app)
      .get("/ratings")
      .set("Cookie", sessionCookie);

    res.body.forEach((rating) => {
      expect(rating).toHaveProperty("id");
      expect(rating).toHaveProperty("text");
      expect(rating).toHaveProperty("score");
      expect(rating).toHaveProperty("movie");
    });
  });

  it("GET /ratings should populate the movie field", async () => {
    const res = await request(app)
      .get("/ratings")
      .set("Cookie", sessionCookie);

    const rating = res.body.find((r) => r.id === rating1.id);
    expect(rating.movie).toHaveProperty("title");
    expect(rating.movie).toHaveProperty("id", movie1.id);
  });

  it("GET /ratings/:id should return a single rating", async () => {
    const res = await request(app)
      .get(`/ratings/${rating1.id}`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", rating1.id);
  });

  it("PATCH /ratings/:id should update a rating", async () => {
    const res = await request(app)
      .patch(`/ratings/${rating1.id}`)
      .set("Cookie", sessionCookie)
      .send({ score: 4 });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(4);
  });

  it("DELETE /ratings/:id should delete a rating and return 204", async () => {
    const res = await request(app)
      .delete(`/ratings/${rating2.id}`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(204);
  });

  it("should no longer find the deleted rating", async () => {
    const res = await request(app)
      .get(`/ratings/${rating2.id}`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(404);
  });
});

// =============================================
// Virtual populate — ratings desde la película
// =============================================

describe("Virtual populate — ratings (autenticado)", () => {
  beforeAll(async () => {
    await request(app)
      .post("/ratings")
      .set("Cookie", sessionCookie)
      .send({
        movie: movie1.id,
        text: "Rating created for virtual populate test",
        score: 3,
      });
  });

  it("GET /movies/:id should include a ratings array", async () => {
    const res = await request(app)
      .get(`/movies/${movie1.id}`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ratings");
    expect(Array.isArray(res.body.ratings)).toBe(true);
  });

  it("ratings array should contain rating objects with text and score", async () => {
    const res = await request(app)
      .get(`/movies/${movie1.id}`)
      .set("Cookie", sessionCookie);

    expect(res.body.ratings.length).toBeGreaterThan(0);
    res.body.ratings.forEach((rating) => {
      expect(rating).toHaveProperty("text");
      expect(rating).toHaveProperty("score");
    });
  });

  it("a movie with no ratings should have an empty ratings array", async () => {
    const movieRes = await request(app)
      .post("/movies")
      .set("Cookie", sessionCookie)
      .send({ title: "New Movie Without Ratings", year: "2025", director: "Test Director" });

    const res = await request(app)
      .get(`/movies/${movieRes.body.id}`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ratings");
    expect(res.body.ratings).toEqual([]);
  });
});

// =============================================
// Users CRUD (autenticado)
// =============================================

describe("Users CRUD (autenticado)", () => {
  it("GET /api/users should return an array of users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("each user should have id, email and fullName but no password", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Cookie", sessionCookie);

    res.body.forEach((user) => {
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("fullName");
      expect(user).not.toHaveProperty("password");
    });
  });

  it("GET /api/users/:id should return a single user", async () => {
    const res = await request(app)
      .get(`/api/users/${user1.id}`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", user1.id);
    expect(res.body).not.toHaveProperty("password");
  });

  it("GET /api/users/:id should return 404 for non-existent user", async () => {
    const res = await request(app)
      .get(`/api/users/${fakeId}`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(404);
  });

  it("PATCH /api/users/:id should update user fields", async () => {
    const res = await request(app)
      .patch(`/api/users/${user1.id}`)
      .set("Cookie", sessionCookie)
      .send({ bio: "Hello world" });

    expect(res.status).toBe(200);
    expect(res.body.bio).toBe("Hello world");
  });

  it("PATCH /api/users/:id should re-hash the password when updated", async () => {
    const newPassword = "newpassword123";
    const res = await request(app)
      .patch(`/api/users/${user1.id}`)
      .set("Cookie", sessionCookie)
      .send({ password: newPassword });

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("password");

    const User = (await import("./models/user.model.js")).default;
    const dbUser = await User.findById(user1.id);
    const match = await bcrypt.compare(newPassword, dbUser.password);
    expect(match).toBe(true);
  });

  it("DELETE /api/users/:id should delete a user and return 204", async () => {
    const createRes = await request(app).post("/api/users").send({
      ...validUser,
      email: "todelete@test.com",
    });

    const res = await request(app)
      .delete(`/api/users/${createRes.body.id}`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(204);
  });

  it("DELETE /api/users/:id should return 404 for non-existent user", async () => {
    const res = await request(app)
      .delete(`/api/users/${fakeId}`)
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(404);
  });
});

// =============================================
// Errores — Middleware centralizado
// =============================================

describe("Middleware de errores", () => {
  it("GET /unknown should return 404 with JSON error", async () => {
    const res = await request(app)
      .get("/unknown")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("error");
  });
});
