const mongo = require("../mongo");
const { timeFormat } = require("../utils/time-format");

const sleep = ms => new Promise(res => setTimeout(res, ms));

/**
 * @param {string[]} structuresList
 */
async function updateMongoStructuresList (structuresList) {
	const start = Date.now();

	while (!mongo.connected) {
		console.info("Waiting for mongo connection...");
		await sleep(500);
	}

	try {
		const structuresExists = (await mongo.client.db.listCollections({ name: "structures" }).toArray()).length > 0;
		const minDistanceExists = (await mongo.client.db.listCollections({ name: "min-distance" }).toArray()).length > 0;

		if (!structuresExists) {
			console.log("Creating collection structures...");
			await mongo.Structures.createCollection();
		}

		if (!minDistanceExists) {
			console.log("Creating collection min-distance...");
			await mongo.MinDistance.createCollection();
		}

		const hasMinDistance = (await mongo.MinDistance.find({})).length > 0;
		if (!hasMinDistance) {
			console.log("Inserting empty min distance document...");
			await mongo.MinDistance.insertMany([{ result: Infinity }]);
		}

		const existentStructures = await mongo.Structures.find({}, { filename: true });
		console.log(`${existentStructures.length} structures already exist in mongo`);

		console.log("Identifying new structures...");
		for (const structure of existentStructures) {
			const structureIdx = structuresList.indexOf(structure.filename);
			if (structureIdx >= 0)
				structuresList.splice(structureIdx, 1);
			else
				console.log(structure.filename, "is not in the list of structures anymore");
		}

		if (!structuresList.length) {
			console.log("Nothing new to insert in mongo.");
			return true;
		}

		console.log(`Inserting ${structuresList.length} structures...`);
		const bulkOp = mongo.Structures.collection.initializeUnorderedBulkOp();
		for (const filename of structuresList) {
			bulkOp.insert({
				filename,
				bytesCount: null,
				distributedAt: null,
				lastPing: null,
				result: null,
				processingTime: null,
				finishedAt: null,
				totalTime: null
			});
		}

		await bulkOp.execute();

		console.log(`Finished updating mongo in ${timeFormat(Date.now() - start)}.`);
		return true;
	} catch (error) {
		console.error("Error updating mongo:", error);
		return false;
	}
}

module.exports = { updateMongoStructuresList };

