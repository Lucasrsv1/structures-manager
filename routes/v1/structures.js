const structuresRoutes = require("express").Router();

const naming = require("../../controllers/naming");
const structures = require("../../controllers/structures");

structuresRoutes.get("/", structures.list);
structuresRoutes.get("/count", structures.count);

structuresRoutes.get("/next", naming.ensureAuthorized.bind(naming), structures.getNext);
structuresRoutes.get("/next/:qty_cpus", naming.ensureAuthorized.bind(naming), structures.getNext);
structuresRoutes.get("/next/:qty_cpus/:filetype", naming.ensureAuthorized.bind(naming), structures.getNext);

structuresRoutes.post("/result", naming.ensureAuthorized.bind(naming), structures.saveResult);

module.exports = structuresRoutes;
