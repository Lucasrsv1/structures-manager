/**
 * @enum {string}
 */
const ProcessingModes = Object.freeze({
	UNDEFINED: "UNDEFINED",
	SINGLE_FILE: "SINGLE_FILE",
	MULTI_FILES: "MULTI_FILES"
});

class ProcessorInfo {
	constructor (id, host) {
		this.id = id;
		this.host = host;
		this.files = [];
		this.processingType = ProcessingModes.UNDEFINED;
		this.lastContact = Date.now();
	}

	setProcessingType (processingType) {
		this.processingType = processingType;
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
