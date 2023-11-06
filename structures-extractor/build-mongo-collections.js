// Configura variáveis de ambiente o mais cedo possível
require("dotenv").config();

// Configura estampa de tempo dos logs
require("console-stamp")(console, { format: ":date(yyyy-mm-dd HH:MM:ss.l).yellow :label" });

const chalk = require("chalk");

const start = Date.now();

const mongo = require("../mongo");
const structuresJson = require("../structures.json");

const _timeFormat = ms => chalk.bold(chalk.red(`${ms} ms`));
const sleep = ms => new Promise(res => setTimeout(res, ms));

(async () => {
	while (!mongo.connected)
		await sleep(500);

	try {
		const structuresExists = (await mongo.client.db.listCollections({ name: "structures" }).toArray()).length > 0;
		const minDistanceExists = (await mongo.client.db.listCollections({ name: "min-distance" }).toArray()).length > 0;

		if (structuresExists) {
			console.log("Cleaning collection structures...");
			await mongo.Structures.deleteMany();
		} else {
			console.log("Creating collection structures...");
			await mongo.Structures.createCollection();
		}

		if (minDistanceExists) {
			console.log("Cleaning collection min-distance...");
			await mongo.MinDistance.deleteMany();
		} else {
			console.log("Creating collection min-distance...");
			await mongo.MinDistance.createCollection();
		}

		console.log("Inserting structures...");
		const bulkOp = mongo.Structures.collection.initializeUnorderedBulkOp();
		for (const filename of structuresJson)
			bulkOp.insert({ filename, bytesCount: null, distributedAt: null, result: null, processingTime: null });

		await bulkOp.execute();

		console.log("Inserting empty min distance document...");
		await mongo.MinDistance.insertMany([{ result: Infinity }]);

		console.log(`Finished in ${_timeFormat(Date.now() - start)}.`);
		process.exit(0);
	} catch (error) {
		console.error("Error building mongo collections.", error);
		process.exit(1);
	}
})();
