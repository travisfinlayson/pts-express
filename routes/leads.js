const express = require("express");
const router = express.Router();
const {
    getCombinedEntries,
    getStatuses
} = require("../controllers/combinedEntries");


// Note routes
// Existing combined entries route
router.get("/entries-by-status", getCombinedEntries);

// New route to get all statuses
router.get("/statuses", getStatuses);

module.exports = router;