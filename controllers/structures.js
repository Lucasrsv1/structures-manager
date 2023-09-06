const chalk = require("chalk");

const mongo = require("../mongo");

const MAXIMUM_PER_MACHINE = 20;

const REDISTRIBUTION_INTERVAL = process.env.REDISTRIBUTION_INTERVAL || (5 * 60 * 1000);

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
				distributedAt: { $gte: new Date(Date.now() - REDISTRIBUTION_INTERVAL) }
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
			const results = await mongo.Structures.find(
				{
					result: null,
					$or: [
						{ distributedAt: null },
						{ distributedAt: { $lt: new Date(Date.now() - REDISTRIBUTION_INTERVAL) } }
					]
				},
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
			const updatedMinDistance = await mongo.MinDistance.updateMany(
				{ result: { $gt: req.body.result } },
				{ result: req.body.result }
			);

			if (updatedMinDistance.modifiedCount > 0)
				console.log(chalk.green(`Got new minimum distance! ${req.body.result} from structure ${req.body.filename}.`));

			const updated = await mongo.Structures.updateOne(
				{ filename: req.body.filename },
				{ result: req.body.result }
			);

			res.status(201).json({ success: updated.modifiedCount > 0, isNewMinDistance: updatedMinDistance.modifiedCount > 0 });
		} catch (error) {
			console.error(error);
			res.status(500).json(error);
		}
	}
}

module.exports = new Structures();
