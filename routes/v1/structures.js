const structuresRoutes = require("express").Router();

const structures = require("../../controllers/structures");

structuresRoutes.get("/", structures.list);
structuresRoutes.get("/count", structures.count);
structuresRoutes.get("/next", structures.getNext);
structuresRoutes.get("/next/:qty_cpus", structures.getNext);

structuresRoutes.post("/result", structures.saveResult);

module.exports = structuresRoutes;
