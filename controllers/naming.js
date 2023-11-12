const { sign, verify } = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const { ProcessorInfo } = require("../models/processor-info");

const KEY_TOKEN = uuidv4();

const REDISTRIBUTION_INTERVAL = process.env.REDISTRIBUTION_INTERVAL || (5 * 60 * 1000);

class Naming {
	constructor () {
		/**
		 * @type {Map<string, ProcessorInfo>}
		 */
		this.registeredProcessors = new Map();

		this.interval = setInterval(this.garbageCollectorJob.bind(this), 30000);
	}

	garbageCollectorJob () {
		this.registeredProcessors.forEach((processorInfo, id) => {
			// Remove processadores que não se comunicam há mais tempo do que o tempo de redistribuição de estruturas
			if (Date.now() - processorInfo.lastContact > REDISTRIBUTION_INTERVAL)
				this.registeredProcessors.delete(id);
		});
	}

	/**
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	async list (req, res) {
		res.status(200).json(Array.from(this.registeredProcessors.values()));
	}

	/**
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	async registerProcessor (req, res) {
		const id = uuidv4();
		this.registeredProcessors.set(id, new ProcessorInfo(id, req.headers.host));

		const token = sign({ id }, KEY_TOKEN);
		res.status(201).json({ token, id });
	}

	/**
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	async unregisterProcessor (req, res) {
		if (!res.locals.processorInfo || !res.locals.processorInfo.id || !this.registeredProcessors.has(res.locals.processorInfo.id))
			return res.status(404).json({ message: "Processor not registered." });

		this.registeredProcessors.delete(res.locals.processorInfo.id);
		res.status(200).json({ success: true });
	}

	/**
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 * @param {import("express").NextFunction} next
	 */
	async ensureAuthorized (req, res, next) {
		const token = req.headers["x-access-token"];
		if (!token) {
			res.status(403).json({ message: "Access denied. Processor not registered." });
			return res.end();
		}

		verify(token, KEY_TOKEN, (error, processor) => {
			if (error) {
				res.status(403).json({
					message: "Access denied. Processor not registered.",
					expired: error.name === "TokenExpiredError",
					error
				});
				return res.end();
			}

			res.locals.processorInfo = this.registeredProcessors.get(processor.id);
			if (!res.locals.processorInfo) {
				res.status(403).json({ message: "Access denied. Processor not registered." });
				return res.end();
			}

			res.locals.processorInfo.lastContact = Date.now();
			next(null);
		});
	}
}

module.exports = new Naming();
