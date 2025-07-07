const { pool } = require("../db/pool.js");

const buyingModalHandler = async (req, res) => {
    try {
        console.log("Received Payload:", req.body);
        const payload = JSON.parse(req.body.rawRequest);

        // Extract fields from the payload
        const nameFirst = payload.q50_name?.first || null;
        const nameLast = payload.q50_name?.last || null;
        const email = payload.q44_email || null;
        const phoneNumber = payload.q46_phoneNumber?.full || null;
        const city = payload.q45_city || null;
        const state = payload.q47_state || null;
        const budget = payload.q40_budgetincluding || null;  // Text field
        const desiredTableSize = payload.q51_desiredTable51 || null;

        // Check if Google Ads, Bing Ads, or Facebook Ads are marked as "true"
        const googleAds = payload.q52_googleAds === "true" || payload.q52_googleAds === true;
        const bingAds = payload.q53_bingAds === "true" || payload.q53_bingAds === true;
        const facebookAds = payload.q54_facebookAds === "true" || payload.q54_facebookAds === true;

        // Ensure email is provided
        if (!email) {
            return res.status(400).send("Email is required to process request.");
        }

        // First, check if the customer exists or if we need to insert a new customer
        let customerId;
        const customerQuery = `
            INSERT INTO customers (email, name_first, name_last, phone, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (email) 
            DO UPDATE 
                SET name_first = COALESCE(EXCLUDED.name_first, customers.name_first),
                    name_last = COALESCE(EXCLUDED.name_last, customers.name_last),
                    phone = COALESCE(EXCLUDED.phone, customers.phone),
                    updated_at = NOW()
            RETURNING id;
        `;
        const customerValues = [email, nameFirst, nameLast, phoneNumber];
        const customerResult = await pool.query(customerQuery, customerValues);
        customerId = customerResult.rows[0].id;

        // Insert into the 'buying' table
        const buyingQuery = `
            INSERT INTO buying (
                customer_id, name_first, name_last, email, phone_number, city, state, 
                budget, desired_table_size, google_ads, bing_ads, facebook_ads
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id;
        `;

        const buyingValues = [
            customerId, nameFirst, nameLast, email, phoneNumber, city, state, 
            budget, desiredTableSize, googleAds, bingAds, facebookAds
        ];

        const result = await pool.query(buyingQuery, buyingValues);
        const buyingId = result.rows[0].id;

        console.log("Buying record inserted with ID:", buyingId);
        res.status(200).send("Buying modal data processed successfully.");
    } catch (error) {
        console.error("Error processing buying modal:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = { buyingModalHandler };
