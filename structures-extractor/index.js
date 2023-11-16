// Configura variáveis de ambiente o mais cedo possível
require("dotenv").config();

// Configura estampa de tempo dos logs
require("console-stamp")(console, { format: ":date(yyyy-mm-dd HH:MM:ss.l).yellow :label" });

const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const { getStructures } = require("./get-structures");
const { timeFormat } = require("../utils/time-format");

const { downloadStructuresList, removePreviousFiles } = require("./download-file");
const { updateMongoStructuresList } = require("./build-mongo-collections");
const { getStructuresSize } = require("./structures-size/get-structure-sizes");

const extractGzApp = path.resolve(__dirname, "extract-gz.sh");
const extractedPath = path.resolve("./structures-extractor/downloaded-files/current_file_holdings.json");

const DECOMPRESS_TIMEOUT = process.env.DECOMPRESS_TIMEOUT || 60000;

async function updateStructuresList () {
	try {
		removePreviousFiles();

		const listPath = await downloadStructuresList();
		if (!listPath) return;

		console.log("Extracting structures list...");
		await new Promise((resolve, reject) => {
			const start = Date.now();
			let child = spawn(extractGzApp, [listPath]);

			child.stderr.on("data", error => {
				console.error("[ShellScript App] Couldn't extract list of structures:", error);
				return reject(error);
			});

			child.on("close", code => {
				// Limpa variável para não matar um processo que já terminou
				child = undefined;
				console.log(`[ShellScript App] Finished with termination code: ${code}.`);

				console.log(`Compressed file extracted in ${timeFormat(Date.now() - start)}.`);
				resolve();
			});

			// Garante que o processo filho vai terminar em tempo hábil, nem que seja com erro
			setTimeout(() => {
				if (child) {
					child.kill();
					reject("Timeout");
				}
			}, DECOMPRESS_TIMEOUT);
		});

		const structuresList = getStructures(
			JSON.parse(fs.readFileSync(extractedPath))
		);

		const success = await updateMongoStructuresList(structuresList);
		if (!success) return;
	} catch (error) {
		console.error("Couldn't download and extract new structures:", error);
	}
}

getStructuresSize();

(async () => {
	await updateStructuresList();

	// Atualiza a lista de estruturas de 30 em 30 minutos
	cron.schedule("*/30 * * * *", updateStructuresList);
})();
