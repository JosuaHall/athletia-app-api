const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LeaderboardSchema = new Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  team: {
    type: String,
    required: false,
  },
  startDate: {
    type: Date,
    offset: true,
    required: false,
  },
  endDate: {
    type: Date,
    offset: true,
    required: false,
  },
  prizes: [
    {
      place: {
        type: Number,
        required: false,
      },
      item: {
        type: String,
        required: false,
      },
    },
  ],
  ranking: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
      points: { type: Number, required: false },
      events_attended: [String],
      streak: { type: Number, default: 0 },
    },
  ],
});

module.exports = Leaderboard = mongoose.model("leaderboard", LeaderboardSchema);
