const v1 = require("express").Router();

const generalRoutes = require("./general");

v1.use("/", generalRoutes);

module.exports = v1;
