const pool = require("../db/pool");

// Get all contractors
const getContractors = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM contractors WHERE \"delete\" IS NOT TRUE ORDER BY name ASC");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching contractors:", err);
        res.status(500).json({ error: "Failed to fetch contractors" });
    }
};

// Create new contractor
const createContractor = async (req, res) => {
    const {
        name,
        phone,
        email,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        notes
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO contractors 
        (name, phone, email, address_line1, address_line2, city, state, postal_code, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
            [name, phone, email, address_line1, address_line2, city, state, postal_code, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error creating contractor:", err);
        res.status(500).json({ error: "Failed to create contractor" });
    }
};

// Update contractor by ID
const updateContractor = async (req, res) => {
    const { id } = req.params;
    const {
        name,
        phone,
        email,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        notes
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE contractors SET
        name = $1,
        phone = $2,
        email = $3,
        address_line1 = $4,
        address_line2 = $5,
        city = $6,
        state = $7,
        postal_code = $8,
        notes = $9,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
            [name, phone, email, address_line1, address_line2, city, state, postal_code, notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Contractor not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating contractor:", err);
        res.status(500).json({ error: "Failed to update contractor" });
    }
};

const deleteContractor = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE contractors SET "delete" = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Contractor not found" });
        }

        res.json({ message: "Contractor marked as deleted", contractor: result.rows[0] });
    } catch (err) {
        console.error("Error marking contractor as deleted:", err);
        res.status(500).json({ error: "Failed to mark contractor as deleted" });
    }
}

const getNotes = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM customer_notes WHERE customer_id = $1 ORDER BY date DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching notes:", err);
        res.status(500).json({ error: "Failed to fetch notes" });
    }
};

// Add a note for a customer
const addNote = async (req, res) => {
    const { id } = req.params;
    const { note } = req.body;

    if (!note) {
        return res.status(400).json({ error: "Note content is required" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO customer_notes (customer_id, note) VALUES ($1, $2) RETURNING *`,
            [id, note]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error adding note:", err);
        res.status(500).json({ error: "Failed to add note" });
    }
};

// Delete a specific note by note ID and customer ID
const deleteNote = async (req, res) => {
    const { id, noteId } = req.params;
    try {
        const result = await pool.query(
            `DELETE FROM customer_notes WHERE id = $1 AND customer_id = $2 RETURNING *`,
            [noteId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Note not found" });
        }

        res.json({ message: "Note deleted", note: result.rows[0] });
    } catch (err) {
        console.error("Error deleting note:", err);
        res.status(500).json({ error: "Failed to delete note" });
    }
};

module.exports = {
    getContractors,
    createContractor,
    updateContractor,
    deleteContractor,
    getNotes,
    addNote,
    deleteNote
};
