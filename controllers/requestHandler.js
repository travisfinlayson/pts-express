const pool = require("../db/pool.js");
const { formatJotformDate } = require("../utils/helpers"); // If you have a helpers file for utility functions

const requestHandler = async (req, res) => {
    try {
        console.log("Received Payload:", req.body);

        const payload = JSON.parse(req.body.rawRequest);

        // Extract customer details
        const email = payload.q5_email || null;
        const nameFirst = payload.q3_name?.first || null;
        const nameLast = payload.q3_name?.last || null;
        const phoneNumber = payload.q4_phoneNumber?.full || null;
        const googleAds = payload.q53_googleAds === "true" || payload.q53_googleAds === true;
        const bingAds = payload.q119_bingAds === "true" || payload.q119_bingAds === true;
        const facebookAds = payload.q120_facebookAds === "true" || payload.q120_facebookAds === true;

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

        const values = [email, nameFirst, nameLast, phoneNumber];
        const customerResult = await pool.query(customerQuery, values);
        const customerId = customerResult.rows[0].id;

        // Insert into pool_table_requests
        const insertRequestQuery = `
            INSERT INTO pool_table_requests (
                customer_id, pool_table_brand, other_table_brand, pool_table_size, pool_table_style, 
                pool_table_slate, repairs_address_addr_line_1, repairs_address_addr_line_2, repairs_address_city, 
                repairs_address_state, repairs_address_postal, service_looking, felt_preference, 
                color_preference, other_service, for_disposal, removal_address_addr_line_1, removal_address_addr_line_2, 
                removal_address_city, removal_address_state, removal_address_postal, disassembly_address_addr_line_1, 
                disassembly_address_addr_line_2, disassembly_address_city, disassembly_address_state, 
                disassembly_address_postal, flights_to_exit, assembly_address_addr_line_1, assembly_address_addr_line_2, 
                assembly_address_city, assembly_address_state, assembly_address_postal, table_in_room, 
                flights_assembly, move_address_addr_line_1, move_address_addr_line_2, move_address_city, 
                move_address_state, move_address_postal, flights_to_pickup, delivery_address_addr_line_1, 
                delivery_address_addr_line_2, delivery_address_city, delivery_address_state, delivery_address_postal, 
                delivery_flights, where_repairs_address_addr_line_1, where_repairs_address_addr_line_2, 
                where_repairs_address_city, where_repairs_address_state, where_repairs_address_postal, preferred_date, 
                preferred_date_2, preferred_date_3, anything_else, flights_to_storage, flights_moving, 
                distance_after_disassembly, google_ads, bing_ads, facebook_ads, ad_blocker, email, name_first, name_last, phone_number, additional_moving_prep
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, 
                $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, 
                $59, $60, $61, $62, $63, $64, $65, $66, $67
            ) RETURNING id;
        `;

        const requestValues = [
            customerId,
            payload.q117_poolTableBrand || null,
            payload.q118_otherTableBrand || null,
            payload.q25_poolTableSize || null,
            payload.q27_poolTableStyle || null,
            payload.q28_poolTableSlate || null,
            payload.q115_repairsAddress?.addr_line1 || null,
            payload.q115_repairsAddress?.addr_line2 || null,
            payload.q115_repairsAddress?.city || null,
            payload.q115_repairsAddress?.state || null,
            payload.q115_repairsAddress?.postal || null,
            payload.q60_serviceLooking || null,
            payload.q19_feltPreference || null,
            payload.q20_colorPreference || null,
            payload.q79_otherService || null,
            payload.q88_forDisposal || null,
            payload.q89_removalAddress?.addr_line1 || null,
            payload.q89_removalAddress?.addr_line2 || null,
            payload.q89_removalAddress?.city || null,
            payload.q89_removalAddress?.state || null,
            payload.q89_removalAddress?.postal || null,
            payload.q111_disassemblyAddress?.addr_line1 || null,
            payload.q111_disassemblyAddress?.addr_line2 || null,
            payload.q111_disassemblyAddress?.city || null,
            payload.q111_disassemblyAddress?.state || null,
            payload.q111_disassemblyAddress?.postal || null,
            payload.q112_flightsToExit || null,
            payload.q10_assemblyAddress?.addr_line1 || null,
            payload.q10_assemblyAddress?.addr_line2 || null,
            payload.q10_assemblyAddress?.city || null,
            payload.q10_assemblyAddress?.state || null,
            payload.q10_assemblyAddress?.postal || null,
            payload.q84_tableInRoom || null,
            payload.q83_flightsAssembly || null,
            payload.q99_moveAddress?.addr_line1 || null,
            payload.q99_moveAddress?.addr_line2 || null,
            payload.q99_moveAddress?.city || null,
            payload.q99_moveAddress?.state || null,
            payload.q99_moveAddress?.postal || null,
            payload.q101_flightsToPickup || null,
            payload.q102_deliveryAddress?.addr_line1 || null,
            payload.q102_deliveryAddress?.addr_line2 || null,
            payload.q102_deliveryAddress?.city || null,
            payload.q102_deliveryAddress?.state || null,
            payload.q102_deliveryAddress?.postal || null,
            payload.q103_deliveryFlights || null,
            payload.q94_whereRepairsAddress?.addr_line1 || null,
            payload.q94_whereRepairsAddress?.addr_line2 || null,
            payload.q94_whereRepairsAddress?.city || null,
            payload.q94_whereRepairsAddress?.state || null,
            payload.q94_whereRepairsAddress?.postal || null,
            formatJotformDate(payload.q48_preferredDate),
            formatJotformDate(payload.q49_preferredDate2),
            formatJotformDate(payload.q50_preferredDate3),
            payload.q35_anythingElse || null,
            payload.q91_flightsToStorage || null,
            payload.q104_flightsMoving || null,
            payload.q90_distanceAfterDisassembly || null,
            googleAds,
            bingAds,
            facebookAds,
            payload.q51_adBlocker === "true" || payload.q51_adBlocker === true,
            email,
            nameFirst,
            nameLast,
            phoneNumber,
            payload.q124_otherTable || null,
        ];

        const requestResult = await pool.query(insertRequestQuery, requestValues);
        const requestId = requestResult.rows[0].id;

        const allRepairs = new Set([
            ...(Array.isArray(payload.q59_otherRepairs) ? payload.q59_otherRepairs : []),
            ...(Array.isArray(payload.q113_whatRepairs) ? payload.q113_whatRepairs : []),
        ]);

        if (allRepairs.size > 0) {
            const insertRepair = `
                INSERT INTO repairs_requested (request_id, repair)
                VALUES ($1, $2);
            `;
            for (const repair of allRepairs) {
                await pool.query(insertRepair, [requestId, repair]);
            }
        }

        if (Array.isArray(payload.q105_accessoriesMoving)) {
            const insertAccessory = `
                INSERT INTO accessories_moving (request_id, accessory)
                VALUES ($1, $2);
            `;

            for (const accessory of payload.q105_accessoriesMoving) {
                if (accessory === "Other") {
                    const other = payload.q106_otherAccessories?.trim();
                    const value = other ? `Other: ${other}` : "Other";
                    await pool.query(insertAccessory, [requestId, value]);
                } else {
                    await pool.query(insertAccessory, [requestId, accessory]);
                }
            }
        }


        if (Array.isArray(payload.q108_servicesLooking)) {
            const insertService = `
                INSERT INTO services_requested (request_id, service)
                VALUES ($1, $2);
            `;
            for (const service of payload.q108_servicesLooking) {
                await pool.query(insertService, [requestId, service]);
            }
        }

        if (Array.isArray(payload.q123_doesYour)) {
            const insertPrepOption = `
                INSERT INTO moving_prep (request_id, prep_option)
                VALUES ($1, $2);
            `;
            for (const option of payload.q123_doesYour) {
                await pool.query(insertPrepOption, [requestId, option]);
            }
        }

        if (Array.isArray(payload.pocketImages)) {
            const insertPocketImageQuery = `
                INSERT INTO pocket_images (request_id, image_url)
                VALUES ($1, $2);
            `;
            await Promise.all(payload.pocketImages.map(url =>
                pool.query(insertPocketImageQuery, [requestId, url])
            ));
        }

        if (Array.isArray(payload.tablePhotos)) {
            const insertTablePhotoQuery = `
                INSERT INTO table_photos (request_id, photo_url)
                VALUES ($1, $2);
            `;
            await Promise.all(payload.tablePhotos.map(url =>
                pool.query(insertTablePhotoQuery, [requestId, url])
            ));
        }


        res.status(200).send("Data inserted successfully");
    } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = { requestHandler };
