const express = require("express");
const mongoose = require("mongoose");
const config = require("config");
const users = require("./routes/api/users");
const auth = require("./routes/api/auth");
const organizations = require("./routes/api/organizations");
const cors = require("cors");

require("dotenv").config();

// Create a new express app
const app = express();

// Parse incoming request bodies in a middleware before your handlers, available under the req.body property
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Enable cross-origin resource sharing
const corsOptions = {
  origin: "exp://10.102.120.92:8081",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions)); */

// Connect to your MongoDB database
const db = process.env.mongoURI; /*config.get("mongoURI")*/
mongoose
  .set("strictQuery", true)
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB Connected...");
  })
  .catch((err) => console.log(err));

// Define a basic route
app.use("/api/users", users);
app.use("/api/auth", auth);
app.use("/api/organizations", organizations);

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
