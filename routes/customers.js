const express = require("express");
const router = express.Router();
const {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getNotes,
  addNote,
  deleteNote,
  updateNote
} = require("../controllers/customers");


// Note routes
router.get("/:id/notes", getNotes);
router.post("/:id/notes", addNote);
router.put("/:id/notes/:noteId", updateNote);
router.delete("/:id/notes/:noteId", deleteNote);

router.get("/:id", getCustomers);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

router.get("/", getCustomers);
router.post("/", createCustomer);

module.exports = router;
