import express from "express";
import morgan from "morgan";
import Movie from "./movies.js";

const app = express();
app.use(express.json());
app.use(morgan("dev"));

// 1. GET /movies - Retrieve a list of all movies.
app.get("/movies", async (req, res) => {
  const movies = await Movie.find();
  res.json(movies);
});

// 2. GET /movies/:id - Retrieve a single movie by its ID.
app.get("/movies/:id", async (req, res) => {
  const movie = await Movie.findById(req.params.id);

  if (!movie) {
    return res.status(404).json({ error: "movie not found" });
  }

  res.json(movie);
});

// 3. POST /movies - Create a new movie using JSON body
app.post("/movies", async (req, res) => {
  const movie = await Movie.create(req.body);
  res.status(201).json(movie);
});

// 4. PATCH /movies/:id - Update an existing movie by its ID using JSON body
app.patch("/movies/:id", async (req, res) => {
  const movie = await Movie.findByIdAndUpdate(req.params.id, req.body);

  if (!movie) {
    return res.status(404).json({ error: "movie not found" });
  }

  res.json(movie);
});

// 5. DELETE /movies/:id - Delete a movie by its ID.
app.delete("/movies/:id", async (req, res) => {
  const movie = await Movie.findById(req.params.id);

  if (!movie) {
    return res.status(404).json({ error: "movie not found" });
  }

  await Movie.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

if (process.env.NODE_ENV !== "test") {
  app.listen(3000, () => {
    console.log("Server is running on port 3000");
  });
}

export default app;
