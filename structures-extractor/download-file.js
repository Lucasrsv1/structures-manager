/**
 * O arquivo com a lista das estruturas atuais pode ser obtido dos seguintes links:
 *
 * https://www.wwpdb.org/ftp/pdb-ftp-sites
 *
 * https://files.wwpdb.org/pub/pdb/holdings/current_file_holdings.json.gz
 */

const axios = require("axios");
const path = require("path");
const stream = require("stream");

const { promisify } = require("util");
const { createWriteStream, rmSync, existsSync, mkdirSync } = require("fs");
const { timeFormat } = require("../utils/time-format");

const finished = promisify(stream.finished);

const STRUCTURES_FILE_URL = "https://files.wwpdb.org/pub/pdb/holdings/current_file_holdings.json.gz";

const outputFolder = path.resolve(__dirname, "downloaded-files");

/**
 * Realiza o download do arquivo comprimido com a lista de estruturas
 * @returns {Promise<string>} caminho para o arquivo que foi baixado
 */
async function downloadStructuresList () {
	const filepath = path.resolve(outputFolder, "current_file_holdings.json.gz");

	try {
		const start = Date.now();
		console.log("Downloading structures list...");

		const writer = createWriteStream(filepath);
		const response = await axios({
			method: "get",
			url: STRUCTURES_FILE_URL,
			responseType: "stream",
			timeout: 60000
		});

		response.data.pipe(writer);
		await finished(writer);

		console.log(`Structures list downloaded in ${timeFormat(Date.now() - start)}.`);
		return filepath;
	} catch (error) {
		if (existsSync(filepath))
			rmSync(filepath, { force: true });

		console.error("Error downloading structures list:", error);
		return null;
	}
}

/**
 * Limpa a pasta de download de arquivos
 */
function removePreviousFiles () {
	console.log("Deleting previous files...");
	const start = Date.now();

	if (existsSync(outputFolder))
		rmSync(outputFolder, { force: true, recursive: true });

	mkdirSync(outputFolder);
	console.log(`Previous files deleted in ${timeFormat(Date.now() - start)}.`);
}

module.exports = { downloadStructuresList, removePreviousFiles };
