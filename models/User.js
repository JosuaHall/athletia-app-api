const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const TeamAdminRequest = require("./TeamAdminRequest");
const OrganizationAdminRequest = require("./OrganizationAdminRequest");
const Organization = require("./Organization");
const Leaderboard = require("./Leaderboard");
const ChangeOrganizationAdminRequest = require("./ChangeOrganizationAdminRequest");

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
    required: true,
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
  socials: [
    {
      app: {
        type: String,
        required: false,
      },
      username: {
        type: String,
        required: false,
      },
    },
  ],
  bio: {
    type: String,
    required: false,
  },
  acknowlegement: {
    type: Boolean,
    required: true,
    default: false,
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

UserSchema.pre("remove", async function (next) {
  const ObjectId = mongoose.Types.ObjectId;
  // Cascade delete TeamAdminRequests where the user is the requester or recipient
  await TeamAdminRequest.deleteMany({
    $or: [
      { request_by_user: this._id }, // No need to convert to ObjectId
      { user_recipient: new ObjectId(this._id) }, // Convert this._id to ObjectId
    ],
  });

  // Cascade delete OrganizationAdminRequests where the user is the requester or recipient
  await OrganizationAdminRequest.deleteMany({
    request_by_user: this._id,
  });

  // Cascade delete ChangeOrganizationAdminRequests where the user is the requester or recipient
  await ChangeOrganizationAdminRequest.deleteMany({
    requesting_admin: this._id,
  });

  // Handle removal from organizations_followed if needed
  // ...

  // Handle ownership and created organizations
  await Organization.updateMany(
    { $or: [{ owner: this._id }, { created_by: this._id }] },
    {
      $unset: {
        owner: { $cond: { if: { owner: this._id }, then: "", else: "$owner" } },
        created_by: {
          $cond: {
            if: { created_by: this._id },
            then: "",
            else: "$created_by",
          },
        },
      },
    }
  );

  // Handle removal from admin array in teams
  await Organization.updateMany(
    { "teams.admin": this._id },
    { $pull: { "teams.$[].admin": this._id } }
  );

  // Handle removal from people_attending array in events
  await Organization.updateMany(
    { "teams.events.people_attending": this._id },
    { $pull: { "teams.$[].events.$[].people_attending": this._id } }
  );

  await Leaderboard.updateMany(
    { "ranking.user": this._id },
    { $pull: { ranking: { user: ObjectId(this._id) } } }
  );

  next();
});

module.exports = User = mongoose.model("user", UserSchema);
