const pool = require("../db/pool");

// This helper function gets the main request and combines it with
// data from all related tables. It's used by both GET and PATCH.
const getFullRequestById = async (id) => {
    const requestResult = await pool.query('SELECT * FROM pool_table_requests WHERE id = $1', [id]);
    if (requestResult.rowCount === 0) {
        return null;
    }

    const [
        accessoriesResult,
        pocketImagesResult,
        repairsResult,
        servicesResult,
        tablePhotosResult
    ] = await Promise.all([
        pool.query('SELECT accessory FROM accessories_moving WHERE request_id = $1', [id]),
        pool.query('SELECT image_url FROM pocket_images WHERE request_id = $1', [id]),
        pool.query('SELECT repair FROM repairs_requested WHERE request_id = $1', [id]),
        pool.query('SELECT service FROM services_requested WHERE request_id = $1', [id]),
        pool.query('SELECT photo_url FROM table_photos WHERE request_id = $1', [id])
    ]);

    return {
        ...requestResult.rows[0],
        accessories: accessoriesResult.rows.map(r => r.accessory),
        pocket_images: pocketImagesResult.rows.map(r => r.image_url),
        repairs_requested: repairsResult.rows.map(r => r.repair),
        services_requested: servicesResult.rows.map(r => r.service),
        table_photos: tablePhotosResult.rows.map(r => r.photo_url),
    };
};


const getPoolRequests = async (req, res) => {
  const { page = 1, search = '' } = req.query;
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  try {
    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = `
        WHERE
          name_first ILIKE $1 OR
          name_last ILIKE $1 OR
          email ILIKE $1
      `;
      params.push(`%${search}%`);
    }

    const countQuery = `SELECT COUNT(*) FROM pool_table_requests ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    params.push(pageSize, offset);

    const dataQuery = `
      SELECT * FROM pool_table_requests
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(dataQuery, params);

    const cleanedRows = result.rows.map(row => {
      const filtered = {};
      for (let key in row) {
        if (row[key] !== null && row[key] !== '') {
          filtered[key] = row[key];
        }
      }
      return filtered;
    });

    res.json({ data: cleanedRows, totalCount });
  } catch (error) {
    console.error('Error fetching pool requests:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPoolRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await getFullRequestById(id);
        if (!data) {
            return res.status(404).json({ error: 'Request not found' });
        }
        res.json({ data });
    } catch (error) {
        console.error('Error fetching request by ID:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updatePoolRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE pool_table_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({ message: 'Status updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating pool request status:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updatePoolRequest = async (req, res) => {
    const { id } = req.params;
    const fields = req.body;

    if (Object.keys(fields).length === 0) {
        return res.status(400).json({ error: 'No fields to update provided' });
    }

    const relationalFieldMap = {
        repairs_requested: { table: 'repairs_requested', column: 'repair' },
        services_requested: { table: 'services_requested', column: 'service' },
        accessories: { table: 'accessories_moving', column: 'accessory' }
    };

    const regularFields = {};
    const relationalFields = {};

    for (const key in fields) {
        if (relationalFieldMap[key]) {
            relationalFields[key] = fields[key];
        } else {
            regularFields[key] = fields[key];
        }
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (Object.keys(regularFields).length > 0) {
            const setClauses = Object.keys(regularFields).map((key, index) => `"${key}" = $${index + 1}`).join(', ');
            const values = Object.values(regularFields);
            const updateQuery = `UPDATE pool_table_requests SET ${setClauses} WHERE id = $${values.length + 1}`;
            await client.query(updateQuery, [...values, id]);
        }

        for (const fieldName in relationalFields) {
            const config = relationalFieldMap[fieldName];
            const newValues = relationalFields[fieldName];

            await client.query(`DELETE FROM ${config.table} WHERE request_id = $1`, [id]);

            if (Array.isArray(newValues) && newValues.length > 0) {
                for (const value of newValues) {
                    const insertQuery = `INSERT INTO ${config.table} (request_id, ${config.column}) VALUES ($1, $2)`;
                    await client.query(insertQuery, [id, value]);
                }
            }
        }

        await client.query('COMMIT');
        
        const updatedRecord = await getFullRequestById(id);
        
        res.json({ message: 'Request updated successfully', data: updatedRecord });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating pool request:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};

module.exports = {
  getPoolRequests,
  updatePoolRequestStatus,
  getPoolRequestById,
  updatePoolRequest
};