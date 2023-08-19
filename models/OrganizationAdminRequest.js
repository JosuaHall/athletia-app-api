const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let OrganizationAdminRequest;

const organizationAdminRequestSchema = new Schema({
  request_by_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  register_date: {
    type: Date,
    default: Date.now,
  },
});

OrganizationAdminRequest = mongoose.model(
  "OrganizationAdminRequest",
  organizationAdminRequestSchema
);

module.exports = OrganizationAdminRequest;
