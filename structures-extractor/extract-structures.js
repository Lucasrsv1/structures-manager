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

// Para cada estrutura pega a primeira URL mmcif e obtém o nome do arquivo
const holdingsFiles = Object.keys(holdings).map(k => holdings[k].mmcif[0].split("/").pop());

// Escreve no arquivo JSON de saída os nomes dos arquivos
const outputFile = resolve(__dirname, "..", "structures.json");
fs.writeFileSync(outputFile, JSON.stringify(holdingsFiles));

console.log(`${holdingsFiles.length} structure filenames exported to "${outputFile}"`);
