const express = require("express");
const router = express.Router();
const {
  getPoolRequests,
  updatePoolRequestStatus,
  getPoolRequestById,
  updatePoolRequest
} = require("../controllers/request");

router.get("/", getPoolRequests);
router.get("/:id", getPoolRequestById);
router.put("/status/:id", updatePoolRequestStatus);
router.patch("/:id", updatePoolRequest); // New PATCH route

module.exports = router;
