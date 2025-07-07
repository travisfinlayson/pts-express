const express = require("express");
const router = express.Router();
const {
    getContacts,
    getContact,
    updateContactStatus
} = require("../controllers/contacts");


// Note routes
router.put("/update-status/:id", updateContactStatus);
router.get("/", getContacts);

router.get("/:id", getContact);


module.exports = router;
