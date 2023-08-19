const User = require("../models/User");

async function migrateUsers() {
  console.log("start1");
  try {
    console.log("start");
    const users = await User.find();
    console.log(users);

    for (const user of users) {
      // Check if the isPrivate property exists
      if (!user.hasOwnProperty("isPrivate")) {
        user.isPrivate = 0;
        await user.save();
      }
    }

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error.message);
    console.log("Migration failed:", error);
  }
}

module.exports = { migrateUsers };
