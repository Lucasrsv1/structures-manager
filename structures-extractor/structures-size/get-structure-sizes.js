// Configura variáveis de ambiente o mais cedo possível
require("dotenv").config();

// Configura estampa de tempo dos logs
require("console-stamp")(console, { format: ":date(yyyy-mm-dd HH:MM:ss.l).yellow :label" });

const os = require("os");
const { createWorker } = require("./create-size-worker");

const mongo = require("../../mongo");

const sleep = ms => new Promise(res => setTimeout(res, ms));

const RUN_INTERVAL = process.env.RUN_INTERVAL || 5000;

const availableParallelism = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
const QTY_CPUS = Math.max(1, process.env.QTY_CPUS || availableParallelism);

const processingDict = {};

/**
 * @type {Array<{ child: ChildProcess, isBusy: boolean, isReady: boolean, id: number }>}
 */
const CHILDREN = [];

/**
 * Trata o término da aplicação finalizando os processos filhos
 * @param {ChildProcess[]} childProcesses Vetor de processos filhos
 */
function handleProcessExit (childProcesses) {
	const terminationSignals = [
		"SIGHUP", "SIGINT", "SIGQUIT", "SIGILL", "SIGTRAP", "SIGABRT",
		"SIGBUS", "SIGFPE", "SIGUSR1", "SIGSEGV", "SIGUSR2", "SIGTERM"
	];

	// Registra eventos de tratamento do término inesperado da aplicação para matar todos os processos filhos
	for (const sig of terminationSignals) {
		process.on(sig, () => {
			console.log("Killing the children.");
			for (const { child } of childProcesses) {
				child.needToDie = true;
				child.kill(9);
			}

			childProcesses.splice(0);
			process.exit(1);
		});
	}
}

function onMessageFromWorker (child, message) {
	if (!message.finished && !message.started)
		return console.info("Received message:", message);

	const childRef = CHILDREN.find(c => c.child === child);
	if (!childRef)
		return console.error("Couldn't find reference to child ID", message.childId);

	if (message.started) {
		childRef.isReady = true;
		return;
	}

	childRef.isBusy = false;
	if (!message.failure) {
		saveSizeResult(message.result, message.filename);
		console.log("Got results from child ID", message.childId);
	} else {
		delete processingDict[message.filename];
		console.error("Got failure from child ID", message.childId);
	}
}

async function saveSizeResult (result, filename) {
	try {
		await mongo.Structures.updateOne({ filename }, { bytesCount: result });
	} catch (error) {
		console.error("Couldn't save size on MongoDB:", error);
	}

	delete processingDict[filename];
}

async function getNextStructures (qty) {
	const structures = await mongo.Structures.find({
		bytesCount: null,
		filename: { $nin: Object.keys(processingDict) }
	}).limit(qty);

	return structures.map(s => s.filename);
}

/**
 * Função de execução infinita da lógica de processamento de estruturas
 */
async function run () {
	try {
		const qtyBusyChildren = CHILDREN.filter(c => c.isBusy).length;
		if (qtyBusyChildren > 0)
			console.log(`Still processing structures, ${qtyBusyChildren} remaining...`);

		const availableCPUs = CHILDREN.filter(c => c.isReady && !c.isBusy).length;
		if (availableCPUs > 0) {
			const filenames = await getNextStructures(availableCPUs);
			for (let i = 0; i < filenames.length; i++) {
				const freeChild = CHILDREN.find(c => c.isReady && !c.isBusy);

				// Se não tem filhos livres, cancela processamento das estruturas não enviadas a processos filhos
				if (!freeChild) break;

				freeChild.child.send({ filename: filenames[i] });
				freeChild.isBusy = true;
				processingDict[filenames[i]] = true;
			}
		}
	} catch (error) {
		console.error(error);
	}

	await sleep(RUN_INTERVAL);
	run();
}

async function start () {
	while (!mongo.connected)
		await sleep(500);

	handleProcessExit(CHILDREN);

	createWorker(CHILDREN, onMessageFromWorker, QTY_CPUS);

	await sleep(5000);
	run();

	console.log(`Structures size getter started with interval of ${RUN_INTERVAL} ms`);
}

start();
