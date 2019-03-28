let pm2 = require('pm2');

let instances = process.env.WEB_CONCURRENCY || -1; // Set by Heroku or -1 to scale to max cpu core -1

pm2.connect(() => {
	pm2.start({
		script: 'app.js',
		env: {                            // If needed declare some environment variables
			PUBSUB_TOPIC: 'reminders',
			PORT: 8080,
		},
	}, err => {
		if (err) return console.error('Error while launching applications', err.stack || err);
		console.log('PM2 and application has been succesfully started');

		// Display logs in standard output
		pm2.launchBus((err, bus) => {
			console.log('[PM2] Log streaming started');

			bus.on('log:out', packet => {
				console.log('[App:%s] %s', packet.process.name, packet.data);
			});

			bus.on('log:err', packet => {
				console.error('[App:%s][Err] %s', packet.process.name, packet.data);
			});
		});

	});
});
