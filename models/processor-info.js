/**
 * @enum {string}
 */
const ProcessingModes = Object.freeze({
	UNDEFINED: "UNDEFINED",
	SINGLE_FILE: "SINGLE_FILE",
	MULTI_FILES: "MULTI_FILES"
});

class ProcessorInfo {
	constructor (id, host, qtyCPUs) {
		this.id = id;
		this.host = host;
		this.qtyCPUs = qtyCPUs;
		this.files = [];
		this.processingMode = ProcessingModes.UNDEFINED;
		this.lastContact = Date.now();
	}

	setProcessingMode (processingMode) {
		this.processingMode = processingMode;
	}

	isProcessingFile (filename) {
		return this.files.includes(filename);
	}

	addFiles (filenames) {
		this.files = this.files.concat(filenames);
	}

	finishedFile (filename) {
		this.files = this.files.filter(f => f !== filename);
	}
}

module.exports = { ProcessorInfo, ProcessingModes };
