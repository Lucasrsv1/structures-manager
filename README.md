# Gerenciador de Estruturas

## Montagem do Banco de Dados de Gerenciamento

1. Realize o download do arquivo contendo os nomes de todas as estruturas através do link abaixo:

	[https://files.wwpdb.org/pub/pdb/holdings/current_file_holdings.json.gz](https://files.wwpdb.org/pub/pdb/holdings/current_file_holdings.json.gz)

2. Extraia o arquivo JSON para `structures-extractor\current_file_holdings.json`

3. Em seguida execute os seguintes comandos:

	```sh
	npm run extract-structures
	npm run mongo
	npm run get-structure-sizes
	```
