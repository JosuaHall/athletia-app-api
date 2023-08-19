const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const config = require("config");
const jwt = require("jsonwebtoken");
const auth = require("../../middleware/auth");
const dotenv = require("dotenv");

dotenv.config(); // Load environment variables from .env file

//User Model
const User = require("../../models/User");
const Organization = require("../../models/Organization");

// @route   Post api/auth
// @desc    Auth user
// @access  Public
router.post("/", (req, res) => {
  const { email, password } = req.body;

  //Simple validation
  if (!email || !password) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  const formattedEmail = email
    .trim()
    .replace(/^(.)(.*)$/, (_, firstChar, rest) => {
      return firstChar.toLowerCase() + rest;
    });

  if (email)
    //check for existing user

    User.findOne({ email: formattedEmail })
      .populate({
        path: "organizations_followed",
        model: Organization,
        populate: {
          path: "teams.events.people_attending",
          model: User,
          select: "-password",
        },
      })
      .then((user) => {
        if (!user) return res.status(400).json({ msg: "User Does not exist" });
        //Validate password
        bcrypt.compare(password, user.password).then((isMatch) => {
          if (!isMatch)
            return res.status(400).json({ msg: "Invalid password" });

          jwt.sign(
            { id: user.id },
            process.env.jwtSecret /*config.get("jwtSecret")*/,
            (err, token) => {
              if (err) throw err;
              res.json({
                token,
                user: {
                  _id: user.id,
                  name: user.name,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  isPrivate: user.isPrivate,
                  profileImg: user.profileImg,
                  teams_followed: user.teams_followed,
                  organizations_followed: user.organizations_followed,
                  isAdminAccount: user.isAdminAccount,
                  isEmailVerified: user.isEmailVerified,
                },
              });
            }
          );
        });
      })
      .catch((err) => {
        res.status(400).json(err);
      });
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get("/user", auth, (req, res) => {
  User.findById(req.user.id)
    .populate({
      path: "organizations_followed",
      model: Organization,
      populate: {
        path: "teams.events.people_attending",
        model: User,
        select: "-password",
      },
    })
    .select("-password")
    .then((user) =>
      res.json({
        user: {
          _id: user.id,
          name: user.name,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isPrivate: user.isPrivate,
          profileImg: user.profileImg,
          teams_followed: user.teams_followed,
          organizations_followed: user.organizations_followed,
          isAdminAccount: user.isAdminAccount,
          isEmailVerified: user.isEmailVerified,
        },
      })
    )
    .catch((err) => {
      res.status(400).json(err);
    });
});

// Route to retrieve the encrypted API key
router.get("/get/api/key", auth, (req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  res.json({ apiKey });
});

module.exports = router;
