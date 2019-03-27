const DEBUG = 1; if (DEBUG) console.log('DEBUG ENABLED');

const Config = require('./conf/bot.json');

const child_process = require('child_process');		// used to exec shell commands
const Discord = require('discord.js');			// discord client lib
const express = require('express');			// http server
const http = require('http');				// used for external http requests
const Promise = require('promise'); 			// promises

const app = new express();

const SUMMON_COMMAND = Config.summon;
const SUMMON_REGEX = new RegExp(`^${SUMMON_COMMAND}\\W`, 'gi');

//how often to check the connection to discord, in minutes.
//NOTE: this is not a heartbeat.
//at present it only logs the timestamp corresponding to the last successful login to discord
const UPTIME_REFRESH_RATE = 10;

//init connection to discord (no auth)
let client = new Discord.Client();

//start up automatically if not running on GAE
if (Config.env === 'dev') {
	client.login(Config.token);
	client = setupClientEvents(client);
	console.log('logged in (dev)');
} else if (Config.env === 'prod') {
	require('@google-cloud/debug-agent').start();
	console.log('stackdriver debug enabled');
}

//init discord during gae warmup
//TODO remove if this never runs
app.get('/_ah/warmup', (req, res) => {
	console.log('WARMING UP: logging into discord');
	client = new Discord.Client();
	client.login(Config.token);
	res.send('logged in');
});

//startup code
//logs in to discord
app.get('/_ah/start', (req, res) => {
	console.log('STARTING INSTANCE');
	client = new Discord.Client();
	client.login(Config.token);
	client = setupClientEvents(client);
	res.send('started up successfully');
});

//shutdown code
//disconnects from discord
app.get('/_ah/stop', (req, res) => {
	console.log('STOPPING INSTANCE');
	client.destroy();
	res.send('shut down successfully');
});

//homepage handler
app.get('/', (req, res) => {
	res.send('all good');
});

//listen on port 8080
app.listen(process.env.PORT);

setInterval(() => console.log('uptime check! logged into discord at:', client.readyAt), UPTIME_REFRESH_RATE*60*1000);

console.log('SUMMON REGEX:', SUMMON_COMMAND, SUMMON_REGEX);

function setupClientEvents(client) {
	client.on('ready', () => {
		console.log('Logged in as %s!', client.user.tag);
	});

	/* Handler for incoming messages */
	client.on('message', msg => {
		let parsed, evaluated, version, args, author,
			input = msg.content.split(' ');     // space-delimited array of message text

		console.log('summoned?', (input[0].toLowerCase() === SUMMON_COMMAND) && !msg.author.bot);

		// only run when summoned by a user
		if ((input[0].toLowerCase() !== SUMMON_COMMAND) || msg.author.bot)
			return;

		console.log('original input:', msg.author.username, input);

		// get rid of the summon prefix
		input.shift();  // [cmd, arg1, arg2, ...]
		console.log('no summon:', input);

		// execute command
		// example with run command:
		// !arg run 2+2
		switch (input[0]) {
			case 'commands':
				//TODO don't hardcode these
				msg.reply(`**Available commands:** run, ping, help, commands`);
				break;
			case 'run':
				// get rid of 'run' element
				input.shift();   // [arg1, arg2, ...]
	
				if (!input) {
					msg.reply('**ERROR:** snippet missing. Try ' + SUMMON_COMMAND + ' help run');
					return;
				}
				console.log('no cmd:', input);
	
				switch (input[0]) {
					//TODO add this back if we switch to GAE Flex
					//case 'py2':
						// // use python 2 if specified
						// // default python 3
						// if (input[0].endsWith('2'))
						// 	version = 2;
						// else
						// 	version = 3;
	
					case 'py':
					case 'py3':
						version = 3;
	
						input.shift();  // get rid of 'py' element
						parsed = input.join(' ');
	
						console.log('code to run:', parsed);
						runPySnippet(parsed, version)
							.then(response => {
								console.log('python response:', response);
								msg.reply('py response: ' + response);
							})
							.catch(err => {
								console.error('python error:', err, parsed);
								msg.reply('**ERROR:** ' + err);
							});
						break;
					case 'js':
						input.shift();  // get rid of 'js' element
					default:
						// js handler
						parsed = input.join(' ');
						console.log('code to run:', parsed);
						runJsSnippet(parsed)
							.then(response => {
								console.log('js response:', response);
								msg.reply('js response: ' + response);
							})
							.catch(err => {
								console.error('ERROR WITH runSnippet():', err);
								msg.reply('**ERROR:** ' + err);
							});
						break;
				}
				break;

			case 'help':
			case 'man':
			case 'wtf':
				input.shift();   // get rid of 'help' element
	
				switch (input[0]) {
					case 'run':
					case 'eval':
					case 'exec':
						msg.reply(
							`
							Man page: **run**
							Description: Evaluates arbitrary code snippets.
							Usage: ${SUMMON_COMMAND} run *[language]* [snippet]
							Supported languages: js, py
							Notes:
								- js is assumed if *[language]* isn't specified
								- currently python2 isn't supported`
						);
						break;
					case 'ping':
						msg.reply(
							`
							Man page: **ping**
							Description: pings ${Config.name} for a reply.
							Usage: ${SUMMON_COMMAND} ping`
						);
						break;
					case 'commands':
						msg.reply(
							`
							Man page: **commands**
							Description: returns a list of available popbot commands
							Usage: ${SUMMON_COMMAND} commands`
						);
						break;
					default:
						// help catch-all
						// ex: !pop help
						msg.reply(
							`
							Man page: **help**
							Description: displays the man page for a command.
							Usage: ${SUMMON_COMMAND} help *[command]*`
						);
				}
				break;
			case 'ping':
				msg.reply('the ping pongs at midnight');
				break;
		}
	});

client.on('error', console.error);
	return client;
}
//client.login(Config.token);

/**
 * Evaluates an arbitrary snippet of Javascript code
 * @param {string} snippet A string of JS code.
 * @returns {*|Promise} Promise object representing the output of the evaluation.
 */
function runJsSnippet(snippet) {
	return new Promise((fulfill, reject) => {
		let result;
		// maybe parse msg.content first
		// for now just reading everything after `!pop run` as js code

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
 * Evaluates an arbitrary snippet of Python code
 * @param {string} snippet A string of python code.
 * @param {number} version The python version to use (2 or 3).
 * @returns {*|Promise} Promise object representing the output of the evaluation.
 */
function runPySnippet(snippet, version) {
	return new Promise((fulfill, reject) => {
		let shellCommand,
			pyFlag = '-c',
			pyBinary = version === 2 ? 'python2' : 'python3';

		// merge components of shell call
		// ex: python3 -c print(2 + 3)
		shellCommand = [pyBinary, pyFlag, '"' + snippet + '"'].join(' ');
		console.log('full shell cmd:', shellCommand);

		if (DEBUG) {
			//TODO remove this
			//runs bash commands
			// cmd =
			// 	`echo $PATH && which ${pyBinary} && ${pyBinary} -V;`;
			// executeShell(cmd).then(res => {
			// 	console.log(res);
			// }).catch(err => {
			// 	console.error(err);
			// });
		}

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
