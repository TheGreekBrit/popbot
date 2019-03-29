const { env, summon } = require('../conf/bot.json');

const child_process = require('child_process');		// used to exec shell commands
const Promise = require('promise'); 			    // promises

module.exports = {
	name: 'run',
	aliases: ['eval', 'exec'],
	description: 'Evaluates arbitary code snippets',
	args: true,
	usage: '*[language]* [snippet]',
	languages: {js: runJsSnippet, py: runPy3Snippet, py3: runPy3Snippet},
	execute(message, args) {
		let snippet, version,
			language = 'js',    //default language
			execSnippet = ()=>{ throw 'UNHANDLED LANGUAGE EXCEPTION'};      //this should never be thrown

		if (args[0] in this.languages) {
			//add handler for supported language
			execSnippet = this.languages[args[0]];
			language = args.shift();
		} else {
			//parse as javascript if language isn't specified
			execSnippet = this.languages[language];
		}

		snippet = args.join(' ');

		if (!args.length) {
			message.reply(`**ERROR:** snippet missing. Try ${summon} help run`);
			return;
		}
		
		console.log('code to run:', snippet);

		execSnippet(snippet, version)
			.then(response => {
				console.log(`${language} response:\n${response}`);
				return message.reply(`${language} response:\n${response}`);
			})
			.catch(error => {
				console.error(`${language} error: ${error}\nsnippet: ${snippet}`);
				return message.reply(`**ERROR:** ${error}`);
			});
	}
};

/**
 * Evaluates an arbitrary snippet of Javascript code
 * @param {string} snippet A string of JS code.
 * @returns {*|Promise} Promise object representing the output of the evaluation.
 */
function runJsSnippet(snippet, version=10) {
	return new Promise((fulfill, reject) => {
		let result;

		try {
			result = eval(snippet);  // dangerous!!
			console.log('evalutated response:', result);
		} catch (e) {
			reject(`**${e.name}:** ${e.message}`);
		}

		fulfill(result || "empty response");
	});
}

/**
 * Evaluates an arbitrary snippet of Python3 code
 * @param {string} snippet A string of python code.
 * @param {number} version The python version to use (2 or 3).
 * @returns {*|Promise} Promise object representing the output of the evaluation.
 */
function runPy3Snippet(snippet, version=3) {
	return new Promise((fulfill, reject) => {
		let shellCommand,
			pyFlag = '-c',
			pyBinary = version === 2 ? 'python2' : env === 'dev'? 'python' : 'python3';

		// merge components of shell call
		// ex: python3 -c print(2 + 3)
		shellCommand = [pyBinary, pyFlag, '"' + snippet + '"'].join(' ');
		console.log('full shell cmd:', shellCommand);

		// if (DEBUG) {
			//TODO remove this
			//runs bash commands
			// cmd =
			// 	`echo $PATH && which ${pyBinary} && ${pyBinary} -V;`;
			// executeShell(cmd).then(res => {
			// 	console.log(res);
			// }).catch(err => {
			// 	console.error(err);
			// });
		// }

		executeShell(shellCommand).then(fulfill).catch(reject);

	});
}

function executeShell(cmd) {
	return new Promise((fulfill, reject) => {
		child_process.exec(cmd, (err, response) => {
			if (err)
				reject(err);
			if (!response)
				fulfill('empty response');
			else
				fulfill(response);
		});
	});
}
