import express from "express";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { createUser, deleteUser, listUsers, updateUser } from "../controllers/userController.js";

const router = express.Router();

router.use(requireSuperAdmin);
router.get("/", listUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
