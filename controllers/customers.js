const pool = require("../db/pool");

// Get all customers
const getCustomers = async (req, res) => {
  const { id } = req.params;
  const { page = 1, pageSize = 20, search = '' } = req.query;

  const offset = (page - 1) * pageSize;

  try {
    if (id) {
      const result = await pool.query(
        `SELECT * FROM customers WHERE id = $1 AND "delete" IS NOT TRUE`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Customer not found" });
      }

      return res.json(result.rows[0]);
    } else {
      // Build the base WHERE clause and parameters
      let whereClause = `"delete" IS NOT TRUE`;
      const params = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` AND (
          LOWER(name_first) LIKE LOWER($${paramIndex}) OR
          LOWER(name_last) LIKE LOWER($${paramIndex}) OR
          LOWER(email) LIKE LOWER($${paramIndex})
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Get total count for pagination
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM customers WHERE ${whereClause}`,
        params
      );
      const totalCount = parseInt(countResult.rows[0].count, 10);

      // Add pagination params
      params.push(pageSize);
      params.push(offset);

      // Query paginated data ordered by last name
      const dataResult = await pool.query(
        `SELECT * FROM customers WHERE ${whereClause} ORDER BY name_last ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      return res.json({
        data: dataResult.rows,
        totalCount,
      });
    }
  } catch (err) {
    console.error("Error fetching customer(s):", err);
    res.status(500).json({ error: "Failed to fetch customer(s)" });
  }
};



// Create new customer
const createCustomer = async (req, res) => {
  const {
    name_first,
    name_last,
    phone,
    email
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO customers 
        (name_first, name_last, phone, email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name_first, name_last, phone, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating customer:", err);
    res.status(500).json({ error: "Failed to create customer" });
  }
};

// Update customer by ID
const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const {
    name_first,
    name_last,
    phone,
    email
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE customers SET
        name_first = $1,
        name_last = $2,
        phone = $3,
        email = $4,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name_first, name_last, phone, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating customer:", err);
    res.status(500).json({ error: "Failed to update customer" });
  }
};

const deleteCustomer = async (req, res) => {
  const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE customers SET "delete" = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Customer not found" });
        }

        res.json({ message: "Customer marked as deleted", customer: result.rows[0] });
    } catch (err) {
        console.error("Error marking customer as deleted:", err);
        res.status(500).json({ error: "Failed to mark customer as deleted" });
    }
}

const updateNote = async (req, res) => {
  const { id, noteId } = req.params;
  const { note } = req.body;

  if (!note) {
    return res.status(400).json({ error: "Note content is required" });
  }

  try {
    const result = await pool.query(
      `UPDATE customer_notes
       SET note = $1, date = CURRENT_TIMESTAMP
       WHERE id = $2 AND customer_id = $3
       RETURNING *`,
      [note, noteId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating note:", err);
    res.status(500).json({ error: "Failed to update note" });
  }
};

const getNotes = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM customer_notes WHERE customer_id = $1 ORDER BY date DESC",
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching notes:", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};

const addNote = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO customer_notes (customer_id, note) VALUES ($1, $2) RETURNING *",
      [id, note]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding note:", err);
    res.status(500).json({ error: "Failed to add note" });
  }
};

const deleteNote = async (req, res) => {
  const { id, noteId } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM customer_notes WHERE id = $1 AND customer_id = $2 RETURNING *",
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
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  updateNote,
  getNotes,
  addNote,
  deleteNote
};
