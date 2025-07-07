const pool = require("../db/pool.js");

const sellingHandler = async (req, res) => {
    try {
        console.log("Received Payload:", req.body);
        const payload = JSON.parse(req.body.rawRequest);

        // Extract basic info
        const nameFirst = payload.q83_name?.first || null;
        const nameLast = payload.q83_name?.last || null;
        const phoneNumber = payload.q68_phoneNumber?.full || null;
        const email = payload.q69_email || null;

        const tableBrand = payload.q1_tableBrand || null;
        const tableModel = payload.q82_tableModel || null;
        const tableSize = payload.q4_typeA || null;
        const outerDimensions = payload.q6_outerTable || null;
        const accessories = payload.q84_doesThe84 || null;
        const describeAccessories = payload.q85_describeThe || null;
        const city = payload.q51_city || null;
        const state = payload.q52_state || null;
        const numberOfStairs = payload.q22_numberOf || null;
        const replacementParts = payload.q26_doesThe26 || null;
        const partsNeeded = payload.q80_replacementParts || null;
        const defects = payload.q54_doesThe || null;
        const whatDefects = payload.q20_tableDefects || null;
        const selling = payload.q58_areYou || null;
        const howSoon = payload.q87_howSoon || null;
        const askingPrice = payload.q24_askingPrice || null;
        const flexiblePrice = payload.q59_isThe || null;
        const sellerNotes = payload.q27_sellerNotes || null;

        const tableSide = payload.tableSide?.[0] || null;
        const tableSide2 = payload.tableImage11?.[0] || null;
        const tableTop = payload.tableImage12?.[0] || null;
        const tableUnderneath = payload.tableImage13?.[0] || null;

        const googleAds = payload.q88_googleAds === "true" || payload.q88_googleAds === true;
        const bingAds = payload.q89_bingAds === "true" || payload.q89_bingAds === true;
        const facebookAds = payload.q90_facebookAds === "true" || payload.q90_facebookAds === true;

        if (!email) {
            return res.status(400).send("Email is required to process request.");
        }

        // Upsert customer
        const customerQuery = `
            INSERT INTO customers (email, name_first, name_last, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (email)
            DO UPDATE SET 
                name_first = COALESCE(EXCLUDED.name_first, customers.name_first),
                name_last = COALESCE(EXCLUDED.name_last, customers.name_last),
                updated_at = NOW()
            RETURNING id;
        `;
        const customerResult = await pool.query(customerQuery, [email, nameFirst, nameLast]);
        const customerId = customerResult.rows[0].id;

        // Insert into selling
        const sellingQuery = `
            INSERT INTO selling (
                customer_id, brand, model, size, outer_dimensions, accessories,
                describe_accessories, city, state, number_of_stairs, replacement_parts, parts_needed,
                defects, what_defects, selling, how_soon, asking_price, flexible_price, seller_notes,
                name_first, name_last, phone_number, email, google_ads, bing_ads, facebook_ads,
                table_side, table_side_2, table_top, table_underneath
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
                    $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
            RETURNING id;
        `;
        const sellingValues = [
            customerId, tableBrand, tableModel, tableSize, outerDimensions, accessories,
            describeAccessories, city, state, numberOfStairs, replacementParts, partsNeeded,
            defects, whatDefects, selling, howSoon, askingPrice, flexiblePrice, sellerNotes,
            nameFirst, nameLast, phoneNumber, email, googleAds, bingAds, facebookAds,
            tableSide, tableSide2, tableTop, tableUnderneath
        ];

        const sellingResult = await pool.query(sellingQuery, sellingValues);
        const sellingId = sellingResult.rows[0].id;

        console.log("Selling entry inserted with ID:", sellingId);

        // Insert additional photos
        const additionalPhotos = payload.additionalPhotos || [];
        await Promise.all(additionalPhotos.map(imageUrl =>
            pool.query(
                `INSERT INTO additional_selling_images (selling_id, image_url) VALUES ($1, $2);`,
                [sellingId, imageUrl]
            )
        ));

        // Insert defect photos
        const defectPhotos = payload.defectPhotos || [];
        await Promise.all(defectPhotos.map(imageUrl =>
            pool.query(
                `INSERT INTO selling_defects (selling_id, image_url) VALUES ($1, $2);`,
                [sellingId, imageUrl]
            )
        ));

        // Insert accessories images
        const accessoriesImages = payload.accessoriesImages || [];
        await Promise.all(accessoriesImages.map(imageUrl =>
            pool.query(
                `INSERT INTO selling_accessories (selling_id, image_url) VALUES ($1, $2);`,
                [sellingId, imageUrl]
            )
        ));

        res.status(200).send("Table inquiry processed successfully.");
    } catch (error) {
        console.error("Error processing table inquiry:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = { sellingHandler };
