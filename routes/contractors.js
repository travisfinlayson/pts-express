const express = require("express");
const router = express.Router();
const {
  getContractors,
  getContractor,
  createContractor,
  updateContractor,
  deleteContractor,
  getContractorPrices,
  updateContractorPrices,
  getMainServices,
  getContractorSurcharges,
  setContractorSurcharge
} = require("../controllers/contractors");

router.get("/", getContractors);
router.get("/main-services", getMainServices);
router.get("/:id", getContractor);
router.post("/", createContractor);
router.put("/:id", updateContractor);
router.delete("/:id", deleteContractor);
router.get("/:id/prices", getContractorPrices);
router.put("/:id/prices", updateContractorPrices);
router.get("/:id/surcharges", getContractorSurcharges);
router.post("/surcharges", setContractorSurcharge);

module.exports = router;
