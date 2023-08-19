const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CompetitorSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  logo: {
    type: String,
    required: false,
  },
});

module.exports = Competitor = mongoose.model("competitor", CompetitorSchema);
