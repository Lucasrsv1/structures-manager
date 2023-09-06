const fs = require("fs");
const { resolve } = require("path");

/**
 * O arquivo com a lista das estruturas atuais foi obtido dos seguintes links:
 *
 * https://www.wwpdb.org/ftp/pdb-ftp-sites
 *
 * https://files.wwpdb.org/pub/pdb/holdings/current_file_holdings.json.gz
 */
const holdings = require("./current_file_holdings.json");

// Para cada estrutura pega a primeira URL e obtém apenas o nome do arquivo
// * Preferencialmente usa o arquivo PDB, pois é mais leve e rápido de processar,
// * mas como nem todas as estruturas possuem arquivo PDB, usa o CIF em último caso.
const holdingsFiles = Object.keys(holdings).map(k => {
	let url = holdings[k].mmcif[0];
	if (holdings[k].pdb)
		url = url.replace(".cif", ".pdb");

	return url.split("/").pop();
});

// Escreve no arquivo JSON de saída os nomes dos arquivos
const outputFile = resolve(__dirname, "..", "structures.json");
fs.writeFileSync(outputFile, JSON.stringify(holdingsFiles));

console.log(`${holdingsFiles.length} structure filenames exported to "${outputFile}"`);
