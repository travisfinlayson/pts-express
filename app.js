// app.js (or your main file)
console.log('✅ Running app.js from:', __filename);

require('dotenv').config();
const express = require("express");
const multer = require("multer");
const cookieParser = require('cookie-parser');
const cors = require('cors'); // Moved cors require to the top with others for consistency

// --- All Handlers and Routers ---
const { requestHandler } = require("./controllers/requestHandler.js");
const { contactHandler } = require("./controllers/contactHandler.js");
const { buyingModalHandler } = require("./controllers/buyingModalHandler.js");
const { tableInquiryHandler} = require("./controllers/tableInquiryHandler.js");
const { sellingHandler } = require("./controllers/sellingHandler.js");
const authRoutes = require("./auth/auth.js");
const authenticateToken = require('./auth/authMiddleWare.js');
const contractorsRouter = require("./routes/contractors");
const customersRouter = require("./routes/customers");
const contactsRouter = require("./routes/contact");
const ImagesRouter = require("./routes/images");
const sellingRouter = require("./routes/selling");
const requestRouter = require("./routes/request");
const inquiriesRouter = require("./routes/inquiries");
const combinedEntriesRouter = require("./routes/leads");
const calculatorRoutes = require("./routes/calculator");
const servicesRouter = require("./routes/services");


const app = express();
const port = process.env.PORT || 4000;

// --- CORS CONFIGURATION (MUST BE AT THE TOP) ---
const allowedOrigins = [
  'http://localhost:3000',
  'https://pooltablesquad.com',
  'https://server.pooltablesquad.com',
  'https://www.jotform.com'
];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin like Postman, curl, or mobile apps
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

// This single line at the top handles all CORS and preflight (OPTIONS) requests
app.use(cors(corsOptions));


// --- ALL OTHER MIDDLEWARE GOES AFTER CORS ---
app.use(cookieParser());
app.use(express.json()); // Middleware to parse JSON bodies

// Optional: Custom logger to see request details
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// Setup multer storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const verifyWebhookSecret = (req, res, next) => {
  const secret = (req.query.secret || req.headers['x-webhook-secret'] || "").trim();
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(403).json({ error: "Invalid webhook secret" });
  }
  next();
};

// --- ROUTES ---

// Auth endpoints (No token needed for login/register)
app.use("/api/auth", authRoutes);

// Webhook routes
app.post("/request", verifyWebhookSecret, upload.none(), requestHandler);
app.post("/contact", verifyWebhookSecret, upload.none(), contactHandler);
app.post("/buying-modal", verifyWebhookSecret, upload.none(), buyingModalHandler);
app.post("/table-inquiry", verifyWebhookSecret, upload.none(), tableInquiryHandler);
app.post("/selling", verifyWebhookSecret, upload.none(), sellingHandler);

// Protected API routes (Token is required)
app.use("/contractors", authenticateToken, contractorsRouter);
app.use("/customers", authenticateToken, customersRouter);
app.use("/images", authenticateToken, ImagesRouter);
app.use("/contacts", authenticateToken, contactsRouter);
app.use("/selling", authenticateToken, sellingRouter);
app.use("/request", authenticateToken, requestRouter);
app.use("/inquiries", authenticateToken, inquiriesRouter);
app.use("/leads", authenticateToken, combinedEntriesRouter);
app.use('/calculator', authenticateToken, calculatorRoutes);
app.use('/services', authenticateToken, servicesRouter);

// GA4 Event Forwarding
app.post('/send-ga4-event', async (req, res) => {
    const eventData = req.body;
    if (!eventData || !eventData.client_id || !eventData.event_name) {
        return res.status(400).send({ error: 'Missing required fields: client_id or event_name' });
    }
    try {
        const ga4Response = await fetch(
            `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.MEASUREMENT_ID}&api_secret=${process.env.API_SECRET}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: eventData.client_id,
                    events: [{ name: eventData.event_name }],
                }),
            }
        );
        if (ga4Response.ok) {
            res.status(200).send({ success: true, message: 'Event sent to GA4 successfully' });
        } else {
            const errorDetails = await ga4Response.text();
            res.status(500).send({ success: false, error: errorDetails });
        }
    } catch (error) {
        res.status(500).send({ success: false, error: error.message });
    }
});

// Root endpoint for health check
app.get('/', (req, res) => {
  res.send('API server is running');
});

// --- ERROR HANDLING (MUST BE AT THE END) ---
app.use((err, req, res, next) => {
  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS error: Origin not allowed' });
  }
  // You can add more specific error handlers here if needed
  console.error(err.stack); // Log other errors for debugging
  res.status(500).send('Something broke!');
});


app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});