const pool = require('../db/pool.js');

const getCombinedEntries = async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    sortField = 'created_at',
    sortOrder = 'desc',
    search = '',
    statuses = '',
  } = req.query;

  const limit = parseInt(pageSize, 10);
  const offset = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  const statusArray = statuses
    ? statuses.split(',').map(s => s.trim()).filter(s => s)
    : [];

  try {
    const queryParams = [];

    const requestSearchClause = search
      ? `(r.name_first ILIKE $${queryParams.length + 1} OR r.name_last ILIKE $${queryParams.length + 1})`
      : '';
    if (search) queryParams.push(searchPattern);

    const contactSearchClause = search
      ? `(cu.name_first ILIKE $${queryParams.length + 1} OR cu.name_last ILIKE $${queryParams.length + 1})`
      : '';
    if (search) queryParams.push(searchPattern);

    let requestStatusClause = '', contactStatusClause = '';
    if (statusArray.length > 0) {
      const statusPlaceholders = statusArray.map((_, i) => `$${queryParams.length + i + 1}`);
      queryParams.push(...statusArray);
      requestStatusClause = `r.status IN (${statusPlaceholders.join(', ')})`;

      const contactPlaceholders = statusArray.map((_, i) => `$${queryParams.length + i + 1}`);
      queryParams.push(...statusArray);
      contactStatusClause = `c.status IN (${contactPlaceholders.join(', ')})`;
    }

    const buildWhereClause = (...clauses) => clauses.filter(Boolean).join(' AND ');
    const requestWhere = buildWhereClause(requestSearchClause, requestStatusClause);
    const contactWhere = buildWhereClause(contactSearchClause, contactStatusClause);

    queryParams.push(limit, offset);

    const combinedQuery = `
      SELECT 
        r.id, r.status, r.name_first, r.name_last,
        (r.name_first || ' ' || r.name_last) AS full_name,
        r.created_at, 
        CASE
          WHEN r.scheduled_date IS NOT NULL THEN
            TO_CHAR(r.scheduled_date, 'MM/DD/YYYY') ||
            COALESCE(' ' || TO_CHAR(r.start_time, 'HH12:MI AM'), '') ||
            COALESCE(' - ' || TO_CHAR(r.end_time, 'HH12:MI AM'), '')
          ELSE NULL
        END AS scheduled_date_time,
        r.contractor_id, con.name AS contractor_name,
        CASE
          WHEN r.service_looking ILIKE '%set up%' OR r.service_looking ILIKE '%assembly%' THEN
            CASE WHEN EXISTS (SELECT 1 FROM repairs_requested rr WHERE rr.request_id = r.id AND rr.repair ILIKE '%felt%')
              THEN 'Assembly / Refelt'
              ELSE 'Assembly'
            END
          WHEN r.service_looking ILIKE '%disassembl%' OR r.service_looking ILIKE '%dispos%' THEN
            CASE WHEN EXISTS (SELECT 1 FROM repairs_requested rr WHERE rr.request_id = r.id AND rr.repair ILIKE '%felt%')
              THEN 'Disassembly / Refelt'
              ELSE 'Disassembly'
            END
          WHEN r.service_looking ILIKE '%move%' AND r.service_looking ILIKE '%within%' THEN
            CASE WHEN EXISTS (SELECT 1 FROM repairs_requested rr WHERE rr.request_id = r.id AND rr.repair ILIKE '%felt%')
              THEN 'Move (Within Home) / Refelt'
              ELSE 'Move (Within Home)'
            END
          WHEN r.service_looking ILIKE '%move%' THEN
            CASE WHEN EXISTS (SELECT 1 FROM repairs_requested rr WHERE rr.request_id = r.id AND rr.repair ILIKE '%felt%')
              THEN 'Move / Refelt'
              ELSE 'Move'
            END
          WHEN r.service_looking ILIKE '%repair%' OR r.service_looking ILIKE '%work done%' THEN
            CASE WHEN EXISTS (SELECT 1 FROM repairs_requested rr WHERE rr.request_id = r.id AND rr.repair ILIKE '%felt%')
              THEN 'Repair / Refelt'
              ELSE 'Repair'
            END
          WHEN r.service_looking ILIKE '%multiple%' THEN
            CASE WHEN EXISTS (SELECT 1 FROM repairs_requested rr WHERE rr.request_id = r.id AND rr.repair ILIKE '%felt%')
              THEN 'Multiple Services / Refelt'
              ELSE 'Multiple Services'
            END
          WHEN EXISTS (SELECT 1 FROM repairs_requested rr WHERE rr.request_id = r.id AND rr.repair ILIKE '%felt%')
            THEN 'Refelt'
          ELSE r.service_looking
        END AS job_type,
        'request' AS source
      FROM pool_table_requests r
      LEFT JOIN contractors con ON r.contractor_id = con.id
      ${requestWhere ? 'WHERE ' + requestWhere : ''}

      UNION ALL

      SELECT 
        c.id, c.status, cu.name_first, cu.name_last,
        (cu.name_first || ' ' || cu.name_last) AS full_name,
        c.created_at, 
        NULL, NULL, NULL, NULL,
        'contact'
      FROM contact c
      JOIN customers cu ON cu.id = c.customer_id
      ${contactWhere ? 'WHERE ' + contactWhere : ''}

      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const countQuery = `
      SELECT COUNT(*) FROM (
        SELECT r.id FROM pool_table_requests r ${requestWhere ? 'WHERE ' + requestWhere : ''}
        UNION ALL
        SELECT c.id FROM contact c
        JOIN customers cu ON cu.id = c.customer_id
        ${contactWhere ? 'WHERE ' + contactWhere : ''}
      ) AS combined
    `;

    const countQueryParams = queryParams.slice(0, -2);

    const [dataResult, countResult] = await Promise.all([
      pool.query(combinedQuery, queryParams),
      pool.query(countQuery, countQueryParams),
    ]);

    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / limit);

    const cleanedRows = dataResult.rows.map(row => {
      const cleaned = {};
      for (let key in row) {
        if (row[key] !== null && row[key] !== '') {
          cleaned[key] = row[key];
        }
      }
      return cleaned;
    });

    res.json({
      page: parseInt(page, 10),
      totalPages,
      pageSize: limit,
      totalCount,
      data: cleanedRows,
    });

  } catch (error) {
    console.error('Error fetching combined entries:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getStatuses = async (req, res) => {
  try {
    const [requestRes, contactRes] = await Promise.all([
      pool.query(`SELECT DISTINCT status FROM pool_table_requests WHERE status IS NOT NULL`),
      pool.query(`SELECT DISTINCT status FROM contact WHERE status IS NOT NULL`),
    ]);

    const statusSet = new Set();
    requestRes.rows.forEach(row => statusSet.add(row.status));
    contactRes.rows.forEach(row => statusSet.add(row.status));

    res.json({ statuses: Array.from(statusSet).sort() });
  } catch (error) {
    console.error('Error fetching statuses:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getCombinedEntries, getStatuses };
