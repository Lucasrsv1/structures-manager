const chalk = require("chalk");
const { param, body } = require("express-validator");

const mongo = require("../mongo");
const naming = require("./naming");

const { isRequestInvalid } = require("../utils/http-validation");
const { ProcessorInfo } = require("../models/processor-info");

// Define a quantidade máxima de arquivos que podem ser enviados a cada requisição
const MAXIMUM_FILES_PER_REQUEST = 20;

// Define o tempo máximo desde o último ping do processador para que um arquivo seja redistribuído para outro processador
const REDISTRIBUTION_INTERVAL = process.env.REDISTRIBUTION_INTERVAL || (5 * 60 * 1000);

class Structures {
	constructor () {
		this.validations = {
			getNext: [
				naming.ensureAuthorized.bind(naming),
				param("qty_cpus").optional().isInt({ min: 1 }).withMessage("Invalid number of CPUs.").toInt(),
				param("mode").optional().toUpperCase().isIn(["MULTI_FILES", "SINGLE_FILE"]).withMessage("Invalid processing mode.")
			],
			saveResult: [
				naming.ensureAuthorized.bind(naming),
				body("filename").isString().isLength({ min: 1 }).withMessage("Invalid structure filename."),
				body("result").isNumeric().withMessage("Invalid processing result.").toFloat(),
				body("processingTime").isNumeric().withMessage("Invalid processing time.").toInt()
			],
			processorPing: [
				naming.ensureAuthorized.bind(naming),
				body("filenames").isArray({ min: 1 }).withMessage("Invalid array of filenames."),
				body("filenames.*").isString().isLength({ min: 1 }).withMessage("Invalid structure filename.")
			]
		};
	}

	/**
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	async list (req, res) {
		try {
			const results = await mongo.Structures.find(
				{},
				{ _id: false, distributedAt: false, lastPing: false, finishedAt: false }
			);
			res.status(200).json(results);
		} catch (error) {
			console.error(error);
			res.status(500).json(error);
		}
	}

	/**
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	async count (req, res) {
		try {
			let statistics = {};
			let minDistance = {};
			const structures = {};
			const byteCount = {};
			const multiFiles = {};
			const singleFile = {};

			const promises = [
				mongo.Structures.count().then(c => structures.count = c),
				mongo.Structures.count({ result: null }).then(c => structures.pending = c),
				mongo.Structures.count({
					result: null,
					lastPing: { $gte: new Date(Date.now() - REDISTRIBUTION_INTERVAL) }
				}).then(c => structures.processing = c),

				mongo.Structures.count({ bytesCount: null }).then(c => byteCount.pending = c),

				mongo.Structures.count({
					bytesCount: { $lte: global.MAXIMUM_SIZE_FOR_MULTI_FILES_MODE }
				}).then(c => multiFiles.count = c),
				mongo.Structures.count({
					result: null,
					bytesCount: { $lte: global.MAXIMUM_SIZE_FOR_MULTI_FILES_MODE }
				}).then(c => multiFiles.pending = c),
				mongo.Structures.count({
					result: null,
					bytesCount: { $lte: global.MAXIMUM_SIZE_FOR_MULTI_FILES_MODE },
					lastPing: { $gte: new Date(Date.now() - REDISTRIBUTION_INTERVAL) }
				}).then(c => multiFiles.processing = c),

				mongo.Structures.count({
					bytesCount: { $gt: global.MAXIMUM_SIZE_FOR_MULTI_FILES_MODE }
				}).then(c => singleFile.count = c),
				mongo.Structures.count({
					result: null,
					bytesCount: { $gt: global.MAXIMUM_SIZE_FOR_MULTI_FILES_MODE }
				}).then(c => singleFile.pending = c),
				mongo.Structures.count({
					result: null,
					bytesCount: { $gt: global.MAXIMUM_SIZE_FOR_MULTI_FILES_MODE },
					lastPing: { $gte: new Date(Date.now() - REDISTRIBUTION_INTERVAL) }
				}).then(c => singleFile.processing = c),

				mongo.Structures.aggregate([
					{ $match: { result: { $ne: null } } },
					{
						$group: {
							_id: "",
							minProcessingTime: { $min: "$processingTime" },
							avgProcessingTime: { $avg: "$processingTime" },
							maxProcessingTime: { $max: "$processingTime" },
							minSize: { $min: "$bytesCount" },
							avgSize: { $avg: "$bytesCount" },
							maxSize: { $max: "$bytesCount" },
							minRatio: {
								$min: {
									$divide: ["$bytesCount", "$processingTime"]
								}
							},
							maxRatio: {
								$max: {
									$divide: ["$bytesCount", "$processingTime"]
								}
							},
							avgRatio: {
								$avg: {
									$divide: ["$bytesCount", "$processingTime"]
								}
							}
						}
					}
				]).then(result => statistics = result),

				mongo.MinDistance.find({}).then(result => minDistance = result)
			];

			await Promise.all(promises);

			structures.processed = Math.max(structures.count, structures.pending) - structures.pending;
			byteCount.processed = Math.max(structures.count, byteCount.pending) - byteCount.pending;
			multiFiles.processed = Math.max(multiFiles.count, multiFiles.pending) - multiFiles.pending;
			singleFile.processed = Math.max(singleFile.count, singleFile.pending) - singleFile.pending;

			res.status(200).json({
				byteCount,
				multiFiles,
				singleFile,
				structures,
				statistics: {
					processingTime: {
						avg: statistics[0] ? statistics[0].avgProcessingTime : 0,
						max: statistics[0] ? statistics[0].maxProcessingTime : 0,
						min: statistics[0] ? statistics[0].minProcessingTime : 0
					},
					ratio: {
						avg: statistics[0] ? statistics[0].avgRatio : 0,
						max: statistics[0] ? statistics[0].maxRatio : 0,
						min: statistics[0] ? statistics[0].minRatio : 0
					},
					size: {
						avg: statistics[0] ? statistics[0].avgSize : 0,
						max: statistics[0] ? statistics[0].maxSize : 0,
						min: statistics[0] ? statistics[0].minSize : 0
					}
				},
				minDistance: minDistance.length ? minDistance[0].result : null
			});
		} catch (error) {
			console.error(error);
			res.status(500).json(error);
		}
	}

	/**
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	async getNext (req, res) {
		if (isRequestInvalid(req, res)) return;

		try {
			if (!res.locals.processorInfo)
				return res.status(403).json({ message: "Access denied. Processor not registered." });

			/**
			 * @type {ProcessorInfo}
			 */
			const processorInfo = res.locals.processorInfo;

			const qty_cpus = Math.min(MAXIMUM_FILES_PER_REQUEST, Math.max(1, Number(req.params.qty_cpus) || 1));
			const filters = {
				result: null,
				$or: [
					{ lastPing: null },
					{ lastPing: { $lt: new Date(Date.now() - REDISTRIBUTION_INTERVAL) } }
				]
			};

			if (req.params.mode) {
				if (req.params.mode.toUpperCase() === "MULTI_FILES")
					filters.bytesCount = { $lte: global.MAXIMUM_SIZE_FOR_MULTI_FILES_MODE };
				else if (req.params.mode.toUpperCase() === "SINGLE_FILE")
					filters.bytesCount = { $gt: global.MAXIMUM_SIZE_FOR_MULTI_FILES_MODE };
			}

			const results = await mongo.Structures.find(
				filters,
				{ filename: true, _id: true }
			).limit(qty_cpus);

			if (!results.length) {
				return res.status(200).json({
					filenames: [],
					processingMode: processorInfo.processingMode
				});
			}

			const distributedAt = new Date();
			const lastPing = new Date();
			const updated = await mongo.Structures.updateMany(
				{ _id: { $in: results.map(r => r._id) } },
				{ distributedAt, lastPing }
			);

			if (updated.modifiedCount === results.length) {
				const filenames = results.map(r => r.filename);

				processorInfo.addFiles(filenames);
				return res.status(200).json({
					filenames,
					processingMode: processorInfo.processingMode
				});
			}

			console.error("Distribution inconsistency detected.", updated.modifiedCount, "!==", results.length);
			res.status(500).json({ message: "Distribution inconsistency detected. Try again." });
		} catch (error) {
			console.error(error);
			res.status(500).json(error);
		}
	}

	/**
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	async processorPing (req, res) {
		if (isRequestInvalid(req, res)) return;

		try {
			if (!res.locals.processorInfo)
				return res.status(403).json({ message: "Access denied. Processor not registered." });

			/**
			 * @type {ProcessorInfo}
			 */
			const processorInfo = res.locals.processorInfo;

			const filenames = [];
			const filesNotAllowed = [];

			for (const filename of req.body.filenames) {
				if (processorInfo.isProcessingFile(filename))
					filenames.push(filename);
				else
					filesNotAllowed.push(filename);
			}

			if (filesNotAllowed.length > 0 && filenames.length === 0)
				return res.status(403).json({ message: `Access denied. This processor is not allowed to process the following structures: ${filesNotAllowed.join(", ")}.` });

			const updated = await mongo.Structures.updateMany(
				{ filename: { $in: filenames } },
				{ lastPing: new Date() }
			);

			res.status(202).json({
				success: updated.modifiedCount > 0,
				filesNotAllowed,
				processingMode: processorInfo.processingMode
			});
		} catch (error) {
			console.error(error);
			res.status(500).json(error);
		}
	}

	/**
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	async saveResult (req, res) {
		if (isRequestInvalid(req, res)) return;

		try {
			if (!res.locals.processorInfo)
				return res.status(403).json({ message: "Access denied. Processor not registered." });

			/**
			 * @type {ProcessorInfo}
			 */
			const processorInfo = res.locals.processorInfo;

			if (!processorInfo.isProcessingFile(req.body.filename))
				return res.status(403).json({ message: `Access denied. This processor is not allowed to process structure ${req.body.filename}.` });

			const finishedAt = new Date();
			const updatedMinDistance = await mongo.MinDistance.updateMany(
				{ result: { $gt: req.body.result } },
				{ result: req.body.result }
			);

			if (updatedMinDistance.modifiedCount > 0)
				console.log(chalk.green(`Got new minimum distance! ${req.body.result} from structure ${req.body.filename}.`));

			const structure = await mongo.Structures.findOne(
				{ filename: req.body.filename }
			);

			const newData = {
				result: req.body.result,
				processingTime: req.body.processingTime,
				totalTime: finishedAt - structure.distributedAt,
				finishedAt
			};

			const updated = await mongo.Structures.updateOne(
				{ filename: req.body.filename },
				newData
			);

			processorInfo.finishedFile(req.body.filename);
			res.status(201).json({
				success: updated.modifiedCount > 0,
				isNewMinDistance: updatedMinDistance.modifiedCount > 0,
				processingMode: processorInfo.processingMode
			});
		} catch (error) {
			console.error(error);
			res.status(500).json(error);
		}
	}
}

module.exports = new Structures();
