import { composeRouter } from '../src/compose';
import { defineBootstrap } from '../src/index';
const routes = composeRouter((app) => {
	app.get('/test', (ctx) => {
		return Res.error({
			email: 'aduh',
		});
	});

	app.post('/file', async (ctx) => {
		const file = await ctx.file('test');
		return Res.send(file?.filename);
	});

	app.get('/param/:message', (ctx) => {
		return Res.send(ctx.param('message'));
	});
});

defineBootstrap((app) => {
	app.mountRouter(routes);

	app.mountServer({
		http: {
			port: 3431,
		},
	});
});

// client
// Bun.connect({
// 	unix: '/tmp/gaman.sock',
// 	socket: {
// 		data(socket, data) {
// 			console.log(data.readUInt32BE(0));
// 		},

// 		open(socket) {
// 			const bigData = Array.from({ length: 1 }, (_, i) => ({
// 				id: i,
// 				note: 'Transaksi sawit ke-' + i,
// 				amount: Math.random() * 1000000,
// 			}));

// 			socket.write(JSON.stringify(bigData));
// 		},
// 	},
// });
