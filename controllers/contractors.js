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

// Get contractor by ID
const getContractor = async (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT
            c.*,
            -- Aggregate stair_rates into a JSON array
            COALESCE(
                (SELECT json_agg(sr.*) FROM stair_rates sr WHERE sr.contractor_id = c.id),
                '[]'::json
            ) AS stair_rates,
            -- Aggregate table_surcharges into a JSON array
            COALESCE(
                (SELECT json_agg(ts.*) FROM table_surcharges ts WHERE ts.contractor_id = c.id),
                '[]'::json
            ) AS surcharges
        FROM
            contractors c
        WHERE
            c.id = $1 AND c."delete" IS NOT TRUE;
    `;

    try {
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Contractor not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching contractor details:", err);
        res.status(500).json({ error: "Failed to fetch contractor details" });
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
        notes,
        per_mile_rate,
        stair_rates,   // Expected to be an array of objects
        surcharges     // Expected to be an array of objects
    } = req.body;

    const client = await pool.connect(); // Get a client from the pool for the transaction

    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Insert the main contractor record and get the new ID
        const contractorInsertQuery = `
            INSERT INTO contractors (name, phone, email, address_line1, address_line2, city, state, postal_code, notes, per_mile_rate)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        const contractorResult = await client.query(contractorInsertQuery, [
            name, phone, email, address_line1, address_line2, city, state, postal_code, notes, per_mile_rate
        ]);
        const newContractor = contractorResult.rows[0];
        const newContractorId = newContractor.id;

        // 2. Insert new stair rates if any were provided
        if (stair_rates && stair_rates.length > 0) {
            const stairValues = stair_rates.map(rate => `(${newContractorId}, '${rate.table_size}', ${rate.rate_per_flight})`).join(',');
            await client.query(`INSERT INTO stair_rates (contractor_id, table_size, rate_per_flight) VALUES ${stairValues};`);
        }

        // 3. Insert new surcharges if any were provided
        if (surcharges && surcharges.length > 0) {
            const surchargeValues = surcharges.map(s => `(${newContractorId}, '${s.table_style}', '${s.table_size}', ${s.surcharge_amount})`).join(',');
            await client.query(`INSERT INTO table_surcharges (contractor_id, table_style, table_size, surcharge_amount) VALUES ${surchargeValues};`);
        }

        await client.query('COMMIT'); // Commit the transaction

        // Construct a full response object
        const fullNewContractor = {
            ...newContractor,
            stair_rates: stair_rates || [],
            surcharges: surcharges || []
        };

        res.status(201).json(fullNewContractor);

    } catch (err) {
        await client.query('ROLLBACK'); // Roll back on any error
        console.error("Error creating contractor:", err);

        // Provide a more specific error for duplicate names
        if (err.code === '23505' && err.constraint === 'contractors_name_unique') {
            return res.status(409).json({ error: "A contractor with this name already exists." });
        }
        
        res.status(500).json({ error: "Failed to create contractor" });
    } finally {
        client.release(); // IMPORTANT: Release the client back to the pool
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
        notes,
        per_mile_rate, // New field
        stair_rates,   // New array of objects
        surcharges     // New array of objects
    } = req.body;

    const client = await pool.connect(); // Get a client from the pool for transaction

    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Update the main contractor table
        const contractorUpdateQuery = `
            UPDATE contractors SET
                name = $1, phone = $2, email = $3, address_line1 = $4,
                address_line2 = $5, city = $6, state = $7, postal_code = $8,
                notes = $9, per_mile_rate = $10, updated_at = CURRENT_TIMESTAMP
            WHERE id = $11
            RETURNING *;
        `;
        const contractorResult = await client.query(contractorUpdateQuery, [
            name, phone, email, address_line1, address_line2, city, state, postal_code, notes, per_mile_rate, id
        ]);

        if (contractorResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Contractor not found" });
        }

        // 2. Delete old stair rates and surcharges
        await client.query('DELETE FROM stair_rates WHERE contractor_id = $1', [id]);
        await client.query('DELETE FROM table_surcharges WHERE contractor_id = $1', [id]);

        // 3. Insert new stair rates if any were provided
        if (stair_rates && stair_rates.length > 0) {
            const stairValues = stair_rates.map(rate => `(${id}, '${rate.table_size}', ${rate.rate_per_flight})`).join(',');
            await client.query(`INSERT INTO stair_rates (contractor_id, table_size, rate_per_flight) VALUES ${stairValues};`);
        }

        // 4. Insert new surcharges if any were provided
        if (surcharges && surcharges.length > 0) {
            const surchargeValues = surcharges.map(s => `(${id}, '${s.table_style}', '${s.table_size}', ${s.surcharge_amount})`).join(',');
            await client.query(`INSERT INTO table_surcharges (contractor_id, table_style, table_size, surcharge_amount) VALUES ${surchargeValues};`);
        }

        await client.query('COMMIT'); // Commit transaction

        // Fetch the newly updated full profile to return
        // (You can call the new getContractor logic here or just return a success message)
        res.json({ message: "Contractor updated successfully" });

    } catch (err) {
        await client.query('ROLLBACK'); // Roll back on error
        console.error("Error updating contractor:", err);
        res.status(500).json({ error: "Failed to update contractor" });
    } finally {
        client.release(); // Release the client back to the pool
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

/**
 * @description Get all service prices for a specific contractor.
 */
const getContractorPrices = async (req, res) => {
  const { id } = req.params; // The contractor_id

  try {
    const pricesData = await pool.query(
      'SELECT * FROM contractor_prices WHERE contractor_id = $1',
      [id]
    );
    // Note: We don't wrap this in a { data: ... } object because the frontend
    // logic expects a direct array for the prices.
    res.status(200).json(pricesData.rows);
  } catch (err) {
    console.error('Error in getContractorPrices:', err.stack);
    res.status(500).json({ message: 'Server error while fetching prices.' });
  }
};

/**
 * @description Update all service prices for a contractor.
 * This function deletes all old prices and inserts the new set in a single transaction.
 */
const updateContractorPrices = async (req, res) => {
  const { id } = req.params; // The contractor_id
  const prices = req.body;   // The array of price objects from the React app

  // Use a single client for the transaction
  const client = await pool.connect();

  try {
    // Start a database transaction
    await client.query('BEGIN');

    // Step 1: Delete all old prices for this contractor to ensure a clean slate.
    await client.query('DELETE FROM contractor_prices WHERE contractor_id = $1', [id]);

    // Step 2: Insert all the new prices sent from the front end.
    if (prices && prices.length > 0) {
      for (const price of prices) {
        // Note the use of double quotes around "price" and "sub_price" to match the table definition
        await client.query(
          `INSERT INTO contractor_prices (contractor_id, service_id, "price", "sub_price", material_cost)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, price.service_id, price.price, price.sub_price, price.material_cost]
        );
      }
    }
    
    // Finalize the transaction
    await client.query('COMMIT');
    res.status(200).json({ message: 'Prices updated successfully.' });

  } catch (err) {
    // If any error occurs, roll back all changes
    await client.query('ROLLBACK');
    console.error('Error in updateContractorPrices:', err.stack);
    res.status(500).json({ message: 'Failed to update prices due to a server error.' });
  } finally {
    // Release the client back to the connection pool
    client.release();
  }
};

/**
 * @description Get all main services (id and service_name).
 */
const getMainServices = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, service_name FROM main_services');
        console.log('Main services:', result.rows);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error in getMainServices:', err.stack);
        res.status(500).json({ message: 'Server error while fetching main services.' });
    }
};

/**
 * @description Get all service surcharges for a specific contractor.
 * Returns service_id and surcharge_percent for each row where contractor_id matches.
 */
const getContractorSurcharges = async (req, res) => {
  const { id } = req.params; // The contractor_id

  try {
    const result = await pool.query(
      'SELECT service_id, surcharge_percent FROM service_surcharges WHERE contractor_id = $1',
      [id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getContractorSurcharges:', err.stack);
    res.status(500).json({ message: 'Server error while fetching service surcharges.' });
  }
};

/**
 * @description Update or create a service surcharge for a contractor.
 * Checks if a row exists, then updates or inserts accordingly.
 */
const setContractorSurcharge = async (req, res) => {
  const { contractor_id, service_id, surcharge_percent } = req.body;

  if (!contractor_id || !service_id || surcharge_percent === undefined) {
    return res.status(400).json({ 
      error: 'contractor_id, service_id, and surcharge_percent are required' 
    });
  }

  try {
    // First, check if the row exists
    const existingRow = await pool.query(
      'SELECT * FROM service_surcharges WHERE contractor_id = $1 AND service_id = $2',
      [contractor_id, service_id]
    );

    let result;
    if (existingRow.rows.length > 0) {
      // Update existing row
      result = await pool.query(
        `UPDATE service_surcharges 
         SET surcharge_percent = $3 
         WHERE contractor_id = $1 AND service_id = $2 
         RETURNING *`,
        [contractor_id, service_id, surcharge_percent]
      );
    } else {
      // Insert new row
      result = await pool.query(
        `INSERT INTO service_surcharges (contractor_id, service_id, surcharge_percent)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [contractor_id, service_id, surcharge_percent]
      );
    }
    
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error in setContractorSurcharge:', err.stack);
    res.status(500).json({ message: 'Failed to set contractor surcharge.' });
  }
};

module.exports = {
    getContractors,
    getContractor,
    createContractor,
    updateContractor,
    deleteContractor,
    getNotes,
    addNote,
    deleteNote,
    getContractorPrices,
    updateContractorPrices,
    getMainServices,
    getContractorSurcharges,
    setContractorSurcharge
};
