const structuresRoutes = require("express").Router();

const structures = require("../../controllers/structures");

structuresRoutes.get("/", structures.list);
structuresRoutes.get("/next", structures.getNext);

module.exports = structuresRoutes;
