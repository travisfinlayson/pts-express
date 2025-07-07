const express = require("express");
const router = express.Router();
const {
  getPoolTableImages,
  getPocketImages,
  getSellingAccessoryImages,
  getAdditionalSellingImages,
  getSellingDefectImages
} = require("../controllers/images");


router.get("/pool-table-images/:id", getPoolTableImages);
router.get("/pocket-images/:id", getPocketImages);
router.get("/selling-accessory-images/:id", getSellingAccessoryImages);
router.get("/additional-selling-images/:id", getAdditionalSellingImages);
router.get("/selling-defect-images/:id", getSellingDefectImages);

module.exports = router;
