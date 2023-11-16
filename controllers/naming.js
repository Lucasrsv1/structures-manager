const { body } = require("express-validator");
const { v4: uuidv4 } = require("uuid");

const { sign, verify } = require("jsonwebtoken");

const mongo = require("../mongo");

const { ProcessorInfo, ProcessingModes } = require("../models/processor-info");
const { isRequestInvalid } = require("../utils/http-validation");

const KEY_TOKEN = uuidv4();

const REDISTRIBUTION_INTERVAL = process.env.REDISTRIBUTION_INTERVAL || (5 * 60 * 1000);

class Naming {
	constructor () {
		/**
		 * @type {Map<string, ProcessorInfo>}
		 */
		this.registeredProcessors = new Map();

		this.validations = {
			registerProcessor: [
				body("qtyCPUs").isInt({ min: 1 }).withMessage("Invalid quantity of CPU Cores.")
			]
		};

		this.interval = setInterval(this.intervalCycle.bind(this), 30000);
	}

	intervalCycle () {
		this.garbageCollectorJob();
		this.updateProcessingModes();
	}

	garbageCollectorJob () {
		this.registeredProcessors.forEach((processorInfo, id) => {
			// Remove processadores que não se comunicam há mais tempo do que o tempo de redistribuição de estruturas
			if (Date.now() - processorInfo.lastContact > REDISTRIBUTION_INTERVAL)
				this.registeredProcessors.delete(id);
		});
	}

	async updateProcessingModes () {
		const pendingStructures = await mongo.Structures.count({
			result: null,
			$or: [
				{ lastPing: null },
				{ lastPing: { $lt: new Date(Date.now() - REDISTRIBUTION_INTERVAL) } }
			],
			bytesCount: { $ne: null }
		});

		const pendingSingleFileStructures = await mongo.Structures.count({
			result: null,
			$or: [
				{ lastPing: null },
				{ lastPing: { $lt: new Date(Date.now() - REDISTRIBUTION_INTERVAL) } }
			],
			bytesCount: { $gt: global.MAXIMUM_SIZE_FOR_MULTI_FILES_MODE }
		});

		const pendingMultiFileStructures = pendingStructures - pendingSingleFileStructures;

		// Processadores com a maior quantidade de núcleos devem ter prioridade para processar estruturas grandes
		const processors = Array.from(this.registeredProcessors.values()).sort((a, b) => {
			const cpuComparison = b.qtyCPUs - a.qtyCPUs;
			if (cpuComparison !== 0)
				return b.qtyCPUs - a.qtyCPUs;

			// Caso o número de processadores seja igual, dá prioridade para o processador que tem mais chance de
			// estar ativo com base na data da última comunicação dele com o servidor
			return b.lastContact - a.lastContact;
		});

		let qtyDesiredSingleFileProcessors = Math.ceil(pendingSingleFileStructures / pendingStructures * processors.length);

		// Se só tem um processador, dá prioridade para o tipo de processamento que tem mais estruturas pendentes
		if (processors.length === 1 && pendingSingleFileStructures < pendingMultiFileStructures)
			qtyDesiredSingleFileProcessors = 0;

		for (let i = 0; i < processors.length; i++) {
			if (i < qtyDesiredSingleFileProcessors)
				processors[i].setProcessingMode(ProcessingModes.SINGLE_FILE);
			else
				processors[i].setProcessingMode(ProcessingModes.MULTI_FILES);
		}
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
		if (isRequestInvalid(req, res)) return;

		const id = uuidv4();
		this.registeredProcessors.set(id, new ProcessorInfo(id, req.headers.host, req.body.qtyCPUs));
		await this.updateProcessingModes();

		const token = sign({ id }, KEY_TOKEN);
		const processingMode = this.registeredProcessors.get(id).processingMode;

		res.status(201).json({ id, token, processingMode });
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
