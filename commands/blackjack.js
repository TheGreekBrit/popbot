
module.exports = {
	name: 'blackjack',
	aliases: ['bj', 'cards'],
	description: 'Starts a game of blackjack!.',
	args: true,
	usage: '@player1 @player2 @player3',
	helpDoc: 'placeholder',
	execute(message, args) {
		return message.reply('ERROR: no deck of cards found');
	}
};