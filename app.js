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
const port = 4000;

app.use(cookieParser());

// Setup multer storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const verifyWebhookSecret = (req, res, next) => {
  const secret = (req.query.secret || req.headers['x-webhook-secret'] || "").trim();
  console.log("Webhook secret received:", secret);

  if (secret !== process.env.WEBHOOK_SECRET) {
    console.warn("Invalid webhook secret attempt");
    return res.status(403).json({ error: "Invalid webhook secret" });
  }

  next();
};



app.use(cors({
    origin: 'http://localhost:3000', // React app's URL
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    credentials: true, // Enable cookies
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
