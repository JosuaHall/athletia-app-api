const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OrganizationViewSchema = new Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  view_time_stamps: {
    type: [Date],
    default: [],
  },
});

module.exports = OrganizationView = mongoose.model(
  "OrganizationView",
  OrganizationViewSchema
);
