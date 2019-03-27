
module.exports = {
	name: 'ping',
	description: 'Sends a pong reply.',
	args: false,
	usage: '',
	helpDoc: 'placeholder',
	execute(message, args) {
		return message.reply('the ping pongs at midnight');
	}
};