const mongoose = require("mongoose");
const { Decimal128 } = require("mongoose");
const Schema = mongoose.Schema;

const LocationSchema = new Schema({
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Decimal128,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
});

const OrganizationSchema = new Schema({
  logo: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  location: {
    type: LocationSchema,
    required: false,
  },
  status: {
    type: Number,
    required: true,
    default: 0,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    ref: "User",
  },
  register_date: {
    type: Date,
    default: Date.now,
  },
  teams: [
    {
      sport: {
        type: String,
        required: false,
      },
      access_code: {
        type: Number,
        required: false,
      },
      admin: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      events: [
        {
          date_time: {
            type: Date,
            offset: true,
          },
          opponent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
          },
          home_away: {
            type: String,
            required: true,
          },
          event_location: {
            type: LocationSchema,
            required: false,
          },
          link: {
            type: String,
            required: false,
          },
          expected_attendance: {
            type: Number,
          },
          people_attending: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          ],
          amenities: [String],
        },
      ],
    },
  ],
});

module.exports = Organization = mongoose.model(
  "organization",
  OrganizationSchema
);
