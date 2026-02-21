import { Schema, model } from "mongoose";

const ratingSchema = new Schema(
  {
    movie: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    text: {
      type: String,
      required: true,
      minlength: 10,
      trim: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    toJSON: {
      virtuals: true,
    },
  },
);

const Rating = model("Rating", ratingSchema);

export default Rating;
