const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const config = require("config");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

//User Model
const User = require("../../models/User");
const Organization = require("../../models/Organization");

/*
// @route   POST api/users
// @desc    Register new Users
// @access  Public
router.post("/", (req, res) => {
  const { name, email, password, isAdminAccount } = req.body;

  // Simple validation
  if (!name || !email || !password || isAdminAccount === undefined) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  let regex = new RegExp("[a-z0-9]+@[a-z]+.[a-z]{2,3}");
  if (!regex.test(email)) {
    return res.status(400).json({ msg: "Please enter a valid email address" });
  }

  // Check for existing user with the same email or name
  User.findOne({
    $or: [{ email }, { name }],
    $or: [{ isEmailVerified: true }, { isEmailVerified: { $exists: false } }],
  })
    .then((user) => {
      if (user) {
        if (user.email === email) {
          return res
            .status(400)
            .json({ msg: "User with this email already exists" });
        }
        if (user.name === name) {
          return res
            .status(400)
            .json({ msg: "User with this username already exists" });
        }
      }

      // Generate a verification code
      const verificationCode = generateVerificationCode();

      const newUser = new User({
        name,
        email,
        password,
        isAdminAccount: isAdminAccount === 1 ? 1 : 0,
        isHeadAdminOfAhletia: false,
        verificationCode, // Store the verification code in the user model
      });

      // Create salt & hash
      bcrypt.genSalt(10, (err, salt) => {
        if (err) {
          return res.status(500).json({ msg: "Internal Server Error" });
        }
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) {
            return res.status(500).json({ msg: "Internal Server Error" });
          }
          newUser.password = hash;
          newUser
            .save()
            .then((user) => {
              // Send verification email
              sendVerificationEmail(user.email, user.verificationCode)
                .then(() => {
                  res.json({
                    user: {
                      _id: user.id,
                      name: user.name,
                      email: user.email,
                      profileImg: user.profileImg,
                      teams_followed: user.teams_followed,
                      organizations_followed: user.organizations_followed,
                      isAdminAccount: user.isAdminAccount,
                      isEmailVerified: false, // Set the initial email verification status to false
                    },
                  });
                })
                .catch((err) => {
                  return res
                    .status(500)
                    .json({ msg: "Error sending verification email" });
                });
            })
            .catch((err) => {
              return res.status(500).json({ msg: "Internal Server Error" });
            });
        });
      });
    })
    .catch((err) => {
      return res.status(500).json({ msg: "Internal Server Error" });
    });
});*/

// @route   POST api/users
// @desc    Register new Users
// @access  Public
router.post("/", async (req, res) => {
  const {
    name,
    email,
    password,
    firstName,
    lastName,
    isAdminAccount,
    isPrivate,
  } = req.body;

  // Simple validation
  if (
    !name ||
    !email ||
    !password ||
    !firstName ||
    !lastName ||
    isAdminAccount === undefined ||
    isPrivate === undefined
  ) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  let regex = new RegExp("[a-z0-9]+@[a-z]+.[a-z]{2,3}");
  if (!regex.test(email)) {
    return res.status(400).json({ msg: "Please enter a valid email address" });
  }

  const formattedEmail = email
    .trim()
    .replace(/^(.)(.*)$/, (_, firstChar, rest) => {
      return firstChar.toLowerCase() + rest;
    });

  try {
    // Check for existing user with the same email or name
    const existingUser = await User.findOne({
      $or: [{ email: formattedEmail }, { name }],
    });

    if (existingUser) {
      if (existingUser.email === formattedEmail) {
        // User with the same email already exists
        if (existingUser.isEmailVerified) {
          return res
            .status(400)
            .json({ msg: "User with this email already exists" });
        }

        // Delete the existing account with the same email if not verified
        await User.findByIdAndRemove(existingUser._id);
      } else if (existingUser.name === name) {
        // User with the same name already exists
        if (existingUser.isEmailVerified) {
          return res
            .status(400)
            .json({ msg: "User with this username already exists" });
        }

        // Delete the existing account with the same name if not verified
        await User.findByIdAndRemove(existingUser._id);
      }
    }

    // Proceed with account creation
    const verificationCode = generateVerificationCode();

    const newUser = new User({
      name: name.trim(),
      email: formattedEmail,
      password: password.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      isAdminAccount: isAdminAccount === 1 ? 1 : 0,
      isHeadAdminOfAhletia: false,
      isPrivate: isPrivate === 1 ? 1 : 0,
      verificationCode,
    });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newUser.password, salt);
    newUser.password = hash;

    const user = await newUser.save();

    // Send verification email
    await sendVerificationEmail(user.email, user.verificationCode);

    res.json({
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        isPrivate: user.isPrivate,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImg: user.profileImg,
        teams_followed: user.teams_followed,
        organizations_followed: user.organizations_followed,
        isAdminAccount: user.isAdminAccount,
        isEmailVerified: false,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
});

// Generate a random verification code
const generateVerificationCode = () => {
  const codeLength = 6;
  const characters = "0123456789";
  let code = "";

  for (let i = 0; i < codeLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
};

const sendVerificationEmail = (userEmail, verificationCode) => {
  return new Promise(async (resolve, reject) => {
    // Create the verification link with the custom URL scheme
    const verificationLink = `exp://10.0.0.16:19000/--/api/users/verify?code=${verificationCode}`; //`athletia://10.0.0.16:19000/api/users/verify?code=${verificationCode}`;

    try {
      // Create a test account with Ethereal Email
      const testAccount = await nodemailer.createTestAccount();

      // Create a transporter using the test account SMTP details
      /*
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });*/
      /* TEST DEVELOPMENT
        var transporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: "e839e0f8d6ed4b",
          pass: "e10b9977bfb15d",
        },
      });*/

      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Create the email content
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: "Email Verification Athletia",
        html: `<p>Thank you for registering your Athletia account! Please click the following link to verify your email address:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>Or use the following verification code:</p>
      <p><b>${verificationCode}</b></p>`,
      };

      // Send the email
      const info = await transporter.sendMail(mailOptions);

      //console.log("Preview URL: " + nodemailer.getTestMessageUrl(info));
      resolve(info);
    } catch (error) {
      console.error("Error sending verification email:", error);
      reject(error);
    }
  });
};

router.get("/verify", (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ msg: "Verification code not provided" });
  }

  // Find the user with the given verification code
  User.findOne({ verificationCode: code })
    .then((user) => {
      if (!user) {
        return res.status(404).json({ msg: "Invalid verification code" });
      }

      // Update the email verification status
      user.isEmailVerified = true;
      user.verificationCode = ""; // Clear the verification code
      user
        .save()
        .then((updatedUser) => {
          // Assign and return the JWT token
          jwt.sign(
            { id: updatedUser.id },
            config.get("jwtSecret"),
            (err, token) => {
              if (err) {
                return res.status(500).json({ msg: "Internal Server Error" });
              }

              res.json({
                token,
                user: {
                  _id: updatedUser.id,
                  name: updatedUser.name,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: updatedUser.email,
                  isPrivate: updatedUser.isPrivate,
                  profileImg: updatedUser.profileImg,
                  teams_followed: updatedUser.teams_followed,
                  organizations_followed: updatedUser.organizations_followed,
                  isAdminAccount: updatedUser.isAdminAccount,
                  isEmailVerified: updatedUser.isEmailVerified,
                },
              });
            }
          );
        })
        .catch((err) => {
          return res.status(500).json({ msg: "Internal Server Error" });
        });
    })
    .catch((err) => {
      return res.status(500).json({ msg: "Internal Server Error" });
    });
});

const sendPasswordResetEmail = (userEmail, token) => {
  return new Promise(async (resolve, reject) => {
    const resetLink = `exp://10.0.0.16:19000/--/api/users/reset/password?code=${token}`; //`athletia://10.0.0.16:19000/api/users/verify?code=${verificationCode}`;
    //console.log(resetLink);
    try {
      /* Create a test account with Ethereal Email
      const testAccount = await nodemailer.createTestAccount();

      // Create a transporter using the test account SMTP details
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });*/
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Create the email content
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: "Password Reset - Athletia",
        html: `<p>We received a request to reset your password for your Athletia account. If you did not make this request, you can ignore this email.</p>
        <p>To reset your password, click on the following link:</p>
        <a href="${resetLink}">Reset Password</a>`,
      };

      // Send the email
      const info = await transporter.sendMail(mailOptions);
      //console.log("Password reset email sent:", info.response);
      //console.log("Preview URL: " + nodemailer.getTestMessageUrl(info));
      resolve(info);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      reject(error);
    }
  });
};

/*
const sendVerificationEmail = (userEmail, verificationCode) => {
  return new Promise((resolve, reject) => {
    // Create the verification link with the custom URL scheme
    const verificationLink = `athletia://verify?code=${verificationCode}`;
   
    //console.log(process.env.EMAIL_USER, process.env.EMAIL_PASS);
    // Create a transporter using your email service provider or SMTP settings
    const transporter = nodemailer.createTransport({
      // Replace with your email service provider or SMTP configuration
      service: "gmail",
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        clientId: process.env.OAUTH_CLIENTID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN
      },
    });

    // Create the email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Email Verification Athletia",
      html: `<p>Thank you for registering! Please click the following link to verify your email address:</p>
      <a href="${verificationLink}">Verify Email</a>`,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending verification email:", error);
        reject(error);
      } else {
        console.log("Verification email sent:", info.response);
        resolve(info);
      }
    });
  });
};*/

// @route   POST api/users/forgot/password
// @desc    Reset Password
// @access  Public
router.post("/forgot/password", async (req, res) => {
  const { email } = req.body;

  try {
    // Simple validation
    if (email === "") {
      return res.status(400).json({ msg: "Please enter all fields" });
    }

    const formattedEmail = email
      .trim()
      .replace(/^(.)(.*)$/, (_, firstChar, rest) => {
        return firstChar.toLowerCase() + rest;
      });

    //console.log("FormattedEmail", formattedEmail);

    // Check for existing user with the same email and isEmailVerified: true
    const existingUser = await User.findOne({
      email: formattedEmail,
      isEmailVerified: true,
    });

    if (existingUser) {
      // Create a JWT token with the user's email and an expiration time
      const token = jwt.sign(
        { email: existingUser.email },
        config.get("jwtSecret"),
        { expiresIn: 1200 } // Set the expiration time as per your requirements
      );

      // Send verification email
      try {
        await sendPasswordResetEmail(existingUser.email, token);
        return res.json({
          msg: "Verification code sent. Please check your email for further instructions.",
          resetLinkSent: true,
        });
      } catch (error) {
        console.error(error);
        return res
          .status(500)
          .json({ msg: "Failed to send password reset email" });
      }
    } else {
      return res.status(404).json({
        msg: "User with entered email does not exist or is not verified.",
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
});

router.get("/validate/password/reset/link", async (req, res) => {
  const { token } = req.query;
  //console.log("verify token -> ", token);

  try {
    // Verify the token
    const decoded = jwt.verify(token, config.get("jwtSecret"));

    // Retrieve the user based on the email from the token
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if the token is expired
    const now = Date.now() / 1000;
    if (decoded.exp < now) {
      return res.status(400).json({ msg: "Token has expired" });
    }

    // Additional checks and actions for password reset
    // ...

    // Return a success response with the token
    return res.json({ msg: "Token validated successfully", token });
  } catch (err) {
    // Handle invalid token or other errors
    console.error(err);
    return res.status(400).json({ msg: "Invalid token" });
  }
});

// @route   POST api/users/reset/password
// @desc    Reset Password
// @access  Public
router.post("/reset/password", async (req, res) => {
  const { passwordResetToken, password } = req.body;

  try {
    // Verify the token and retrieve the email and expiration time from it
    const decoded = jwt.verify(passwordResetToken, config.get("jwtSecret"));
    const userEmail = decoded.email;
    const tokenExpirationTime = decoded.exp;

    // Check if the token is expired
    if (Date.now() >= tokenExpirationTime * 1000) {
      return res.status(400).json({ msg: "Token has expired" });
    }

    // Find the user by email
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Update the user's password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    user.password = hash;

    // Save the updated user
    await user.save();

    return res.json({ msg: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ msg: "Invalid token" });
  }
});

router.put("/follow/organization/:userid/:orgid", (req, res) => {
  const { orgid } = req.body;
  const userid = req.params.userid;

  User.findOneAndUpdate(
    { _id: userid },
    {
      $addToSet: {
        organizations_followed: orgid,
      },
    },
    { new: true }
  )
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
    .then((user) => {
      res.status(200).json(user);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/unfollow/organization/:userid/:orgid", (req, res) => {
  const { orgid } = req.body;
  const userid = req.params.userid;

  User.findByIdAndUpdate(
    { _id: userid },
    {
      $pull: {
        organizations_followed: orgid,
      },
    },
    { new: true }
  )
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
    .then((user) => {
      res.status(200).json(user);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/get/filtered/users", (req, res) => {
  let search_string = req.query.name;

  User.find({
    name: new RegExp(search_string, "i"),
  })
    .select("-password")
    .sort({ name: 1 })
    .then((user) => {
      res.status(200).json(user);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/update/privacy/setting/user/:userid", async (req, res) => {
  const userid = req.params.userid;
  const { isPrivate } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userid,
      { $set: { isPrivate: isPrivate } }, // Update the isPrivate property
      { new: true } // Return the updated document
    )
      .populate({
        path: "organizations_followed",
        model: Organization,
        populate: {
          path: "teams.events.people_attending",
          model: User,
          select: "-password",
        },
      })
      .select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        _id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        isPrivate: updatedUser.isPrivate,
        profileImg: updatedUser.profileImg,
        teams_followed: updatedUser.teams_followed,
        organizations_followed: updatedUser.organizations_followed,
        isAdminAccount: updatedUser.isAdminAccount,
        isEmailVerified: updatedUser.isEmailVerified,
      },
    });
  } catch (err) {
    res.status(400).json(err);
  }
});

module.exports = router;
