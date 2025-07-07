const express = require("express");
const router = express.Router();
const {
  getContractors,
  createContractor,
  updateContractor,
  deleteContractor
} = require("../controllers/contractors");

router.get("/", getContractors);
router.post("/", createContractor);
router.put("/:id", updateContractor);
router.delete("/:id", deleteContractor);

module.exports = router;
