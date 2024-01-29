const express = require("express");
const router = express.Router();
//const config = require("config");
const multer = require("multer");
//const fs = require("fs");
//const cloudinary = require("../../cloudinary/config");
const cloudinary = require("../../cloudinary/config");
const mime = require("mime-types");
const Organization = require("../../models/Organization");
const User = require("../../models/User");
const Sport = require("../../models/Sport");
const TeamAdminRequest = require("../../models/TeamAdminRequest");
const OrganizationAdminRequest = require("../../models/OrganizationAdminRequest");
const ChangeOrganizationAdminRequest = require("../../models/ChangeOrganizationAdminRequest");
const Leaderboard = require("../../models/Leaderboard");
const OrganizationView = require("../../models/OrganizationView");
//const { model } = require("mongoose");
//const { events } = require("../../models/Organization");

/*define storage for the images on local
const DIR = "./public/";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
*/
//for deployment
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/heic"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
    }
  },
  limits: { fieldSize: 5 * 1024 * 1024 },
});

// @route   Post api/teams
// @desc    Create Organization with an Owner
// @access  Private
router.post("/create/:id", upload.single("logo"), (req, res) => {
  const { owner, name, logo } = req.body;

  if (!name || !logo) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  //check for existing organization
  Organization.findOne({ name: name }).then((organization) => {
    if (organization)
      return res.status(400).json({ msg: "Organization already exists" });

    cloudinary.v2.uploader
      .upload_stream(
        { resource_type: "image", folder: "organizations" },
        (error, result) => {
          if (error) {
            return res.status(400).send(error);
          }

          const newOrganization = new Organization({
            owner,
            logo: result.url,
            name,
          });

          newOrganization
            .save()
            .then((organization) => {
              res.status(200).json(organization);
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        }
      )
      .end(logo);
  });
});

// @route   Post api/teams
// @desc    Create Organization WITHOUT an Owner
// @access  Private
router.post("/create/without/owner/:id", upload.single("logo"), (req, res) => {
  const { created_by, name, logo } = req.body;

  if (!name || !logo) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  //check for existing user
  Organization.findOne({ name: name }).then((organization) => {
    if (organization)
      return res.status(400).json({ msg: "Organization already exists" });

    cloudinary.v2.uploader
      .upload_stream(
        { resource_type: "image", folder: "organizations" },
        (error, result) => {
          if (error) {
            return res.status(400).send(error);
          }

          const newOrganization = new Organization({
            created_by,
            logo: result.url,
            name,
          });

          newOrganization
            .save()
            .then((organization) => {
              res.status(200).json(organization);
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        }
      )
      .end(logo);
  });
});

router.put("/create/team/:id/:organizationid", (req, res) => {
  const organizationid = req.params.organizationid;
  const { sport } = req.body;
  //check for all fields entered
  if (!sport) {
    return res.status(400).json({ msg: "Please select a sport" });
  }

  Organization.findOne({
    _id: organizationid,
    teams: { $elemMatch: { sport: sport } },
  }).then((organization) => {
    if (organization)
      return res.status(400).json({ msg: "Team already exists" });

    Organization.findByIdAndUpdate(
      { _id: organizationid },
      { $addToSet: { teams: { sport } } },
      { new: true }
    )
      .then((organization) => {
        res.status(200).json(organization);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  });
});

router.put("/delete/team/:id/:org", (req, res) => {
  const orgid = req.params.org;
  const _id = req.params.id;
  var mongoose = require("mongoose");
  var objectId = mongoose.Types.ObjectId(_id);

  Organization.findOneAndUpdate(
    {
      _id: orgid,
    },
    {
      $pull: {
        teams: { _id: objectId },
      },
    },
    { new: true }
  )
    .then((organization) => {
      res.status(200).json(organization);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/list/:id", (req, res) => {
  const userid = req.params.id;
  Organization.find({ owner: userid })
    .then((list) => {
      res.status(200).json(list);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

//get a organization and update organizationView
router.get("/organization/:organizationid", async (req, res) => {
  try {
    const organizationId = req.params.organizationid;

    // Check if OrganizationView document exists for the organizationId
    const existingView = await OrganizationView.findOne({
      organization: organizationId,
    });

    if (existingView) {
      // Document already exists, update it
      existingView.view_time_stamps.push(new Date());
      await existingView.save();
    } else {
      // Document doesn't exist, create a new one
      await OrganizationView.create({
        organization: organizationId,
        view_time_stamps: [new Date()],
      });
    }

    // Fetch organization details as before
    const organization = await Organization.findOne({ _id: organizationId })
      .populate({
        path: "teams.events.people_attending",
        model: User,
        select: "-password",
      })
      .populate({
        path: "teams.events.opponent",
        model: Organization,
      });

    // Sorting logic
    organization.teams.sort((a, b) => {
      const sportA = getSecondWord(a.sport);
      const sportB = getSecondWord(b.sport);
      if (sportA < sportB) {
        return -1;
      }
      if (sportA > sportB) {
        return 1;
      }
      return 0;
    });

    res.status(200).json(organization);
  } catch (error) {
    console.error("Error:", error);
    res.status(400).json({ error: "Failed to fetch organization details." });
  }
});

// Function to extract the second word from a string
const getSecondWord = (str) => {
  const words = str.split(" ");
  if (words.length > 1) {
    return words[1];
  }
  return "";
};

router.get("/organization/team/:organizationId/:teamId", (req, res) => {
  const organizationId = req.params.organizationId;
  const teamId = req.params.teamId;

  if (!organizationId || !teamId) {
    return res.status(400).json({
      error: "organizationId and teamId are required in the query parameters",
    });
  }

  var mongoose = require("mongoose");
  const organizationObjectId = mongoose.Types.ObjectId(organizationId);
  const teamObjectId = mongoose.Types.ObjectId(teamId);

  Organization.aggregate([
    {
      $match: {
        _id: organizationObjectId,
        "teams._id": teamObjectId,
      },
    },
    {
      $project: {
        logo: 1,
        name: 1,
        owner: 1,
        location: 1,
        stream_link: 1,
        register_date: 1,
        teams: {
          $filter: {
            input: "$teams",
            as: "team",
            cond: { $eq: ["$$team._id", teamObjectId] },
          },
        },
      },
    },
  ]).exec((err, result) => {
    // Use the exec() function instead of toArray()
    if (err) {
      console.error(err);
      return res.status(500).json({
        error: "An error occurred while retrieving the organization",
      });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const organization = result[0];
    const team = organization.teams[0];

    res.json({ organization, team });
  });
});

router.get("/get/all/:searchTerm", (req, res) => {
  const searchTerm = req.params.searchTerm;

  const sanitizedSearchTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, "\\W*");
  Organization.find({
    name: new RegExp(`.*${sanitizedSearchTerm}.*`, "i"),
    status: 1,
  })

    .populate({
      path: "teams.events.people_attending",
      model: User,
      select: "-password",
    })
    .populate({
      path: "teams.events.opponent",
      model: Organization,
    })
    .select("-password")
    .sort({ name: 1 })
    .then((list) => {
      res.status(200).json(list);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/create/event/:orgid/:teamid", (req, res) => {
  const teamid = req.params.teamid;
  const orgid = req.params.orgid;

  const { date_time, competitor, home_away, link, event_location } = req.body;

  var mongoose = require("mongoose");
  var competitorObj = mongoose.Types.ObjectId(competitor);

  Organization.findOneAndUpdate(
    { teams: { $elemMatch: { _id: teamid } } },
    {
      $push: {
        "teams.$.events": {
          opponent: competitorObj,
          date_time: date_time,
          home_away: home_away,
          link,
          event_location: event_location,
        },
      },
    },
    { new: true }
  )
    .select("teams.events")
    .populate({
      path: "teams.events.opponent",
      model: Organization,
    })
    .then((team) => {
      if (!team) {
        return res.status(404).json({ message: "Team not found." });
      }
      res.status(200).json(team.teams[0].events);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/update/event/:orgid/:teamid/:eventid", (req, res) => {
  const orgid = req.params.orgid;
  const teamid = req.params.teamid;
  const eventid = req.params.eventid;
  const { date_time, home_away, link, amenities, event_location } = req.body;

  const updateFields = {
    "teams.$[i].events.$[j].date_time": date_time,
    "teams.$[i].events.$[j].home_away": home_away,
    "teams.$[i].events.$[j].link": link,
    "teams.$[i].events.$[j].amenities": amenities,
  };

  if (event_location !== undefined) {
    updateFields["teams.$[i].events.$[j].event_location"] = event_location;
  }

  Organization.findOneAndUpdate(
    {
      _id: orgid,
      teams: {
        $elemMatch: {
          _id: teamid,
          "events._id": eventid,
        },
      },
    },
    { $set: updateFields },
    {
      arrayFilters: [
        {
          "i._id": teamid,
        },
        {
          "j._id": eventid,
        },
      ],
      new: true,
    }
  )
    .populate({
      path: "teams.events.opponent",
      model: Organization,
    })
    .then((updatedOrg) => {
      const team = updatedOrg.teams.find(
        (team) => team._id.toString() === teamid
      );
      const events = team.events;
      res.status(200).json(events);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/delete/event/:orgid/:teamid/:eventid", (req, res) => {
  const orgid = req.params.orgid;
  const teamid = req.params.teamid;
  const eventid = req.params.eventid;
  var mongoose = require("mongoose");
  var objectId = mongoose.Types.ObjectId(eventid);
  Organization.findOneAndUpdate(
    {
      _id: orgid,
      teams: {
        $elemMatch: {
          _id: teamid,
          "events._id": eventid,
        },
      },
    },
    {
      $pull: {
        "teams.$.events": { _id: objectId },
      },
    },
    { new: true } // Only return the teams array with the matched team
  )
    .populate({
      path: "teams.events.opponent",
      model: Organization,
    })
    .then((updatedOrg) => {
      const team = updatedOrg.teams.find(
        (team) => team._id.toString() === teamid
      );
      const events = team.events;
      res.status(200).json(events);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/update/event/stream/link/:orgid/:teamid/:eventid", (req, res) => {
  const orgid = req.params.orgid;
  const teamid = req.params.teamid;
  const eventid = req.params.eventid;
  var mongoose = require("mongoose");
  var oid = mongoose.Types.ObjectId(orgid);
  var tid = mongoose.Types.ObjectId(teamid);
  var eid = mongoose.Types.ObjectId(eventid);
  const { link } = req.body;

  Organization.findOneAndUpdate(
    { _id: oid, "teams._id": tid, "teams.events._id": eid },
    {
      $set: {
        "teams.$[].events.$[e].link": link,
      },
    },
    { arrayFilters: [{ "e._id": eid }], new: true }
  )
    .then((list) => {
      res.status(200).json(list);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/event/list/:orgid/:teamid", (req, res) => {
  const teamid = req.params.teamid;
  const orgid = req.params.orgid;
  Organization.findOne(
    { _id: orgid, teams: { $elemMatch: { _id: teamid } } }, // filter by organization id and team id
    { "teams.$": 1 } // project only the matching team
  )
    .populate({
      path: "teams.events.opponent",
      model: Organization,
    })
    .then((org) => {
      const team = org.teams[0]; // the matching team will always be the first element of the teams array

      team.events.sort((a, b) => {
        const dateTimeA = new Date(a.date_time);
        const dateTimeB = new Date(b.date_time);
        return dateTimeA - dateTimeB;
      });

      res.status(200).json(team.events);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/get/sports", (req, res) => {
  Sport.find({})
    .sort({ sport: 1 })
    .then((sports) => {
      res.status(200).json(sports);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/event/attend/:orgid/:teamid/:eventid/:userid", (req, res) => {
  const userid = req.params.userid;
  const eventid = req.params.eventid;
  const teamid = req.params.teamid;
  const orgid = req.params.orgid;
  Organization.findOneAndUpdate(
    { _id: orgid, "teams._id": teamid, "teams.events._id": eventid },
    {
      $addToSet: {
        "teams.$.events.$[e].people_attending": userid,
      },
    },
    { arrayFilters: [{ "e._id": eventid }], new: true }
  )
    .populate({
      path: "teams.events.people_attending",
      model: User,
      select: "-password",
    })
    .populate({
      path: "teams.events.opponent",
      model: Organization,
    })
    .select("-password")
    .then((team) => {
      res.status(200).json(team);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/event/unattend/:orgid/:teamid/:eventid/:userid", (req, res) => {
  const userid = req.params.userid;
  const eventid = req.params.eventid;
  const teamid = req.params.teamid;
  const orgid = req.params.orgid;
  Organization.findOneAndUpdate(
    { _id: orgid, "teams._id": teamid, "teams.events._id": eventid },
    {
      $pull: {
        "teams.$.events.$[e].people_attending": userid,
      },
    },
    { arrayFilters: [{ "e._id": eventid }], new: true }
  )
    .populate({
      path: "teams.events.people_attending",
      model: User,
      select: "-password",
    })
    .populate({
      path: "teams.events.opponent",
      model: Organization,
    })
    .select("-password")
    .then((team) => {
      res.status(200).json(team);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put(
  "/updateProfilePicture/:id",
  upload.single("profileImg"),
  (req, res) => {
    const { userid, profileImg } = req.body;
    //const logo = req.file.filename;

    cloudinary.v2.uploader
      .upload_stream(
        {
          resource_type: "image",
          folder: "users",
          transformation: [
            {
              width: 300,
              height: 300,
              crop: "fill",
              gravity: "auto",
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) {
            return res.status(400).send(error);
          }

          User.findByIdAndUpdate(
            { _id: userid },
            { profileImg: result.url },
            { new: true }
          )
            .select("-password")
            .then((user) => {
              res.status(200).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                profileImg: user.profileImg,
                teams_followed: user.teams_followed,
                organizations_followed: user.organizations_followed,
              });
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        }
      )
      .end(profileImg);
  }
);

router.get("/event/attending/users/:orgid/:teamid/:eventid", (req, res) => {
  const teamid = req.params.teamid;
  const orgid = req.params.orgid;
  const eventid = req.params.eventid;
  Organization.find({
    _id: orgid,
    "teams._id": teamid,
    "teams.events._id": eventid,
  })
    .populate({
      path: "teams.events.people_attending",
      model: User,
      select: "-password",
    })
    .populate({
      path: "teams.events.opponent",
      model: Organization,
    })
    .select("-password")
    .then((users) => {
      res.status(200).json(users);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.post(
  "/send/team/admin/request/:request_by_user/:user_recipient",
  (req, res) => {
    const {
      request_by_user,
      user_recipient,
      organization,
      team,
      sport,
      status,
    } = req.body;

    const newTeamAdminRequest = new TeamAdminRequest({
      request_by_user,
      user_recipient,
      organization,
      team,
      sport,
      status: 1,
    });

    newTeamAdminRequest
      .save()
      .then((teamAdminRequest) => {
        res.status(200).json(teamAdminRequest);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
);

router.post(
  "/send/team/head/admin/request/:request_by_user/:user_recipient",
  (req, res) => {
    const {
      request_by_user,
      user_recipient,
      organization,
      team,
      sport,
      status,
    } = req.body;

    const newTeamAdminRequest = new TeamAdminRequest({
      request_by_user,
      user_recipient,
      organization,
      team,
      sport,
      status: 1,
      isHeadAdmin: true,
    });

    newTeamAdminRequest
      .save()
      .then((teamAdminRequest) => {
        res.status(200).json(teamAdminRequest);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
);

router.get("/get/team/admin/requests/:request_by_user/:team", (req, res) => {
  const request_by_user = req.params.request_by_user;
  const teamid = req.params.team;
  TeamAdminRequest.find({ team: teamid })
    .populate({
      path: "user_recipient",
      model: User,
      select: "-password",
    })
    .select("-password")
    .then((teamAdminRequest) => {
      res.status(200).json(teamAdminRequest);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/load/team/admin/requests/:user_recipient", (req, res) => {
  const user_recipient = req.params.user_recipient;
  TeamAdminRequest.find({ user_recipient: user_recipient })
    .populate({
      path: "organization",
      model: Organization,
      select: "-password",
    })
    .select("-password")
    .then((teamAdminRequest) => {
      res.status(200).json(teamAdminRequest);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/accept/request/:id", (req, res) => {
  const id = req.params.id;
  TeamAdminRequest.findByIdAndUpdate(
    { _id: id },
    {
      status: 2,
    }
  )
    .populate({
      path: "organization",
      model: Organization,
      select: "-password",
    })
    .select("-password")
    .then((teamAdminRequest) => {
      res.status(200).json(teamAdminRequest);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.delete("/delete/team/admin/request/entry/:id", (req, res) => {
  const id = req.params.id;
  TeamAdminRequest.deleteOne({
    _id: id,
  })
    .then((teamAdminRequest) => {
      res.status(200).json(teamAdminRequest);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/organization/admin/requests/user/:userid", (req, res) => {
  const userid = req.params.userid;
  var mongoose = require("mongoose");
  var userId = mongoose.Types.ObjectId(userid);

  const organizationAdminRequestPromise = OrganizationAdminRequest.find({
    request_by_user: userId,
  }).exec();

  const changeOrganizationAdminRequestPromise =
    ChangeOrganizationAdminRequest.find({
      requesting_admin: userId,
    }).exec();

  Promise.all([
    organizationAdminRequestPromise,
    changeOrganizationAdminRequestPromise,
  ])
    .then(([organizationAdminRequests, changeOrganizationAdminRequests]) => {
      res.status(200).json({
        organizationAdminRequests,
        changeOrganizationAdminRequests,
      });
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.post("/send/owner/request/:userid/:orgid", (req, res) => {
  const userid = req.params.userid;
  const orgid = req.params.orgid;
  var mongoose = require("mongoose");
  var userId = mongoose.Types.ObjectId(userid);
  var orgId = mongoose.Types.ObjectId(orgid);

  Organization.findOne({ _id: orgId })
    .then((foundorg) => {
      if (foundorg.owner) {
        const newChangeOrganizationAdminRequest =
          new ChangeOrganizationAdminRequest({
            current_admin: foundorg.owner,
            requesting_admin: userId,
            organization: orgId,
          });

        newChangeOrganizationAdminRequest
          .save()
          .then((changeOrganizationAdminRequest) => {
            // Retrieve the requests after saving
            return Promise.all([
              OrganizationAdminRequest.find({ request_by_user: userId }),
              ChangeOrganizationAdminRequest.find({ requesting_admin: userId }),
            ]).then(([orgRequests, changeRequests]) => {
              res.status(200).json({ orgRequests, changeRequests });
            });
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      } else {
        const newOrganizationAdminRequest = new OrganizationAdminRequest({
          request_by_user: userId,
          organization: orgId,
        });

        newOrganizationAdminRequest
          .save()
          .then((organizationAdminRequest) => {
            // Retrieve the requests after saving
            return Promise.all([
              OrganizationAdminRequest.find({ request_by_user: userId }),
              ChangeOrganizationAdminRequest.find({ requesting_admin: userId }),
            ]).then(([orgRequests, changeRequests]) => {
              res.status(200).json({ orgRequests, changeRequests });
            });
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      }
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/update/location/:orgid", (req, res) => {
  const { address, latitude, longitude } = req.body;
  const orgid = req.params.orgid;

  Organization.findByIdAndUpdate(
    { _id: orgid },
    {
      location: {
        longitude: longitude,
        latitude: latitude,
        address: address,
      },
    },
    { new: true }
  )
    .then((org) => {
      res.status(200).json([org]);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/update/stream_link/:orgid", (req, res) => {
  const { stream_link } = req.body;
  const orgid = req.params.orgid;

  Organization.findByIdAndUpdate(
    { _id: orgid },
    {
      stream_link,
    },
    { new: true }
  )
    .then((org) => {
      res.status(200).json([org]);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

//Currently not in use
router.post("/new/leaderboard", (req, res) => {
  const { orgid, endDate, prizeList, teamid } = req.body;
  const { startDate } = req.body;
  var mongoose = require("mongoose");
  var orgId = mongoose.Types.ObjectId(orgid);

  // Perform any necessary validation or error handling for the input data

  // Transform prizeList into an array of prize objects
  const prizes = prizeList.map((item, index) => ({
    place: index + 1,
    item: item.trim(),
  }));

  // Create a new leaderboard document
  const leaderboard = new Leaderboard({
    organization: orgId,
    startDate,
    endDate,
    prizes,
    ranking: [],
  });

  // Set the team field if teamid is defined
  if (teamid !== undefined) {
    leaderboard.team = teamid;
  }

  // Save the leaderboard to the database
  leaderboard
    .save()
    .then((createdLeaderboard) => {
      res.status(200).json(createdLeaderboard);
    })
    .catch((error) => {
      res.status(500).json({ error: "Failed to create leaderboard." });
    });
});

//Currently not in use
router.get("/get/TeamLeaderboard/:orgid/:teamid", (req, res) => {
  const orgid = req.params.orgid;
  const teamid = req.params.teamid;
  var mongoose = require("mongoose");
  var orgId = mongoose.Types.ObjectId(orgid);
  var teamId = mongoose.Types.ObjectId(teamid);

  // Load leaderboard document
  Leaderboard.findOne({ organization: orgId, team: teamId })
    .populate({
      path: "ranking.user",
      model: User,
      select: "-password -verificationCode",
    })
    .then((leaderboard) => {
      // Sort the ranking based on points in descending order
      leaderboard.ranking.sort((a, b) => b.points - a.points);

      res.status(200).json(leaderboard);
    })
    .catch((error) => {
      res.status(500).json({ error: "Failed to retrieve leaderboard." });
    });
});

//Currently not in use
router.get("/get/leaderboard/:orgid", (req, res) => {
  const orgid = req.params.orgid;
  var mongoose = require("mongoose");
  var orgId = mongoose.Types.ObjectId(orgid);

  // Load leaderboard document
  Leaderboard.findOne({ organization: orgId })
    .populate({
      path: "ranking.user",
      model: User,
      select: "-password -verificationCode",
    })
    .then((leaderboard) => {
      // Sort the ranking based on points in descending order
      leaderboard.ranking.sort((a, b) => b.points - a.points);

      res.status(200).json(leaderboard);
    })
    .catch((error) => {
      res.status(500).json({ error: "Failed to retrieve leaderboard." });
    });
});

//Currently not in use
router.get("/get/leaderboards", (req, res) => {
  const orgIds = req.query.orgIds.split(","); // Split the orgIds string into an array

  // Find the leaderboards with organization matching any of the orgIds
  Leaderboard.find({ organization: { $in: orgIds } })
    .populate({
      path: "organization",
      model: Organization,
    })
    .populate({
      path: "ranking.user",
      model: User,
      select: "-password -verificationCode",
    })
    .then((leaderboards) => {
      // Sort the ranking of each leaderboard by points in descending order
      const sortedLeaderboards = leaderboards.map((leaderboard) => {
        const sortedRanking = leaderboard.ranking.sort(
          (a, b) => b.points - a.points
        );
        return { ...leaderboard.toObject(), ranking: sortedRanking };
      });

      res.status(200).json(sortedLeaderboards);
    })
    .catch((error) => {
      res.status(500).json({ error: "Failed to retrieve leaderboards." });
    });
});

//Currently not in use
router.delete("/delete/leaderboard/:id", (req, res) => {
  const leaderboardId = req.params.id;

  Leaderboard.findByIdAndDelete(leaderboardId)
    .then(() => {
      res.status(200).json({ message: "Leaderboard deleted successfully." });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: "Failed to delete leaderboard." });
    });
});

const getPrevEventId = async (orgid, teamid, eventid) => {
  try {
    // Find the organization and team with the given orgid and teamid
    const organization = await Organization.findOne({
      _id: orgid,
      "teams._id": teamid,
    });

    if (!organization) {
      return null; // Organization or team not found
    }

    // Find the team within the organization with the given teamid
    const team = organization.teams.find(
      (team) => team._id.toString() === teamid
    );

    if (!team) {
      return null; // Team not found
    }

    // Sort the events array by date_time
    const sortedEvents = team.events.sort((a, b) => a.date_time - b.date_time);

    // Find the index of the given eventid within the sorted events array
    const eventIndex = sortedEvents.findIndex(
      (event) => event._id.toString() === eventid
    );

    if (eventIndex === -1 || eventIndex === 0) {
      return null; // Event not found or no previous event
    }

    // Get the event ID from the previous index position
    const previousEventID = sortedEvents[eventIndex - 1]._id;

    return previousEventID;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getPoints = (streak) => {
  if (streak === 1) {
    return 100;
  } else if (streak === 2) {
    return 200;
  } else if (streak === 3) {
    return 250;
  } else if (streak === 4) {
    return 300;
  } else if (streak >= 5) {
    return 350;
  } else {
    return 0; // Handle any other cases if needed
  }
};

//Currently not in use
// PUT /api/organizations/update/user/points/organization/:orgid
router.put("/update/user/points/organization/:orgid", async (req, res) => {
  try {
    const { orgid } = req.params;
    const { userid, teamid, eventid } = req.body;
    let points = 0;

    // Check if a team ID is provided
    if (teamid) {
      // Update the team leaderboard if team ID is provided
      const teamLeaderboard = await Leaderboard.findOne({
        organization: orgid,
        team: teamid,
      });

      if (teamLeaderboard) {
        // Check if the user already exists in the team ranking
        const existingTeamUser = teamLeaderboard.ranking.find(
          (entry) => entry.user.toString() === userid
        );

        if (existingTeamUser) {
          // User exists in the team ranking, update the points for the user
          const prevEventId = await getPrevEventId(orgid, teamid, eventid);

          if (prevEventId !== null) {
            const isPrevEventAttended =
              existingTeamUser.events_attended.includes(prevEventId);
            if (isPrevEventAttended) existingTeamUser.streak += 1;
            else existingTeamUser.streak = 1;
          }
          points = getPoints(existingTeamUser.streak);

          existingTeamUser.points += points; // Update the points logic as per your requirement
          existingTeamUser.events_attended.push(eventid);
        } else {
          // User doesn't exist in the team ranking, add the user to the team ranking with initial points
          teamLeaderboard.ranking.push({
            user: userid,
            points: 100,
            streak: 1,
            events_attended: [eventid],
          });
        }

        await teamLeaderboard.save();
      }
    }

    //Currently not in use
    // Find the leaderboard for the given organization
    const leaderboard = await Leaderboard.findOne({
      $and: [{ organization: orgid }, { team: { $exists: false } }],
    });

    if (!leaderboard) {
      return res.status(500).json({ error: "Leaderboard not found" });
    }

    // Check if the user already exists in the ranking
    const existingUser = leaderboard.ranking.find(
      (entry) => entry.user.toString() === userid
    );

    if (existingUser) {
      // User exists, update the points for the user
      if (points !== 0) existingUser.points += points;
      // Update the points logic as per your requirement
      else existingUser.points += 100;

      existingUser.events_attended.push(eventid);
    } else {
      // User doesn't exist, add the user to the ranking with initial points
      leaderboard.ranking.push({
        user: userid,
        points: 100,
        streak: 1,
        events_attended: [eventid],
      });
    }

    await leaderboard.save();

    // Return the updated leaderboard or any other response as needed
    const updatedLeaderboard = await Leaderboard.findOne({
      organization: orgid,
    }).populate({
      path: "ranking.user",
      model: User,
      select: "-password -verificationCode",
    });

    updatedLeaderboard.ranking.sort((a, b) => b.points - a.points);

    res.status(200).json(updatedLeaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
