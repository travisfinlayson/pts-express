const express = require("express");
const router = express.Router();
const {
  getSellings,
  updateSellingStatus
} = require("../controllers/selling");


router.get("/", getSellings);
router.put("/status/:id", updateSellingStatus);

module.exports = router;