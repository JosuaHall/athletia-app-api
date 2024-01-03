const mongoose = require("mongoose");
const User = require("../models/User");
const TeamAdminRequest = require("../models/TeamAdminRequest");
const OrganizationAdminRequest = require("../models/OrganizationAdminRequest");
const Organization = require("../models/Organization");
const Leaderboard = require("../models/Leaderboard");
const ChangeOrganizationAdminRequest = require("../models/ChangeOrganizationAdminRequest");

User.schema.pre("remove", async function (next) {
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
    { $unset: { owner: "", created_by: "" } }
  );

  // Handle removal from admin array in teams
  await Organization.updateMany(
    { "teams.admin": this._id },
    { $pull: { "teams.$[team].admin": this._id } },
    { arrayFilters: [{ "team.admin": this._id }] }
  );

  // Handle removal from people_attending array in events
  await Organization.updateMany(
    { "teams.events.people_attending": this._id },
    { $pull: { "teams.$.events.$.people_attending": this._id } }
  );

  await Leaderboard.updateMany(
    { "ranking.user": this._id },
    { $pull: { ranking: { user: ObjectId(this._id) } } }
  );

  next();
});

module.exports = User;
