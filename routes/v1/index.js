const v1 = require("express").Router();

const generalRoutes = require("./general");
const structuresRoutes = require("./structures");

v1.use("/", generalRoutes);
v1.use("/structures", structuresRoutes);

module.exports = v1;
