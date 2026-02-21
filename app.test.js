import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import app from "./app.js";
import Movie from "./models/movie.model.js";
import User from "./models/user.model.js";

let movie1, movie2;
const fakeId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  // Limpiar colecciones antes de empezar
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
// CRUD Movies (ya implementado)
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
    const res = await request(app).get(`/movies/${movie1.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", movie1.id);
    expect(res.body).toHaveProperty("title");
  });

  it("should return 404 for a non-existent movie", async () => {
    const res = await request(app).get(`/movies/${fakeId}`);

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
    const res = await request(app).patch(`/movies/${movie1.id}`).send({ rate: "9.9" });

    expect(res.status).toBe(200);
    expect(res.body.rate).toBe("9.9");
    expect(res.body).toHaveProperty("id", movie1.id);
  });

  it("should return 404 for a non-existent movie", async () => {
    const res = await request(app).patch(`/movies/${fakeId}`).send({ rate: "5.0" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /movies/:id", () => {
  it("should return 404 for a non-existent movie", async () => {
    const res = await request(app).delete(`/movies/${fakeId}`);

    expect(res.status).toBe(404);
  });
});

// =============================================
// Iteración 1: Modelo Rating
// =============================================

describe("Iteración 1: Modelo Rating", () => {
  it("POST /ratings should return 400 when text is missing", async () => {
    const res = await request(app)
      .post("/ratings")
      .send({ movie: movie1.id, score: 3 });

    expect(res.status).toBe(400);
  });

  it("POST /ratings should return 400 when text is too short", async () => {
    const res = await request(app)
      .post("/ratings")
      .send({ movie: movie1.id, text: "Short", score: 3 });

    expect(res.status).toBe(400);
  });

  it("POST /ratings should return 400 when score is missing", async () => {
    const res = await request(app)
      .post("/ratings")
      .send({ movie: movie1.id, text: "This is a long enough review text" });

    expect(res.status).toBe(400);
  });

  it("POST /ratings should return 400 when score is less than 1", async () => {
    const res = await request(app)
      .post("/ratings")
      .send({ movie: movie1.id, text: "This is a long enough review text", score: 0 });

    expect(res.status).toBe(400);
  });

  it("POST /ratings should return 400 when score is greater than 5", async () => {
    const res = await request(app)
      .post("/ratings")
      .send({ movie: movie1.id, text: "This is a long enough review text", score: 6 });

    expect(res.status).toBe(400);
  });

  it("POST /ratings should return 400 when movie is missing", async () => {
    const res = await request(app)
      .post("/ratings")
      .send({ text: "This is a long enough review text", score: 3 });

    expect(res.status).toBe(400);
  });
});

// =============================================
// Iteración 2: CRUD de Ratings con populate
// =============================================

describe("Iteración 2: CRUD de Ratings", () => {
  let rating1, rating2;

  beforeAll(async () => {
    // Crear ratings para los tests
    const res1 = await request(app).post("/ratings").send({
      movie: movie1.id,
      text: "An absolute masterpiece of cinema",
      score: 5,
    });
    rating1 = res1.body;

    const res2 = await request(app).post("/ratings").send({
      movie: movie1.id,
      text: "Great movie but a bit too long",
      score: 4,
    });
    rating2 = res2.body;
  });

  describe("POST /ratings", () => {
    it("should create a rating and return 201", async () => {
      const res = await request(app).post("/ratings").send({
        movie: movie2.id,
        text: "A classic that never gets old",
        score: 5,
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.text).toBe("A classic that never gets old");
      expect(res.body.score).toBe(5);
    });

    it("should return 404 when movie does not exist", async () => {
      const res = await request(app).post("/ratings").send({
        movie: fakeId.toString(),
        text: "This review is for a movie that does not exist",
        score: 3,
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /ratings", () => {
    it("should return an array of ratings", async () => {
      const res = await request(app).get("/ratings");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("each rating should have id, text, score and movie", async () => {
      const res = await request(app).get("/ratings");

      res.body.forEach((rating) => {
        expect(rating).toHaveProperty("id");
        expect(rating).toHaveProperty("text");
        expect(rating).toHaveProperty("score");
        expect(rating).toHaveProperty("movie");
      });
    });

    it("should populate the movie field with the full movie object", async () => {
      const res = await request(app).get("/ratings");

      const rating = res.body.find((r) => r.id === rating1.id);
      expect(rating.movie).toHaveProperty("title");
      expect(rating.movie).toHaveProperty("id", movie1.id);
    });
  });

  describe("GET /ratings/:id", () => {
    it("should return a single rating by id", async () => {
      const res = await request(app).get(`/ratings/${rating1.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", rating1.id);
      expect(res.body.text).toBe("An absolute masterpiece of cinema");
      expect(res.body.score).toBe(5);
    });

    it("should populate the movie field", async () => {
      const res = await request(app).get(`/ratings/${rating1.id}`);

      expect(res.body.movie).toHaveProperty("title");
      expect(res.body.movie).toHaveProperty("id", movie1.id);
    });

    it("should return 404 for a non-existent rating", async () => {
      const res = await request(app).get(`/ratings/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /ratings/:id", () => {
    it("should update a rating", async () => {
      const res = await request(app)
        .patch(`/ratings/${rating1.id}`)
        .send({ score: 4 });

      expect(res.status).toBe(200);
      expect(res.body.score).toBe(4);
      expect(res.body).toHaveProperty("id", rating1.id);
    });

    it("should return 404 for a non-existent rating", async () => {
      const res = await request(app)
        .patch(`/ratings/${fakeId}`)
        .send({ score: 3 });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /ratings/:id", () => {
    it("should delete a rating and return 204", async () => {
      const res = await request(app).delete(`/ratings/${rating2.id}`);

      expect(res.status).toBe(204);
    });

    it("should no longer find the deleted rating", async () => {
      const res = await request(app).get(`/ratings/${rating2.id}`);

      expect(res.status).toBe(404);
    });

    it("should return 404 for a non-existent rating", async () => {
      const res = await request(app).delete(`/ratings/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });
});

// =============================================
// Iteración 3: Virtual populate en películas
// =============================================

describe("Iteración 3: Virtual populate — ratings desde la película", () => {
  beforeAll(async () => {
    // Asegurar que hay al menos un rating para movie1
    await request(app).post("/ratings").send({
      movie: movie1.id,
      text: "Rating created for virtual populate test",
      score: 3,
    });
  });

  it("GET /movies/:id should include a ratings array", async () => {
    const res = await request(app).get(`/movies/${movie1.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ratings");
    expect(Array.isArray(res.body.ratings)).toBe(true);
  });

  it("ratings array should contain rating objects with text and score", async () => {
    const res = await request(app).get(`/movies/${movie1.id}`);

    expect(res.body.ratings.length).toBeGreaterThan(0);
    res.body.ratings.forEach((rating) => {
      expect(rating).toHaveProperty("text");
      expect(rating).toHaveProperty("score");
    });
  });

  it("ratings should belong to the requested movie", async () => {
    const res = await request(app).get(`/movies/${movie1.id}`);

    res.body.ratings.forEach((rating) => {
      expect(rating.movie.toString()).toBe(movie1.id);
    });
  });

  it("a movie with no ratings should have an empty ratings array", async () => {
    // Crear una película nueva sin ratings
    const movieRes = await request(app).post("/movies").send({
      title: "New Movie Without Ratings",
      year: "2025",
      director: "Test Director",
    });

    const res = await request(app).get(`/movies/${movieRes.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ratings");
    expect(res.body.ratings).toEqual([]);
  });
});

// =============================================
// Errores — Middleware centralizado
// =============================================

describe("Middleware de errores", () => {
  it("404 response should be JSON with error property", async () => {
    const res = await request(app).get(`/movies/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("error");
    expect(typeof res.body.error).toBe("string");
  });

  it("GET /unknown should return 404 with JSON error", async () => {
    const res = await request(app).get("/unknown");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("error");
  });
});

// =============================================
// Iteración 1: Modelo User — Validaciones
// =============================================

const validUser = {
  email: "test@example.com",
  password: "secret123",
  fullName: "Test User",
  birthDate: "1990-01-15",
};

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
// Iteración 3: CRUD de Users
// =============================================

describe("Iteración 3: CRUD de Users", () => {
  let user1;

  describe("POST /api/users", () => {
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
      const dbUser = await User.findById(user1.id).select("+password");
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

  describe("GET /api/users", () => {
    it("should return an array of users", async () => {
      const res = await request(app).get("/api/users");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("each user should have id, email and fullName", async () => {
      const res = await request(app).get("/api/users");

      res.body.forEach((user) => {
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("fullName");
      });
    });

    it("should not return password in the list", async () => {
      const res = await request(app).get("/api/users");

      res.body.forEach((user) => {
        expect(user).not.toHaveProperty("password");
      });
    });
  });

  describe("GET /api/users/:id", () => {
    it("should return a single user by id", async () => {
      const res = await request(app).get(`/api/users/${user1.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", user1.id);
      expect(res.body.email).toBe(validUser.email);
    });

    it("should not return password in the detail", async () => {
      const res = await request(app).get(`/api/users/${user1.id}`);

      expect(res.body).not.toHaveProperty("password");
    });

    it("should return 404 for a non-existent user", async () => {
      const res = await request(app).get(`/api/users/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/users/:id", () => {
    it("should update user fields partially", async () => {
      const res = await request(app)
        .patch(`/api/users/${user1.id}`)
        .send({ bio: "Hello world" });

      expect(res.status).toBe(200);
      expect(res.body.bio).toBe("Hello world");
      expect(res.body).toHaveProperty("id", user1.id);
    });

    it("should re-hash the password when updated", async () => {
      const newPassword = "newpassword123";
      const res = await request(app)
        .patch(`/api/users/${user1.id}`)
        .send({ password: newPassword });

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("password");

      const dbUser = await User.findById(user1.id);
      const match = await bcrypt.compare(newPassword, dbUser.password);
      expect(match).toBe(true);
    });

    it("should return 404 for a non-existent user", async () => {
      const res = await request(app)
        .patch(`/api/users/${fakeId}`)
        .send({ bio: "Updated" });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("should delete a user and return 204", async () => {
      // Create a user to delete
      const createRes = await request(app).post("/api/users").send({
        ...validUser,
        email: "todelete@test.com",
      });

      const res = await request(app).delete(`/api/users/${createRes.body.id}`);

      expect(res.status).toBe(204);
    });

    it("should return 404 for a non-existent user", async () => {
      const res = await request(app).delete(`/api/users/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });
});
