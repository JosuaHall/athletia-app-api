const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SportSchema = new Schema({
  sport: {
    type: String,
    required: true,
  },
});

module.exports = Sport = mongoose.model("sport", SportSchema);
