const router = require("express").Router();
const landingController = require("../controllers/landingController");

router.get("/", landingController.getLandingData);

module.exports = router;