const express = require('express');
const router = express.Router();
const pool = require('../db/pool'); // Your database connection pool
const axios = require('axios');

const GEOCODING_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// --- CONFIGURATION CONSTANTS (from your original script) ---
const INCLUDED_MILES_PER_LEG = 20;

// --- HELPER FUNCTIONS ---

/**
 * Converts an address string into latitude/longitude coordinates.
 */
const geocodeAddress = async (address) => {
  if (!address) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GEOCODING_API_KEY}`;
  try {
    const response = await axios.get(url);
    if (response.data.status === 'OK') {
      return response.data.results[0].geometry.location; // Returns { lat, lng }
    }
    return null;
  } catch (error) {
    console.error(`Geocoding error for address "${address}":`, error.response?.data?.error_message || error.message);
    throw new Error('Geocoding API failed');
  }
};

/**
 * Calculates the driving distance in miles between two coordinates.
 */
const getRouteDistance = async (origin, destination) => {
  if (!origin || !destination) return 0;
  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
  const payload = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode: 'DRIVE',
  };
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': GEOCODING_API_KEY,
    'X-Goog-FieldMask': 'routes.distanceMeters',
  };

  try {
    const response = await axios.post(url, payload, { headers });
    if (response.data.routes && response.data.routes.length > 0) {
      const distanceMeters = response.data.routes[0].distanceMeters;
      return distanceMeters * 0.000621371; // Convert meters to miles
    }
    return 0;
  } catch (error) {
    console.error('Routes API error:', error.response?.data?.error?.message || error.message);
    throw new Error('Routes API failed');
  }
};

/**
 * Calculates the mileage surcharge for a given distance and rate.
 */
const calculateMileageSurcharge = (miles, perMileRate) => {
  const overageMiles = Math.max(0, miles - INCLUDED_MILES_PER_LEG);
  return overageMiles * perMileRate;
};


// --- THE MAIN ROUTE ---

router.post('/distance', async (req, res) => {
  if (!GEOCODING_API_KEY) {
    return res.status(500).json({ error: 'API key is not configured on the server.' });
  }

  const { contractorId, primaryAddress, deliveryAddress } = req.body;

  if (!contractorId || !primaryAddress) {
    return res.status(400).json({ error: 'Contractor ID and primary address are required.' });
  }

  try {
    // 1. Fetch contractor details from the database
    const contractorRes = await pool.query(
      'SELECT city, state, per_mile_rate FROM contractors WHERE id = $1',
      [contractorId]
    );

    if (contractorRes.rows.length === 0) {
      return res.status(404).json({ error: 'Contractor not found.' });
    }
    const contractor = contractorRes.rows[0];
    const contractorFullAddress = `${contractor.city}, ${contractor.state}`;

    // 2. Geocode all addresses concurrently
    const [contractorCoords, primaryCoords, deliveryCoords] = await Promise.all([
      geocodeAddress(contractorFullAddress),
      geocodeAddress(primaryAddress),
      geocodeAddress(deliveryAddress) // This will safely return null if deliveryAddress is null/empty
    ]);

    if (!contractorCoords || !primaryCoords) {
      return res.status(400).json({ error: 'Could not geocode contractor or primary job address.' });
    }

    // 3. Calculate route distances
    const leg1_distance = await getRouteDistance(contractorCoords, primaryCoords);
    const leg2_distance = await getRouteDistance(primaryCoords, deliveryCoords); // Safely handles null coords

    // 4. Calculate mileage surcharge
    let mileage_surcharge = 0;
    mileage_surcharge += calculateMileageSurcharge(leg1_distance, contractor.per_mile_rate);
    mileage_surcharge += calculateMileageSurcharge(leg2_distance, contractor.per_mile_rate);

    // 5. Return the final data
    res.json({
      leg1_distance: Math.round(leg1_distance),
      leg2_distance: Math.round(leg2_distance),
      mileage_surcharge: parseFloat(mileage_surcharge.toFixed(2)),
    });

  } catch (error) {
    console.error('Error in /distance endpoint:', error);
    res.status(500).json({ error: 'An internal error occurred during calculation.' });
  }
});

router.post('/suggest', async (req, res) => {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: 'API key is not configured.' });
  }

  const { primaryAddress, deliveryAddress } = req.body;

  if (!primaryAddress) {
    return res.status(400).json({ error: 'Primary address is required.' });
  }

  try {
    // 1. Get all active contractors from the database
    const contractorsRes = await pool.query(
      'SELECT id, name, city, state FROM contractors WHERE "delete" IS NOT TRUE'
    );
    const allContractors = contractorsRes.rows;

    // 2. Geocode job addresses
    const [primaryCoords, deliveryCoords] = await Promise.all([
      geocodeAddress(primaryAddress),
      geocodeAddress(deliveryAddress),
    ]);

    if (!primaryCoords) {
      return res.status(400).json({ error: 'Could not geocode primary address.' });
    }

    // 3. Loop through contractors to find the closest one
    let shortestDistance = Infinity;
    let bestContractor = null;

    for (const contractor of allContractors) {
      const contractorFullAddress = `${contractor.city}, ${contractor.state}`;
      const contractorCoords = await geocodeAddress(contractorFullAddress);
      const distance = await getRouteDistance(contractorCoords, primaryCoords);

      if (distance < shortestDistance) {
        shortestDistance = distance;
        bestContractor = contractor;
      }
    }

    // 4. Apply assignment rules
    let suggestion = "Manual Review";
    let best_contractor_id = null;
    
    if (bestContractor) {
      best_contractor_id = bestContractor.id;
      const leg1Distance = shortestDistance;
      const leg2Distance = await getRouteDistance(primaryCoords, deliveryCoords);
      
      const LEG1_MAX_DISTANCE = 60;
      const LEG2_MAX_DISTANCE = 40;

      if (leg1Distance > LEG1_MAX_DISTANCE) {
        suggestion = "Manual Review (Leg 1 > 60 miles)";
      } else if (deliveryAddress && leg2Distance > LEG2_MAX_DISTANCE) {
        suggestion = `Manual Review - ${bestContractor.name} (Leg 2 > 40 miles)`;
      } else {
        suggestion = bestContractor.name;
      }
    }
    
    // 5. Return the result
    res.json({ suggestion, best_contractor_id });

  } catch (error) {
    console.error('Error in /suggest endpoint:', error);
    res.status(500).json({ error: 'An internal error occurred during suggestion.' });
  }
});

router.get('/full-pricing-sheet/:contractorId', async (req, res) => {
  const { contractorId } = req.params;

  // 1. Input Validation
  // Consistent with the checks in the /suggest endpoint.
  if (!contractorId) {
    return res.status(400).json({ error: 'Contractor ID is required.' });
  }

  try {
    // 2. Database Query
    // The SQL query joins the two tables and filters by the contractor's ID.
    // Using $1 for parameterization is the standard, secure way to pass variables
    // with the node-postgres (pg) library, preventing SQL injection.
    const query = `
      SELECT
        cp.service_id,
        cp.price,
        cp.sub_price,
        cp.material_cost,
        s.service_name,
        s.table_size_ft
      FROM
        contractor_prices AS cp
      JOIN
        services AS s ON cp.service_id = s.service_id
      WHERE
        cp.contractor_id = $1;
    `;

    const pricingResult = await pool.query(query, [contractorId]);

    // 3. Send Success Response
    // The query result from node-postgres contains the data in the 'rows' property.
    res.json(pricingResult.rows);

  } catch (error) {
    // 4. Error Handling
    // This centralized error handling is identical to the /suggest endpoint's pattern.
    console.error('Error in /full-pricing-sheet endpoint:', error);
    res.status(500).json({ error: 'An internal error occurred while fetching the pricing sheet.' });
  }
});

module.exports = router;