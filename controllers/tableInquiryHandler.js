const pool = require("../db/pool.js");

const tableInquiryHandler = async (req, res) => {
    try {
        console.log("Received Payload:", req.body);
        const payload = JSON.parse(req.body.rawRequest);

        // Extract fields from the payload
        const nameFirst = payload.q3_name?.first || null;
        const nameLast = payload.q3_name?.last || null;
        const email = payload.q4_email || null;
        const questionsAbout = payload.q5_questionsAbout || null;
        const productId = payload.q6_productId || null;
        const productUrl = payload.q7_productUrl || null;
        const googleAds = payload.q8_googleAds === "true" || payload.q8_googleAds === true;
        const bingAds = payload.q9_bingAds === "true" || payload.q9_bingAds === true;
        const facebookAds = payload.q10_facebookAds === "true" || payload.q10_facebookAds === true;

        // Ensure email is provided
        if (!email) {
            return res.status(400).send("Email is required to process request.");
        }

        // First, check if the customer exists or if we need to insert a new customer
        let customerId;
        const customerQuery = `
            INSERT INTO customers (email, name_first, name_last, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (email) 
            DO UPDATE 
                SET name_first = COALESCE(EXCLUDED.name_first, customers.name_first),
                    name_last = COALESCE(EXCLUDED.name_last, customers.name_last),
                    updated_at = NOW()
            RETURNING id;
        `;
        const customerValues = [email, nameFirst, nameLast];
        const customerResult = await pool.query(customerQuery, customerValues);
        customerId = customerResult.rows[0].id;

        // Insert into the 'table_inquiry' table
        const inquiryQuery = `
            INSERT INTO table_inquiry (
                customer_id, name_first, name_last, email, product_id, product_url, questions_about, google_ads, bing_ads, facebook_ads
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id;
        `;
        
        const inquiryValues = [
            customerId, nameFirst, nameLast, email, productId, productUrl, questionsAbout, googleAds, bingAds, facebookAds
        ];

        const inquiryResult = await pool.query(inquiryQuery, inquiryValues);
        const inquiryId = inquiryResult.rows[0].id;

        console.log("Table inquiry inserted with ID:", inquiryId);
        res.status(200).send("Table inquiry processed successfully.");
    } catch (error) {
        console.error("Error processing table inquiry:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = { tableInquiryHandler };
