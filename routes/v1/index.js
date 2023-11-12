const v1 = require("express").Router();

const generalRoutes = require("./general");
const namingRoutes = require("./naming");
const structuresRoutes = require("./structures");

v1.use("/", generalRoutes);
v1.use("/structures", structuresRoutes);
v1.use("/processors", namingRoutes);

module.exports = v1;
