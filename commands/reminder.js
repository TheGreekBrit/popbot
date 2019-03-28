const parse = require('parse-duration');        // parses time durations
const Promise = require('promise');
const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub(process.env.PROJECT_ID);

module.exports = {
	name: 'reminder',
	aliases: ['timer', 'remindme', 'remind'],
	description: 'Sets a timer of [time] duration with *[message]*.\n\t\t[time] format: 30s, 20m, 10h',
	usage: '[time] *[message]*',
	execute(message, args) {
		//parse time
		const parsedTime = parse(args[0]);
		if (isNaN(parsedTime)) return message.reply(`**ERROR:** invalid time: ${args[0]}`);

		const reminderData = {
			//TODO properly parse time inputs
			//40s, 50m, 60h
			channel: message.channel.id,
			expiration: Date.now() + parsedTime,
			message: args.slice(1).join(' '),
			userId: ''.concat('<@', message.author.id, '>')
		};

		const dataBuffer = Buffer.from(JSON.stringify(reminderData));

		pubsub
			.topic(process.env.PUBSUB_TOPIC)
			.publish(dataBuffer)
			.then(messageId => {
				console.log(`Message ${messageId} published`);
				message.reply('ack!');
			})
			.catch(err => console.error('error publishing message:', err));
	}
};
