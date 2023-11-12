/**
 * @enum {string}
 */
const ProcessingTypes = Object.freeze({
	UNDEFINED: "UNDEFINED",
	SINGLE_FILE: "SINGLE_FILE",
	MULTIPLE_FILES: "MULTIPLE_FILES"
});

class ProcessorInfo {
	constructor (id, host) {
		this.id = id;
		this.host = host;
		this.files = [];
		this.processingType = ProcessingTypes.UNDEFINED;
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

module.exports = { ProcessorInfo, ProcessingTypes };
