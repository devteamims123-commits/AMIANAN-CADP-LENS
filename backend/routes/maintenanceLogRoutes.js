import express from "express";

import { requireAdminOrSuperAdmin } from "../middleware/requireAdminOrSuperAdmin.js";

import {
  listMaintenanceLogs,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog,
} from "../controllers/maintenanceLogController.js";

const router = express.Router();

/* =========================================
   AUTHORIZATION
   Active and verified Admin + Super Admin
========================================= */

router.use(requireAdminOrSuperAdmin);

// Preserve compatibility with existing controllers.
router.use((req, res, next) => {
  req.authRole = req.authProfile.role;
  next();
});

/* =========================================
   MAINTENANCE LOG ROUTES
========================================= */

router.get("/", listMaintenanceLogs);

router.post("/", createMaintenanceLog);

router.put("/:id", updateMaintenanceLog);

router.delete("/:id", deleteMaintenanceLog);

export default router;