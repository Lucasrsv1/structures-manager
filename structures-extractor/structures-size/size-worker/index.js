const { getStructureSize } = require("./file-size");

// Configura variáveis de ambiente o mais cedo possível
require("dotenv").config();

// Configura estampa de tempo dos logs
require("console-stamp")(console, {
	format: `:date(yyyy-mm-dd HH:MM:ss.l).yellow :label [WORKER ID: ${process.env.CHILD_ID}, PID: ${process.pid}]`
});

process.on("message", async message => {
	if (!message.filename)
		return console.info("Received message:", message);

	const size = await getStructureSize(message.filename);

	// Envia resultado para o processo pai
	if (!size)
		return _sendResponse(message.filename, false);

	_sendResponse(message.filename, true, size);
});


/**
 * Envia o resultado do processamento para o processo pai
 * @param {string} structure Nome do arquivo comprimido da estrutura
 * @param {boolean} isSuccess Flag que informa se a estrutura foi processada com sucesso ou não
 * @param {number} size Resultado da menor distância entre os átomos da estrutura
 */
function _sendResponse (structure, isSuccess, size = null) {
	process.send({
		finished: true,
		childId: process.env.CHILD_ID,
		failure: !isSuccess,
		result: size,
		filename: structure
	});
}

console.log("Worker started.");
process.send({ started: true });
