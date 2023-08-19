const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TeamAdminRequestSchema = new Schema({
  request_by_user: {
    type: String,
    required: true,
  },
  user_recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  team: {
    type: String,
    required: true,
  },
  sport: {
    type: String,
    required: true,
  },
  status: {
    type: Number,
    required: true,
  },
  isHeadAdmin: {
    type: Boolean,
    required: false,
  },
  register_date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = TeamAdminRequest = mongoose.model(
  "TeamAdminRequest",
  TeamAdminRequestSchema
);
