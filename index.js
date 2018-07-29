/* eslint-disable padded-blocks */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

const StreamDeck = require('elgato-stream-deck');
const text2png = require('text2png');
const path = require('path');
const http = require('http');
const url = require('url');
const fs = require('fs');

const gotoPage = 'home';

class DeckSwitcher {

	constructor(page) {
		this.log('** STARTING SS DECK SWITCHER **');
		this.page = page;
		this.deckSettings = null;
		this.pages = null;
		this.callTypes = null;
		this.streamDeck = new StreamDeck();
		this.imageSettings = {
			font: '18px Futura',
			textColor: 'white',
			bgColor: 'black',
			lineSpacing: 10,
			padding: 25
		};
		this.loadDeckSettings();
		this.generateButtons();
		this.startPageSwitcher();
		this.startButtonListener();
		this.switchPage();
	}

	loadDeckSettings() {
		this.log('load settings');
		const contents = fs.readFileSync('config.json');

		this.deckSettings = JSON.parse(contents);
		this.pages = this.deckSettings.pages;
		this.callTypes = this.deckSettings.call_types;
	}

	generateButtons() {

		for (const page in this.pages) {
			if (this.pages.hasOwnProperty(page)) {
				const generatePage = page;
				const buttons = this.pages[page];

				for (let i = 0; i < buttons.length; i++) {

					const keySettings = buttons[i];

					if (keySettings) {
						if (keySettings.type === 'button') {
							if (keySettings.text) {
								const fileName = './button_images/' + generatePage + '_' + i + '.png';
								console.log(new Date().toISOString() + ' - generate image ' + fileName);
								fs.writeFileSync(fileName, text2png(keySettings.text, this.imageSettings));
							}
						}
					}
				}
			}
		}
	}

	startPageSwitcher() {
		this.log('start page switch server');
		http.createServer((req, res) => {
			const q = url.parse(req.url, true).query;
			this.page = q.page;
			this.switchPage();
			res.end();
		}).listen(8080);
	}

	switchPage() {
		this.log('switch to page ' + this.page);
		const buttons = this.pages[this.page];

		// Clear the deck before filling
		this.streamDeck.clearAllKeys();

		for (let i = 0; i < buttons.length; i++) {
			const keySettings = buttons[i];

			if (keySettings) {
				if (keySettings.type === 'button') {
					if (keySettings.text) {
						const fileName = './button_images/' + this.page + '_' + i + '.png';
						this.streamDeck.fillImageFromFile(i, path.resolve(__dirname, fileName)).then(() => {
						});
					} else if (keySettings.color) {
						this.streamDeck.fillColor(i, keySettings.color.r, keySettings.color.g, keySettings.color.b);
					} else if (keySettings.image) {
						this.streamDeck.fillImageFromFile(i, path.resolve(__dirname, keySettings.image)).then(() => {
						});
					}
				} else {
					this.streamDeck.clearKey(i);
				}
			}
		}
	}

	startButtonListener() {
		this.log('started button listener');

		this.streamDeck.on('up', keyIndex => {
			if (this.pages[this.page][keyIndex]) {
				const callType = this.pages[this.page][keyIndex].call_type;
				const attribute = this.pages[this.page][keyIndex].attribute;

				if (this.callTypes[callType]) {
					const url = this.callTypes[callType].url;
					const query = url + attribute;
					http.get(query);
					this.log('called ' + query);
				}
			}
		});
	}

	log(message) {
		console.log(new Date().toISOString() + ' - ' + message);
	}
}

new DeckSwitcher('iterm');

