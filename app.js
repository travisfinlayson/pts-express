// app.js (or your main file)
require('dotenv').config();
const express = require("express");
const multer = require("multer");
const cookieParser = require('cookie-parser');
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
const cors = require('cors');


const app = express();
const port = 3000;

app.use(cookieParser());

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



const allowedOrigins = ['https://pooltablesquad.com', 'http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow non-browser requests like curl or Postman

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  credentials: true,
}));


app.use(express.json());

// Auth endpoints
app.use("/api/auth", authRoutes);

app.use("/contractors", authenticateToken, contractorsRouter);
app.use("/customers", authenticateToken, customersRouter);
app.use("/images", authenticateToken, ImagesRouter);
app.use("/contacts", authenticateToken, contactsRouter);
app.use("/selling", authenticateToken, sellingRouter);

// Webhook route
app.post("/request", verifyWebhookSecret, upload.none(), requestHandler);
app.post("/contact", verifyWebhookSecret, upload.none(), contactHandler);
app.post("/buying-modal", verifyWebhookSecret, upload.none(), buyingModalHandler);
app.post("/table-inquiry", verifyWebhookSecret, upload.none(), tableInquiryHandler);
app.post("/selling", verifyWebhookSecret, upload.none(), sellingHandler);

app.post('/send-ga4-event', async (req, res) => {
    const eventData = req.body;

    // Validate incoming data (ensure event name is provided)
    if (!eventData || !eventData.client_id || !eventData.event_name) {
        return res.status(400).send({ error: 'Missing required fields: client_id or event_name' });
    }

    // Forward the event to GA4
    try {
        const ga4Response = await fetch(
            `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.MEASUREMENT_ID}&api_secret=${process.env.API_SECRET}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: eventData.client_id, // Required: ID of the user
                    events: [
                        {
                            name: eventData.event_name, // Send just the event name
                        }
                    ],
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

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});

app.get('/', (req, res) => {
  res.send('API server is running');
});

app.use((err, req, res, next) => {
  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS error: Origin not allowed' });
  }
  next(err);
});
