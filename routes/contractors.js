const express = require("express");
const router = express.Router();
const {
  getContractors,
  getContractor,
  createContractor,
  updateContractor,
  deleteContractor,
  getContractorPrices,
  updateContractorPrices
} = require("../controllers/contractors");

router.get("/", getContractors);
router.get("/:id", getContractor);
router.post("/", createContractor);
router.put("/:id", updateContractor);
router.delete("/:id", deleteContractor);
router.get("/:id/prices", getContractorPrices);
router.put("/:id/prices", updateContractorPrices);

module.exports = router;
