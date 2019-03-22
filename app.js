const child_process = require('child_process');

const Promise = require('promise');

const Discord = require('discord.js');
const client = new Discord.Client();

const Config = require('./conf/bot.json');

const SUMMON_COMMAND = Config.summon;
const SUMMON_REGEX = new RegExp(`^${SUMMON_COMMAND}\\W`, 'gi');
console.log('SUMMON:', SUMMON_COMMAND, SUMMON_REGEX);
// noinspection BadExpressionStatementJS
client.on('ready', () => {
	console.log('Logged in as %s!', client.user.tag);
});

// noinspection BadExpressionStatementJS
client.on('message', msg => {
	let input, parsed, evaluated, version, args, author;
	console.log('original input:', msg.author.username, msg.content);
	console.log('summoned?', msg.content.startsWith(SUMMON_COMMAND) || msg.author.bot);
	// split command into an array of [summon, cmd, arg1, arg2, ...]
	
	 
	input = msg.content.split(' ');
	console.log('split msg:', input);
	if (!(input[0].toLowerCase() === SUMMON_COMMAND) || msg.author.bot) {
		// only run when summoned by a user
		return;
	}
	// get rid of the summon prefix
	input.shift(); // [cmd, arg1, arg2, ...]
	console.log('no summon:', input);

	// execute command
	// example with run command:
	// !arg run 2+2
	switch (input[0]) {
		case 'run':
			// get rid of 'run' element
			input.shift();   // [arg1, arg2, ...]

			if (!input) {
				msg.reply('**ERROR:** snippet missing. Try ' + SUMMON_COMMAND + ' help run');
			}
			console.log('no cmd:', input);

			switch (input[0]) {
				case 'py':
				case 'py3':
				case 'py2':

					// use python 2 if specified
					// default python 3
					if (input[0].endsWith('2'))
						version = 2;
					else
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
						`Man page: **run**
						Description: Evaluates arbitrary code snippets.
						Usage: ${SUMMON_COMMAND} run *[language]* [snippet]
						Supported languages: js, py
						Notes: js is assumed if *[language]* isn't specified`
					);
					break;
				case 'ping':
					msg.reply(
						`Man page: **ping**
						Description: pings ${Config.name} for a reply.
						Usage: ${SUMMON_COMMAND} ping`
					);
					break;
				default:
					msg.reply(
						`Man page: **help**
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

client.login(Config.token);

function runJsSnippet(snippet) {
	return new Promise((fulfill, reject) => {
		let result;
		// maybe parse msg.content first
		// for now just reading everything after `!pop run` as js code

		try {
			result = eval(snippet);  // dangerous!!
			console.log('evalutated response:', result);
		} catch (e) {
			//console.error(e);
			reject(`**${e.name}:** ${e.message}`);
		}

		fulfill(result || "empty response");

		reject('ERROR PARSING SOMETHING!!!')
	});
}

function runPySnippet(snippet, version) {
	return new Promise((fulfill, reject) => {
		let pyCommand,
			pyFlag = '-c',
			pyBinary = version === 2 ? 'python2' : 'python3';

		// merge components of shell call
		// ex: python3 -c print(2 + 3)
		pyCommand = [pyBinary, pyFlag, '"' + snippet + '"'].join(' ');
		console.log('full shell cmd:', pyCommand)

		child_process.exec(pyCommand, (err, response) => {
			if (err)
				reject(err);
			if (!response)
				fulfill('empty response');
			else
				fulfill(response);
		});
	});
}