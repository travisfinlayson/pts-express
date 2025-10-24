const pool = require("../db/pool.js");

const contactHandler = async (req, res) => {
    try {
        console.log("Received Payload:", req.body);
        const payload = JSON.parse(req.body.rawRequest);

        // Extract fields
        const email = payload.q5_email || null;
        const nameFirst = payload.q3_name?.first || null;
        const nameLast = payload.q3_name?.last || null;
        const phoneNumber = payload.q4_phoneNumber?.full || null;
        const comments = payload.q6_commentOr || null;
        const googleAds = payload.q9_googleAds === "true" || payload.q9_googleAds === true;
        const bingAds = payload.q10_bingAds === "true" || payload.q10_bingAds === true;
        const facebookAds = payload.q11_facebookAds === "true" || payload.q11_facebookAds === true;

        if (!email) {
            return res.status(400).send("Email is required to process request.");
        }

        // Insert or get customer ID
        const customerQuery = `
            INSERT INTO customers (email, name_first, name_last, phone)
            VALUES ($1, $2, $3, $4)
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
        const customerId = customerResult.rows[0].id;

        // Insert into contact table (UPDATED)
        const contactQuery = `
            INSERT INTO contact (customer_id, name_first, name_last, comments, google_ads, bing_ads, facebook_ads, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING id;
        `;

        // (UPDATED) Add nameFirst and nameLast to the values array
        const contactValues = [customerId, nameFirst, nameLast, comments, googleAds, bingAds, facebookAds];
        const contactResult = await pool.query(contactQuery, contactValues);
        const contactId = contactResult.rows[0].id;

        console.log("Contact inserted with ID:", contactId);
        res.status(200).send("Contact form submitted successfully.");
    } catch (error) {
        console.error("Error processing contact form:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = { contactHandler };