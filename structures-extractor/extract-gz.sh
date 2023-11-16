#!/bin/bash

# Extrai arquivo comprimido com os átomos
gzip -dfk "$1"
decompressed_file=${1%.*}

# Imprime o nome do arquivo extraido
echo "$decompressed_file"
