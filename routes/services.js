const express = require("express");
const router = express.Router();
const {
  getServices,
  createService,
  deleteService
} = require("../controllers/services");

// GET /api/services - Fetches all services
router.get("/", getServices);

// POST /api/services - Creates a new service
router.post("/", createService);

// DELETE /api/services/:id - Deletes a specific service by its ID
router.delete("/:id", deleteService);

module.exports = router;