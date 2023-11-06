const mongoose = require("mongoose");

const MONGO_HOST = process.env.MONGO_HOST || "127.0.0.1:27017";

let connected = false;
const client = mongoose.connection;

client.on("error", error => {
	console.error("Mongo connection error:", error);
});

client.on("open", () => {
	connected = true;
	console.info("Mongo connected.");
});

client.on("reconnected", () => {
	connected = true;
	console.info("Mongo reconnected.");
});

client.on("disconnected", () => {
	connected = false;
	console.info("Mongo disconnected.");
});

// Inicializa conexão
async function forceConnect () {
	try {
		await mongoose.connect(
			`mongodb://${MONGO_HOST}/structures-manager`,
			{ useNewUrlParser: true, useUnifiedTopology: true }
		);
	} catch (error) {
		console.error("Mongo connection error:", error);
		forceConnect();
	}
}

forceConnect();

const structuresSchema = new mongoose.Schema({
	filename: String,
	bytesCount: Number,
	distributedAt: { type: Date, default: null },
	processingTime: { type: Number, default: null },
	result: { type: Number, default: null }
});

const minDistanceSchema = new mongoose.Schema({ result: Number }, { collection: "min-distance" });

const Structures = mongoose.model("Structures", structuresSchema);
const MinDistance = mongoose.model("MinDistance", minDistanceSchema);

module.exports = {
	client,
	Structures,
	MinDistance,
	get connected () {
		return connected;
	}
};
