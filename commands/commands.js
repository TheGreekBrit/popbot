
module.exports = {
	name: 'commands',
	description: 'Returns a list of available commands',
	args: false,
	usage: '',
	execute(message, args) {
		const { commands } = message.client;
		let list = commands.map(cmd => cmd.name);
		console.log('commands:', list);

		return message.reply(`**Available commands**: ${list.join(', ')}`);
	}
};