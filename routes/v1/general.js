const generalRoutes = require("express").Router();

const general = require("../../controllers/general");

generalRoutes.get("/", general.welcome);
generalRoutes.get("/timestamp", general.timestamp);

module.exports = generalRoutes;
