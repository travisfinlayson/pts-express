const pool = require("../db/pool");

const getInquiries = async (req, res) => {
  const { page = 1 } = req.query;
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM table_inquiry');
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT * FROM table_inquiry
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

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
    console.error('Error fetching inquiries:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateInquiryStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['new', 'responded', 'job created'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await pool.query(
      'UPDATE table_inquiry SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    res.json({ message: 'Status updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating inquiry status:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getInquiries,
  updateInquiryStatus
};
