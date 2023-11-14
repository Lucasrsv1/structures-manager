const structuresRoutes = require("express").Router();

const structures = require("../../controllers/structures");

structuresRoutes.get("/", structures.list);
structuresRoutes.get("/count", structures.count);

structuresRoutes.get("/next", structures.validations.getNext, structures.getNext);
structuresRoutes.get("/next/:qty_cpus", structures.validations.getNext, structures.getNext);
structuresRoutes.get("/next/:qty_cpus/:filetype", structures.validations.getNext, structures.getNext);

structuresRoutes.post("/result", structures.validations.saveResult, structures.saveResult);

structuresRoutes.patch("/ping", structures.validations.processorPing, structures.processorPing);

module.exports = structuresRoutes;
