const namingRoutes = require("express").Router();

const naming = require("../../controllers/naming");

namingRoutes.get("/", naming.list.bind(naming));

namingRoutes.post("/register", naming.registerProcessor.bind(naming));

namingRoutes.delete("/unregister", naming.ensureAuthorized.bind(naming), naming.unregisterProcessor.bind(naming));

module.exports = namingRoutes;
