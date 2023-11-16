const chalk = require("chalk");

const timeFormat = ms => chalk.bold(chalk.red(`${ms} ms`));

module.exports = { timeFormat };
