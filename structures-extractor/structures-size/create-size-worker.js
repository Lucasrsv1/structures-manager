const { fork } = require("child_process");
const path = require("path");

const REVIVAL_TIMEOUT = process.env.WORKER_REVIVAL_TIMEOUT || 250;

const workerPath = path.resolve(__dirname, "./size-worker/index.js");

/**
 * Cria instâncias de processos filhos para computar as distâncias.
 * @param {ChildProcess[]} childProcesses Vetor de processos filhos
 * @param {(ChildProcess, Serializable) => void} messagesHandler Função de tratamento de mensagens recebidas de processos filhos
 * @param {number} [qty] quantidade de workers a serem criados
 * @param {number} [startingId] identificador inicial dos consumidores a serem criados
 */
function createWorker (childProcesses, messagesHandler, qty = 1, startingId = 1) {
	for (let id = startingId; id < startingId + qty; id++) {
		console.log("Spawning worker", id);

		const childEnv = process.env;
		childEnv.CHILD_ID = id;

		const child = fork(workerPath, {
			cwd: __dirname,
			detached: false,
			env: childEnv
		});

		child.on("message", message => {
			if (!message.finished && !message.started)
				return console.info("Received message:", message);

			messagesHandler(child, message);
		});

		child.on("exit", code => {
			const childIdx = childProcesses.findIndex(c => c.child === child);
			const childId = childProcesses[childIdx].id;

			childProcesses.splice(childIdx, 1);
			if (code === 0 || child.needToDie) return;

			setTimeout(createWorker, REVIVAL_TIMEOUT, childProcesses, messagesHandler, 1, childId);
		});

		childProcesses.push({ child, isBusy: false, isReady: false, id });
	}
}

module.exports = { createWorker };
