import { Router } from "express";
import movieController from "../controllers/movie.controller.js";
import ratingController from "../controllers/rating.controller.js";

const router = Router();

router.get("/movies", movieController.list);
router.get("/movies/:id", movieController.detail);
router.post("/movies", movieController.create);
router.patch("/movies/:id", movieController.update);
router.delete("/movies/:id", movieController.delete);

router.get("/ratings", ratingController.list);
router.get("/ratings/:id", ratingController.detail);
router.post("/ratings", ratingController.create);
router.patch("/ratings/:id", ratingController.update);
router.delete("/ratings/:id", ratingController.delete);

export default router;
