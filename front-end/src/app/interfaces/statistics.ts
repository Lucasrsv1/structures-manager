export interface ICount {
	count: number;
	pending: number;
	processing: number;
	processed: number;
}

export interface IRange {
	avg: number;
	min: number;
	max: number;
}

export interface IStatistics {
	byteCount: {
		pending: number;
		processed: number;
	};

	statistics: {
		processingTime: IRange;
		ratio: IRange;
		size: IRange;
	};

	multiFiles: ICount;
	singleFile: ICount;
	structures: ICount;

	minDistance: number | null;
}

export function getEmptyStatistics (): IStatistics {
	return {
		byteCount: { pending: 0, processed: 0 },

		statistics: {
			processingTime: { avg: 0, min: 0, max: 0 },
			ratio: { avg: 0, min: 0, max: 0 },
			size: { avg: 0, min: 0, max: 0 }
		},

		multiFiles: {
			count: 0,
			pending: 0,
			processing: 0,
			processed: 0
		},

		singleFile: {
			count: 0,
			pending: 0,
			processing: 0,
			processed: 0
		},

		structures: {
			count: 0,
			pending: 0,
			processing: 0,
			processed: 0
		},

		minDistance: null
	};
}
