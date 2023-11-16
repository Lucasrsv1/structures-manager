function getStructures (holdings) {
	console.log("Reading structures list...");

	// Para cada estrutura pega a primeira URL e obtém apenas o nome do arquivo
	// * Preferencialmente usa o arquivo PDB, pois é mais leve e rápido de processar,
	// * mas como nem todas as estruturas possuem arquivo PDB, usa o CIF em último caso.
	const holdingsFiles = Object.keys(holdings).map(k => {
		let url = holdings[k].mmcif[0];
		if (holdings[k].pdb)
			url = url.replace(".cif", ".pdb");

		return url.split("/").pop();
	});

	console.log(`${holdingsFiles.length} structure filenames found`);
	return holdingsFiles;
}

module.exports = { getStructures };
