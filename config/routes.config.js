import { Router } from "express";
import movieController from "../controllers/movie.controller.js";
import ratingController from "../controllers/rating.controller.js";
import userController from "../controllers/user.controller.js";

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

router.get("/api/users", userController.list);
router.get("/api/users/:id", userController.detail);
router.post("/api/users", userController.create);
router.patch("/api/users/:id", userController.update);
router.delete("/api/users/:id", userController.delete);

export default router;
