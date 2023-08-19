const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  isPrivate: {
    type: Number,
    require: true,
  },
  firstName: {
    type: String,
    default: "",
  },
  lastName: {
    type: String,
    default: "",
  },
  password: {
    type: String,
    required: true,
  },
  profileImg: {
    type: String,
    required: false,
    default: "",
  },
  bio: {
    type: String,
    required: false,
  },
  acknowlegement: {
    type: Boolean,
    required: false,
  },
  nr_teams_followed: {
    type: Number,
    default: 0,
  },
  teams_followed: [
    {
      type: String,
      default: "",
      required: false,
    },
  ],
  organizations_followed: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  ],
  admin_of_teams: {
    type: String,
    default: "",
    required: false,
  },
  isAdminAccount: {
    type: Number,
    required: true,
  },
  isHeadAdminOfAhletia: {
    type: Boolean,
    required: true,
    default: false,
  },
  verificationCode: {
    type: String,
    required: false,
  },
  isEmailVerified: {
    type: Boolean,
    required: true,
    default: false,
  },
  register_date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = User = mongoose.model("user", UserSchema);
