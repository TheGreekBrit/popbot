
module.exports = {
	name: 'help',
	aliases: ['man', 'wat'],
	description: 'Displays the man page for [command]',
	args: false,
	usage: `*[command]*`,
	execute(message, args) {
		const { commands } = message.client;

		let commandName,
			commandHelpDoc = [];

		if (!args.length) {
			commandName = this.name;
		} else {
			commandName = args[0].toLowerCase();
		}
		console.log('command:', commandName);

		const command = commands.get(commandName) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

		if (!command) {
			return message.reply(`No manual entry for ${commandName}`);
		}

		commandHelpDoc.push([`\n\t\t\t\tMan page for: **${command.name}**`]);

		if (command.aliases) commandHelpDoc.push(`\t\t\t\t\t\t**Aliases:** ${command.aliases.join(', ')}`);
		if (command.description) commandHelpDoc.push(`\t\t\t\t\t\t**Description:** ${command.description}`);
		if (command.usage) commandHelpDoc.push(`\t\t\t\t\t\t**Usage:** ${command.name} ${command.usage}`);

		return message.reply(commandHelpDoc, { split: true });
	}
};