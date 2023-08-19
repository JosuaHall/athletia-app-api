const express = require("express");
const mongoose = require("mongoose");
const config = require("config");
const users = require("./routes/api/users");
const auth = require("./routes/api/auth");
const organizations = require("./routes/api/organizations");
const cors = require("cors");

// Create a new express app
const app = express();

// Parse incoming request bodies in a middleware before your handlers, available under the req.body property
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable cross-origin resource sharing
const corsOptions = {
  //origin: "http://10.102.33.6:19000",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Connect to your MongoDB database
const db = config.get("mongoURI");
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
