// Configura variáveis de ambiente o mais cedo possível
require("dotenv").config();

// Configura estampa de tempo dos logs
require("console-stamp")(console, { format: ":date(yyyy-mm-dd HH:MM:ss.l).yellow :label" });

const chalk = require("chalk");
const cors = require("cors");
const dayjs = require("dayjs");
const express = require("express");
const morgan = require("morgan");
const path = require("path");

const routes = require("./routes");

// Define o tamanho máximo dos arquivos que podem ser processados via compartilhamento da CPU entre múltiplos arquivos,
// ou seja, acima desse tamanho, a CPU inteira será alocada para processar um único arquivo, cada núcleo processando um pedaço
global.MAXIMUM_SIZE_FOR_MULTI_FILES_MODE = 1 * 1024 * 1024; // 1MB

const app = express();
app.set("port", process.env.PORT || 3000);

morgan.token("my-date", () => chalk.yellow(`[${dayjs().format("YYYY-MM-DD HH:mm:ss.SSS")}]`));
morgan.token("content-length", (_, res) => res.getHeader("content-length") || "0");
app.use(morgan(":my-date [WEB] :method :url :status :response-time ms :content-length bytes"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
	origin: "*",
	methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	preflightContinue: true,
	optionsSuccessStatus: 200
}));

app.use("/api", routes);

app.use(express.static(path.join(__dirname, "public")));

// Manda todos as outras requisições para o index.html
app.get("/*", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(app.get("port"), () => {
	console.log("Server is listening at", app.get("port"));
});
