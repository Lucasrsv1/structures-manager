const { validationResult } = require("express-validator");

function isRequestInvalid (req, res) {
	const validation = validationResult(req);
	if (validation.isEmpty())
		return false;

	res.status(400).json({ message: validation.array()[0].msg, errors: validation.array() });
	return true;
}

module.exports = { isRequestInvalid };
