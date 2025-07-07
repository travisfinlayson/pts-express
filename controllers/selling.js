const pool = require("../db/pool");

const getSellings = async (req, res) => {
  const page   = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit  = 20;
  const offset = (page - 1) * limit;
  const search = (req.query.search || '').trim();

  try {
    let dataQuery, countQuery;
    if (search) {
      const pattern = `%${search}%`;
      dataQuery = pool.query(
        `SELECT * FROM selling
         WHERE name_first ILIKE $3
            OR name_last  ILIKE $3
            OR email      ILIKE $3
         ORDER BY id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset, pattern]
      );
      countQuery = pool.query(
        `SELECT COUNT(*) FROM selling
         WHERE name_first ILIKE $1 OR name_last ILIKE $1 OR email ILIKE $1`,
        [pattern]
      );
    } else {
      dataQuery  = pool.query(`SELECT * FROM selling ORDER BY id DESC LIMIT $1 OFFSET $2`, [limit, offset]);
      countQuery = pool.query(`SELECT COUNT(*) FROM selling`);
    }

    const [dataRes, countRes] = await Promise.all([dataQuery, countQuery]);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    res.json({ data: dataRes.rows, totalCount });
  } catch (err) {
    console.error('getSellings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSellingStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'status required' });

    try {
        const { rowCount } = await pool.query(
            `UPDATE selling SET status = $1 WHERE id = $2`, [status, id]
        );
        if (!rowCount) return res.status(404).json({ message: 'Selling row not found' });
        res.json({ message: 'Status updated' });
    } catch (err) {
        console.error('updateSellingStatus error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getSellings, updateSellingStatus };
