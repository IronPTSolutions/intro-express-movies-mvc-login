import { Schema, model } from "mongoose";

const movieSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  year: {
    type: String,
    required: true,
  },
  director: {
    type: String,
    required: true,
    trim: true,
  },
  duration: {
    type: String,
  },
  genre: {
    type: [String],
  },
  rate: {
    type: String,
  },
});

const Movie = model("Movie", movieSchema);

export default Movie;
