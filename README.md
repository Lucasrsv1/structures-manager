# Gerenciador de Estruturas

## Instalação de Dependências

1. Instale o sistema de banco de dados não relacional MongoDB em sua máquina.

	- [https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)

2. Garanta que a versão `18` do Node.js estará instalada e em uso no seu computador para executar este software.

3. Execute o comando `npm i` dentro da pasta raiz do projeto e dentro da pasta `front-end`.

	**Observação:** esta aplicação foi testada no **Ubuntu 22.04.1 LTS** usando as seguintes versões dos softwares necessários:

	- **Node.js v18.17.1**

	- **npm 9.6.7**

	- **npx 9.6.7**

	- **MongoDB v5.0**.

## Montagem do Banco de Dados de Gerenciamento

1. Opcionalmente, você pode restaurar um backup do banco de dados com a maioria das estruturas já registradas com os seus devidos tamanhos de arquivos para adiantar o processamento. Se quiser fazer isso, baixe e extraia o backup do link abaixo e em seguida execute o comando a seguir para restaurar o backup.

	- [structures-manager-bytes-count-finished-bkp.zip](https://drive.google.com/file/d/1v9tbg1lCpjGx1quSGy-MJK9wEk27cRj-/view?usp=sharing)

	```sh
	mongorestore -d <collection-name> .\mongodump\structures-manager-bytes-count-finished-bkp\
	```

	**Observação:** no comando acima, `<collection-name>` deve ser substituído pelo nome da collection do MongoDB que você irá utilizada. O nome padrão é `structures-manager`. Além disso, a pasta `mongodump` é a pasta que foi extraída do arquivo comprimido baixado.

2. Configure a chave `MONGO_HOST` no arquivo de variáveis de ambiente (`.env`) para definir a URL de conexão com o MongoDB que será utilizada. Alguns exemplos de configurações possíveis são:

	```sh
	MONGO_HOST = 'HOST:PORT'
	```
	ou
	```sh
	MONGO_HOST = 'USERNAME:PASSWORD@HOST:PORT'
	```

	**Observação:** o valor padrão é `'127.0.0.1:27017'`.

3. Configure a chave `MONGO_COLLECTION` no arquivo de variáveis de ambiente (`.env`) para definir o nome que desejar para a collection do MongoDB que será utilizada. Você pode pular este passo se você quiser usar o valor padrão `'structures-manager'`.

4. Em seguida execute um dos seguintes comandos para iniciar o processo de extração e atualização da lista de estruturas a serem processadas no MongoDB:

	```sh
	node structures-extractor/index.js
	```
	ou
	```sh
	npm run structures-extractor
	```

## Execução do Servidor (Front-end e API)

### Compilação do Front-end

Dentro da pasta `front-end` execute o seguinte comando:

```sh
npm run publish
```

Após a execução do comando o front-end estará pronto para uso em produção estando localizado dentro da pasta `public`.

### Iniciar Servidor

Na raiz do projeto execute um dos seguintes comandos para iniciar o servidor com a API e o front-end:

```sh
node index.js
```
ou
```sh
npm start
```

**Observação:** o comando `npm start` utiliza o `nodemon` e deve ser usado apenas em desenvolvimento.

## Deploy em Produção

Em ambiente de produção deve-se utilizar o [**pm2**](https://pm2.keymetrics.io/). Para isso, execute os seguintes passos:

1. Configure a chave `NODE_ENV` no arquivo de variáveis de ambiente (`.env`) para definir o ambiente como sendo de produção de acordo com o valor abaixo:

	```sh
	NODE_ENV = production
	```

2. Caso ainda não tenha instalado o [**pm2-logrotate**](https://github.com/keymetrics/pm2-logrotate), instale-o usando o seguinte comando:

	```sh
	pm2 install pm2-logrotate
	```

	O objetivo deste plugin do pm2 é limitar o uso de disco para armazenar os logs da aplicação, limitando o espaço de armazenamento usado e rotacionando os logs da aplicação quando o limite de uso do disco é alcançado.

3. Instale o serviço de extração e atualização da lista de estruturas a serem processadas no MongoDB usando o seguinte comando:

	```sh
	pm2 start --name "Structures Extractor" structures-extractor/index.js
	```

4. Instale o serviço da API e do front-end do servidor usando o seguinte comando:

	```sh
	pm2 start --name "Structures Manager" index.js
	```

5. Verifique a lista de serviços do pm2 usando o comando `pm2 ls` e confirme que tudo está funcionando. Logs podem ser acessados usando o comando `pm2 log` ou acessando os arquivos de log diretamente na pasta `/home/ubuntu/.pm2/logs`.

6. Por fim, salve a lista de serviços em execução através do comando `pm2 save` e configure o pm2 para executar estes serviços quando o computador for inicializado por meio do comando `pm2 startup`. Este último comando provavelmente irá gerar e imprimir um comando para você **copiar**, **colar** e **executar** em seu terminal para de fato configurar a execução dos serviços quando o computador for ligado.

### Próximos Passos

Você provavelmente vai querer configurar um servidor web [**Nginx**](https://www.nginx.com/) para servir o front-end da aplicação e fazendo um proxy reverso para a API, permitindo assim a configuração de um domínio e instalação de certificado SSL. Mais informações sobre isso podem ser encontradas nos seguintes links:

- [How To Install Nginx on Ubuntu 22.04](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-22-04)

- [How To Secure Nginx with Let's Encrypt on Ubuntu 22.04](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-22-04)

- [How to Serve Static Files from Different Folder in NGINX](https://fedingo.com/how-to-serve-static-files-from-different-folder-in-nginx/)

- [How to Enable CORS in NGINX](https://ubiq.co/tech-blog/enable-cors-nginx/)

#### **FAQ**

- [How to configure nginx to serve static files and index.html for everything else for single page app](https://stackoverflow.com/questions/38025753/how-to-configure-nginx-to-serve-static-files-and-index-html-for-everything-else)

- [Nginx: stat() failed (13: permission denied)](https://stackoverflow.com/questions/25774999/nginx-stat-failed-13-permission-denied)
