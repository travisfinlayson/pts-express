const express = require("express");
const router = express.Router();
const {
  getInquiries,
  updateInquiryStatus
} = require("../controllers/inquiries");

router.get("/", getInquiries);
router.put("/status/:id", updateInquiryStatus);

module.exports = router;
