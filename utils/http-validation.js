const { validationResult } = require("express-validator");

/**
 * Realiza a validação da requisição com base nas regras do express-validator.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {boolean} Informa se a requisição é inválida.
 */
function isRequestInvalid (req, res) {
	const validation = validationResult(req);
	if (validation.isEmpty())
		return false;

	res.status(400).json({ message: validation.array()[0].msg, errors: validation.array() });
	return true;
}

module.exports = { isRequestInvalid };
