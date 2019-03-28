const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub(process.env.PROJECT_ID);

module.exports = {
	name: 'test',
	description: 'various misc tasks for testing',
	usage: 'do not use',
	restricted: true,
	async execute(message, args) {
		const topicName = process.env.PUBSUB_TOPIC || 'reminders';
		const subscriptionName = 'remindersSubscription';
		
		if (args[0] === 'getsubs') {
			const [subscriptions] = await pubsub.topic(topicName).getSubscriptions();

			subscriptions.forEach(console.log);
		} else if (args[0] === 'reminder') {
			const data = {
				//TODO properly parse time inputs
				//40s, 50m, 60h
				channel: message.channel.id,
				expiration: Date.now() + parseInt(args[1])*1000,
				message: args.slice(2).join(' '),
				userId: ''.concat('<@', message.author.id, '>')
			}
			const dataBuffer = Buffer.from(JSON.stringify(data));

			pubsub
				.topic(topicName)
				.publish(dataBuffer)
				.then(messageId => {
					console.log(`Message ${messageId} published`);
					message.reply(`Ack! I'll remind you at ${new Date(data.expiration)}`);
				})
				.catch(err => console.error('error publishing message:', err));
		}

	}
}

let messageCount = 0;
function reminderHandler(message) {
	console.log(`Received message ${message.id}:`);
	console.log(`\tData: ${message.data}`);
	console.log(`\tAttributes: ${message.attributes}`);
	messageCount += 1;
	
	const data = message.data.split(' ');
	if (new Date() >= Date(data[0])) {
		//reminder expired
		console.log(Date(data[0]));
		console.log(`${data[1]}, time for ${data[2]}!`);
		return message.ack();
	}
}
