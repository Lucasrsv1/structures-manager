const structuresJson = require("../structures.json");

class Structures {
	/**
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	list (req, res) {
		res.status(200).json(structuresJson);
	}

	/**
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	getNext (req, res) {
		res.status(200).json({ filename: structuresJson[0] });
	}
}

module.exports = new Structures();
