// controllers/contactController.js
const pool = require('../db/pool.js');

// GET /api/contacts/:id
const getContact = async function(req, res) {
    const { id } = req.params;

    try {
        const { rows } = await pool.query(
            `SELECT c.comments, c.status,
                            cu.name_first,
                            cu.name_last,
                            cu.email,
                            cu.phone
             FROM   contact        AS c
             JOIN   customers      AS cu ON cu.id = c.customer_id
             WHERE  c.id = $1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('getContact error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/contacts?page=1
const getContacts = async function (req, res) {
  console.log('getContacts called with query:', req.query);

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = parseInt(req.query.pageSize, 10) || 20;
  const offset = (page - 1) * limit;
  const search = (req.query.search || '').trim();

  try {
    let dataQuery, countQuery;
    let values = [limit, offset];

    if (search) {
      const searchPattern = `%${search}%`;

      dataQuery = pool.query(
        `SELECT c.id,
                c.status,
                c.comments,
                cu.name_first,
                cu.name_last,
                cu.email,
                cu.phone
         FROM   contact AS c
         JOIN   customers AS cu ON cu.id = c.customer_id
         WHERE  cu.name_first ILIKE $3
            OR  cu.name_last ILIKE $3
            OR  cu.email ILIKE $3
         ORDER  BY c.id DESC
         LIMIT  $1 OFFSET $2`,
        [...values, searchPattern]
      );

      countQuery = pool.query(
        `SELECT COUNT(*)
         FROM   contact AS c
         JOIN   customers AS cu ON cu.id = c.customer_id
         WHERE  cu.name_first ILIKE $1
            OR  cu.name_last ILIKE $1
            OR  cu.email ILIKE $1`,
        [searchPattern]
      );
    } else {
      dataQuery = pool.query(
        `SELECT c.id,
                c.status,
                c.comments,
                cu.name_first,
                cu.name_last,
                cu.email,
                cu.phone
         FROM   contact AS c
         JOIN   customers AS cu ON cu.id = c.customer_id
         ORDER  BY c.id DESC
         LIMIT  $1 OFFSET $2`,
        values
      );

      countQuery = pool.query('SELECT COUNT(*) FROM contact');
    }

    const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      page,
      totalPages,
      pageSize: limit,
      totalCount,
      data: dataResult.rows,
    });
  } catch (err) {
    console.error('getContacts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


const updateContactStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  try {
    const { rowCount } = await pool.query(
      `UPDATE contact SET status = $1 WHERE id = $2`,
      [status, id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: "Contact not found" });
    }

    res.json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("updateContactStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getContact, getContacts, updateContactStatus };