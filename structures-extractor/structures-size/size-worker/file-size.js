const axios = require("axios");
const chalk = require("chalk");

const { timeFormat } = require("../../../utils/time-format");

const _sizeFormat = bytes => chalk.bold(chalk.magenta(`${bytes} bytes`));

const RCSB_URL = process.env.RCSB_URL;

/**
 * Obtém o tamanho do arquivo comprimido de uma estrutura
 * @param {string} structure Nome do arquivo comprimido da estrutura
 * @returns {Promise<number | undefined>} Tamanho do arquivo em bytes
 */
async function getStructureSize (structure) {
	const fileURL = `${RCSB_URL}/${structure}`;

	try {
		const start = Date.now();
		const response = await axios({
			method: "head",
			url: fileURL,
			timeout: 60000
		});

		const bytesCount = response.headers.get("Content-Length");

		console.log(`[${structure}] Structure size is ${_sizeFormat(bytesCount)} (${timeFormat(Date.now() - start)})`);
		return bytesCount;
	} catch (error) {
		console.error(`[${structure}] Error getting structure size:`, error);
		return undefined;
	}
}

module.exports = { getStructureSize };
