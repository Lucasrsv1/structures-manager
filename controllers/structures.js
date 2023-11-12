const chalk = require("chalk");

const mongo = require("../mongo");

const MAXIMUM_PER_MACHINE = 20;

const REDISTRIBUTION_INTERVAL_PDB = process.env.REDISTRIBUTION_INTERVAL_PDB || (5 * 60 * 1000);
const REDISTRIBUTION_INTERVAL_CIF = process.env.REDISTRIBUTION_INTERVAL_CIF || (10 * 60 * 60 * 1000);

// TODO: apply validation to the routes
// TODO: implement a handshake to protect routes

class Structures {
	/**
	 * @param {import("express").Request} req
	 * @param {import("express").Response} res
	 */
	async list (req, res) {
		try {
			const results = await mongo.Structures.find({}, { _id: false, distributedAt: false });
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
			const count = await mongo.Structures.count();
			const pending = await mongo.Structures.count({ result: null });
			const processing = await mongo.Structures.count({
				result: null,
				$or: [
					{ filename: { $regex: /\.pdb\.gz$/ }, distributedAt: { $gte: new Date(Date.now() - REDISTRIBUTION_INTERVAL_PDB) } },
					{ filename: { $regex: /\.cif\.gz$/ }, distributedAt: { $gte: new Date(Date.now() - REDISTRIBUTION_INTERVAL_CIF) } }
				]
			});
			res.status(200).json({ count, pending, processing, processed: count - pending });
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
		try {
			const qty_cpus = Math.min(MAXIMUM_PER_MACHINE, Math.max(1, Number(req.params.qty_cpus) || 1));
			const filters = {
				result: null,
				$or: [
					{ distributedAt: null },
					{ filename: { $regex: /\.pdb\.gz$/ }, distributedAt: { $lt: new Date(Date.now() - REDISTRIBUTION_INTERVAL_PDB) } },
					{ filename: { $regex: /\.cif\.gz$/ }, distributedAt: { $lt: new Date(Date.now() - REDISTRIBUTION_INTERVAL_CIF) } }
				]
			};

			if (req.params.filetype.toLowerCase() === "pdb")
				filters.filename = { $regex: /\.pdb\.gz$/ };
			else if (req.params.filetype.toLowerCase() === "cif")
				filters.filename = { $regex: /\.cif\.gz$/ };

			const results = await mongo.Structures.find(
				filters,
				{ filename: true, _id: true }
			).limit(qty_cpus);

			const distributedAt = new Date();
			const updated = await mongo.Structures.updateMany(
				{ _id: { $in: results.map(r => r._id) } },
				{ distributedAt }
			);

			if (updated.modifiedCount === results.length)
				return res.status(200).json({ filenames: results.map(r => r.filename) });

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
	async saveResult (req, res) {
		try {
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

			res.status(201).json({ success: updated.modifiedCount > 0, isNewMinDistance: updatedMinDistance.modifiedCount > 0 });
		} catch (error) {
			console.error(error);
			res.status(500).json(error);
		}
	}
}

module.exports = new Structures();
