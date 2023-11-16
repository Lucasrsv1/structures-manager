const packageJson = require("../package.json");

class General {
	/**
	 * Rota de identificação desse servidor e dessa API.
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	welcome (req, res) {
		res.status(200).json({ message: `Structures Manager API v${packageJson.version}` });
	}

	/**
	 * Rota para informar a data atual do servidor.
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	timestamp (req, res) {
		res.status(200).json({ timestamp: Date.now() });
	}
}

module.exports = new General();
