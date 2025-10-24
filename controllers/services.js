const pool = require("../db/pool");

/**
 * @description Get all services from the database, ordered by name and size.
 */
const getServices = async (req, res) => {
  try {
    const serviceData = await pool.query(
      'SELECT * FROM services ORDER BY service_name, table_size_ft'
    );
    // The frontend expects the response to have a "data" property
    res.status(200).json({ data: serviceData.rows });
  } catch (err) {
    console.error('Error in getServices:', err.stack);
    res.status(500).json({ message: 'Server error while fetching services.' });
  }
};

/**
 * @description Create a new service in the database.
 */
const createService = async (req, res) => {
    const { service_name, table_size_ft } = req.body;

    if (!service_name || !service_name.trim()) {
        return res.status(400).json({ message: 'Service name is required.' });
    }

    // Convert empty string or undefined to null for the database
    const size = table_size_ft ? parseFloat(table_size_ft) : null;

    try {
        const newService = await pool.query(
            `INSERT INTO services (service_name, table_size_ft)
             VALUES ($1, $2)
             RETURNING *`, // This returns the newly created row
            [service_name.trim(), size]
        );
        res.status(201).json(newService.rows[0]);
    } catch (err) {
        console.error('Error in createService:', err.stack);
        // Check for the unique constraint violation error
        if (err.code === '23505') {
            return res.status(409).json({ message: 'This service and table size combination already exists.' });
        }
        res.status(500).json({ message: 'Server error while creating the service.' });
    }
};

/**
 * @description Delete a service from the database by its ID.
 */
const deleteService = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: 'Service ID is required.'});
    }

    try {
        const deleteResult = await pool.query(
            'DELETE FROM services WHERE service_id = $1',
            [id]
        );

        // rowCount will be 0 if no service with that ID was found
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ message: 'Service not found.' });
        }

        res.status(200).json({ message: 'Service deleted successfully.' });
    } catch (err) {
        console.error('Error in deleteService:', err.stack);
        // This error code means you tried to delete something that is still being used by another table
        if (err.code === '23503') {
             return res.status(409).json({ message: 'Cannot delete this service. It is currently assigned to one or more contractor price lists.' });
        }
        res.status(500).json({ message: 'Server error while deleting the service.' });
    }
};

module.exports = {
    getServices,
    createService,
    deleteService
};