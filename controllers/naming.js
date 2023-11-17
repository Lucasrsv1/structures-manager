const { body } = require("express-validator");
const { v4: uuidv4 } = require("uuid");

const { sign, verify } = require("jsonwebtoken");

const mongo = require("../mongo");

const { ProcessorInfo, ProcessingModes } = require("../models/processor-info");
const { isRequestInvalid } = require("../utils/http-validation");

// Chave aleatória para assinatura e validação de tokens de processadores registrados no servidor.
const KEY_TOKEN = uuidv4();

const REDISTRIBUTION_INTERVAL = process.env.REDISTRIBUTION_INTERVAL || (5 * 60 * 1000);

/**
 * Mantém um registro de processadores que estão utilizando este servidor mantendo um registro de identificação de cada cliente conectado.
 */
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

	/**
	 * Ciclo de atualização e manutenção dos registros de processadores.
	 */
	intervalCycle () {
		this.garbageCollectorJob();
		this.updateProcessingModes();
	}

	/**
	 * Função executada de tempos em tempos para remover processadores que não se comunicam há mais tempo de redistribuição de estruturas.
	 */
	garbageCollectorJob () {
		this.registeredProcessors.forEach((processorInfo, id) => {
			// Remove processadores que não se comunicam há mais tempo do que o tempo de redistribuição de estruturas
			if (Date.now() - processorInfo.lastContact > REDISTRIBUTION_INTERVAL)
				this.registeredProcessors.delete(id);
		});
	}

	/**
	 * Identifica a necessidade de processadores para trabalharem com estruturas grandes e
	 * define qual modo de processamento cada processador deverá utilizar.
	 */
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
				return cpuComparison;

			// Caso o número de processadores seja igual, dá prioridade para o processador que está processando uma única estrutura
			if (a.processingMode === ProcessingModes.SINGLE_FILE && b.processingMode !== ProcessingModes.SINGLE_FILE)
				return -1;
			else if (a.processingMode !== ProcessingModes.SINGLE_FILE && b.processingMode === ProcessingModes.SINGLE_FILE)
				return 1;

			// Caso o número de processadores seja igual e os dois estão operando no mesmo modo, dá prioridade para o processador
			// que tem mais chance de estar ativo com base na data da última comunicação dele com o servidor
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
	 * Lista os processadores registrados no servidor.
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	async list (req, res) {
		res.status(200).json(Array.from(this.registeredProcessors.values()));
	}

	/**
	 * Registra um novo processador no servidor.
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	async registerProcessor (req, res) {
		if (isRequestInvalid(req, res)) return;

		const id = uuidv4();
		const remoteHost = `${req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress}:${req.socket.remotePort}`;
		this.registeredProcessors.set(id, new ProcessorInfo(id, remoteHost, req.body.qtyCPUs));
		await this.updateProcessingModes();

		const token = sign({ id }, KEY_TOKEN);
		const processingMode = this.registeredProcessors.get(id).processingMode;

		res.status(201).json({ id, token, processingMode });
	}

	/**
	 * Remove um processador do servidor.
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
	 * Verifica se um processador está registrado no servidor e se está autorizado para processar acessar estruturas.
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
