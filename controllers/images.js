const pool = require("../db/pool");

// Get all customers
const getPoolTableImages = async (req, res) => {
    const { id } = req.params;

    try {
        if (id) {
            const result = await pool.query(
                `SELECT * FROM table_photos WHERE request_id = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "No Images Found" });
            }

            return res.json(result.rows);
        } else {
            return null;
        }
    } catch (err) {
        console.error("Error fetching image(s):", err);
        res.status(500).json({ error: "Failed to fetch image(s)" });
    }
};

const getPocketImages = async (req, res) => {
    const { id } = req.params;

    try {
        if (id) {
            const result = await pool.query(
                `SELECT * FROM pocket_images WHERE request_id = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "No Pocket Images Found" });
            }

            return res.json(result.rows);
        } else {
            return null;
        }
    } catch (err) {
        console.error("Error fetching pocket image(s):", err);
        res.status(500).json({ error: "Failed to fetch pocket image(s)" });
    }
};

const getSellingAccessoryImages = async (req, res) => {
    const { id } = req.params;

    try {
        if (id) {
            const result = await pool.query(
                `SELECT * FROM selling_accessories WHERE selling_id = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "No Accessory Images Found" });
            }

            return res.json(result.rows);
        } else {
            return null;
        }
    } catch (err) {
        console.error("Error fetching accessory image(s):", err);
        res.status(500).json({ error: "Failed to fetch accessory image(s)" });
    }
};

const getAdditionalSellingImages = async (req, res) => {
    const { id } = req.params;

    try {
        if (id) {
            const result = await pool.query(
                `SELECT * FROM additional_selling_images WHERE selling_id = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "No Additional Selling Images Found" });
            }

            return res.json(result.rows);
        } else {
            return null;
        }
    } catch (err) {
        console.error("Error fetching additional selling image(s):", err);
        res.status(500).json({ error: "Failed to fetch additional selling image(s)" });
    }
};

const getSellingDefectImages = async (req, res) => {
    const { id } = req.params;

    try {
        if (id) {
            const result = await pool.query(
                `SELECT * FROM selling_defects WHERE selling_id = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "No Defect Images Found" });
            }

            return res.json(result.rows);
        } else {
            return null;
        }
    } catch (err) {
        console.error("Error fetching defect image(s):", err);
        res.status(500).json({ error: "Failed to fetch defect image(s)" });
    }
};

module.exports = {
    getPoolTableImages,
    getPocketImages,
    getSellingAccessoryImages,
    getAdditionalSellingImages,
    getSellingDefectImages
};
