const DEBUG = 1; if (DEBUG) console.log('DEBUG ENABLED');

const Config = require('./conf/bot.json');

const Discord = require('discord.js');			// discord client lib

/* library imports */
const fs = require('fs');
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
client.commands = new Discord.Collection();

//read command js files from ./commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

//import commands into client.commands as {command.name: command}
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

//start up automatically if not running on GAE
if (Config.env === 'dev') {
	client.login(Config.token);
	client = setupClientEvents(client);
	//import commands into client.commands as {command.name: command}
	for (const file of commandFiles) {
		const command = require(`./commands/${file}`);
		client.commands.set(command.name, command);
	}
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
	let args;

	client.on('ready', () => {
		console.log('Logged in as %s!', client.user.tag);
	
		client.commands = new Discord.Collection();	
		
		//import commands into client.commands as {command.name: command}
		for (const file of commandFiles) {
			console.log('loading command:', file);
			const command = require(`./commands/${file}`);
			client.commands.set(command.name, command);
		}
	});

	/* Handler for incoming messages */
	client.on('message', messageHandler);

	client.on('error', console.error);

	return client;
}

function messageHandler(message) {
	let command, commandName, commandArgs, evaluated, parsed, version,
		author = message.author,
		input = message.content.split(' '),         // space-delimited array of message text
		summonPrefix = input.shift().toLowerCase(); //content[0] - summon prefix (e.g. !pop)

	console.log('summoned?', (summonPrefix.toLowerCase() === SUMMON_COMMAND) && !author.bot);

	// only run when summoned by a user
	if ((summonPrefix.toLowerCase() !== SUMMON_COMMAND) || author.bot)
		return;

	if (!input) return;     //return if no command given

	commandName = input.shift().toLowerCase();  //content[1] - command (e.g. ping)
	commandArgs = input;                        //content[2:] - args after command

	console.log('summoned?', (summonPrefix.toLowerCase() === SUMMON_COMMAND) && !author.bot);

	// only run when summoned by a user
	if ((summonPrefix.toLowerCase() !== SUMMON_COMMAND) || author.bot)
		return;

	if (DEBUG === 2) {
		console.log('original message:', author.username, message.content);
		console.log('original summon:', summonPrefix);
		console.log('original command:', commandName);
		console.log('original args:', commandArgs);
	}

	//load command data
	command = client.commands.get(commandName)
			//check for aliases
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	if (command.args && !commandArgs.length)
		return message.reply(`not enough arguments. Try ${SUMMON_COMMAND} help ${command.name}`)

	// execute command
	// example with run command:
	// !arg run 2+2
	try {
		command.execute(message, commandArgs);
	} catch (e) {
		console.error(e);
		return message.reply('error executing command!');
	}
	
	//maybe save some metadata here
}


