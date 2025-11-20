const express = require('express');
const router = express.Router();
const pool = require('../db/pool.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('./authMiddleWare.js');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

// Register a new user
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    // Create JWT token
    const token = jwt.sign({ userId: newUser.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });

    // Set the JWT as HttpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true, // Prevent access to the cookie via JavaScript
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // Token expires in 7 days
      sameSite: 'Lax', // Prevent CSRF attacks
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Login existing user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('🔑 auth.js /login route called');

  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign({ userId: user.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });

    // Set the JWT as HttpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true, // Prevent access to the cookie via JavaScript
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // Token expires in 7 days
      sameSite: 'Lax', // Prevent CSRF attacks
    });

    res.status(200).json({ message: 'Logged in successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

router.get('/check', authenticateToken, (req, res) => {
  res.status(200).json({ loggedIn: true });
});

// In your Express router file
router.get('/request-data', authenticateToken, async (req, res) => {
  const { page = 1, search = '' } = req.query;
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  try {
    // Build the WHERE clause dynamically
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

    // Get total count for filtered rows
    const countQuery = `SELECT COUNT(*) FROM pool_table_requests ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Add pagination params
    params.push(pageSize, offset);

    // Query filtered and paginated rows
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

    res.json({
      data: cleanedRows,
      totalCount,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.put('/update-status', authenticateToken, async (req, res) => {
  console.log('Received request to update status:', req.body);
  const { request_id, status } = req.body;

  if (!request_id || !status) {
    return res.status(400).json({ error: 'Request ID and status are required' });
  }

  const validStatuses = ['new', 'responded', 'job created'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await pool.query(
      'UPDATE pool_table_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, request_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({ message: 'Status updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/update-inquiry-status', authenticateToken, async (req, res) => {
  console.log('Received request to update status:', req.body);
  const { request_id, status } = req.body;

  if (!request_id || !status) {
    return res.status(400).json({ error: 'Request ID and status are required' });
  }

  const validStatuses = ['new', 'responded', 'job created'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await pool.query(
      'UPDATE table_inquiry SET status = $1 WHERE id = $2 RETURNING *',
      [status, request_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({ message: 'Status updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/request-inquiry-data', authenticateToken, async (req, res) => {
  const { page = 1 } = req.query;
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  try {
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM table_inquiry');
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Get page data
    const result = await pool.query(
      `
        SELECT * FROM table_inquiry
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        `,
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

    res.json({
      data: cleanedRows,
      totalCount, // send the total number of rows
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});



module.exports = router;
