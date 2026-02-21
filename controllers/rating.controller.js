import createError from "http-errors";
import Rating from "../models/rating.model.js";
import Movie from "../models/movie.model.js";

async function list(req, res) {
  const ratings = await Rating.find().populate("movie");
  res.json(ratings);
}

async function detail(req, res) {
  const rating = await Rating.findById(req.params.id).populate("movie");

  if (!rating) {
    throw createError(404, "Rating not found");
  }

  res.json(rating);
}

async function create(req, res) {
  if (!req.body.movie) {
    throw createError(400, "Movie is required");
  }

  const movie = await Movie.findById(req.body.movie);

  if (!movie) {
    throw createError(404, "Movie not found");
  }

  const rating = await Rating.create(req.body);
  res.status(201).json(rating);
}

async function update(req, res) {
  const rating = await Rating.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!rating) {
    throw createError(404, "Rating not found");
  }

  res.json(rating);
}

async function deleteRating(req, res) {
  const rating = await Rating.findByIdAndDelete(req.params.id);

  if (!rating) {
    throw createError(404, "Rating not found");
  }

  res.status(204).send();
}

export default { list, detail, create, update, delete: deleteRating };
