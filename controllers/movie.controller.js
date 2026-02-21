import createError from "http-errors";
import Movie from "../models/movie.model.js";

async function list(req, res) {
  const movies = await Movie.find();
  res.json(movies);
}

async function detail(req, res) {
  const movie = await Movie.findById(req.params.id).populate("ratings");

  if (!movie) {
    throw createError(404, "Movie not found");
  }

  res.json(movie);
}

async function create(req, res) {
  const movie = await Movie.create(req.body);
  res.status(201).json(movie);
}

async function update(req, res) {
  const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!movie) {
    throw createError(404, "Movie not found");
  }

  res.json(movie);
}

async function deleteMovie(req, res) {
  const movie = await Movie.findByIdAndDelete(req.params.id);

  if (!movie) {
    throw createError(404, "Movie not found");
  }

  res.status(204).send();
}

export default { list, detail, create, update, delete: deleteMovie };
