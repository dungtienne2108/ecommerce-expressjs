import { Router } from "express";
import { categoryController } from "../controllers/category.controller";

const router = Router();

router.get("/", categoryController.searchByName);
router.get("/all", categoryController.getAll);

export default router;