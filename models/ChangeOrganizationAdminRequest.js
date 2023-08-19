const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let ChangeOrganizationAdminRequest;

const changeOrganizationAdminRequestSchema = new Schema({
  requesting_admin: {
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

ChangeOrganizationAdminRequest = mongoose.model(
  "ChangeOrganizationAdminRequest",
  changeOrganizationAdminRequestSchema
);

module.exports = ChangeOrganizationAdminRequest;
