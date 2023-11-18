export enum ProcessingModes {
	UNDEFINED,
	MULTI_FILES,
	SINGLE_FILE
}

export interface IProcessors {
	id: string;
	host: string;
	processingMode: ProcessingModes;
	qtyCPUs: number;
	lastContact: number;
	statusClass?: string;
}
