const { Translate } = require('@google-cloud/translate');
const translate = new Translate({projectId: process.env.PROJECT_ID});

module.exports = {
	name: 'translate',
	aliases: ['howtosay', 'tr'],
	description: 'Translates [text] into the language specified by [*target]*. Use `translate list` for a list of languages and codes.',
	usage: '*[target]* [text]',
	async execute(message, args) {
		if (!args.length) return message.reply(`**ERROR:** no text to translate`);
		console.log('fetching languages...');
		const [languages] = await translate.getLanguages();
		
		let target = args[0].toLowerCase();
		const langExists = languages.filter(lang => lang.code === target || lang.name.toLowerCase() === target);
		
		if (!langExists.length) {
			if (target === 'list') {
				let languagesList = languages;
				args.shift();

				if (args.length) {
					console.log(target,args)
					target = args[0];
					languagesList = await translate.getLanguages(target);
					//TODO deal with this
				}
				else {
					//no target given
				}
			
				//console.log('language list:', languagesList);
				const parsedLanguagesList = languagesList.map(lang => `${lang.name} (${lang.code})`);

				return message.reply(`Languages: ${parsedLanguagesList.join(', ')}`);
			} else {
				target = 'en';	//translate to english by default
				console.log('no language given:', args);
			}
		} else {
			//pop off target element
			target = languages.filter(lang => lang.code === target || lang.name.toLowerCase() === target)[0].code;
			args.shift();
		}
		
		console.log('translating...', target, args);
		let [translations] = await translate.translate(args.join(' '), target);

		//convert to array
		translations = Array.isArray(translations)? translations: [translations];

		//console.log('Translations:', translations);

		translations.forEach((translation, i) => {
		//	console.log(`${args[i]} => (${target}) ${translation}`);
			return message.reply(`text: (${target}) ${translation}`);
		});
	}
};
