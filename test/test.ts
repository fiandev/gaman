import { composeException, composeMiddleware, composeRouter } from '../src/compose';
import { defineBootstrap } from '../src/index';
import { Cors } from "../packages/cors/src";
const routes = composeRouter((app) => {
	app.get('/', (ctx) => {
		return "<h1>anu</h1>"
	})
});

defineBootstrap((app) => {
	// app.mount(Cors({
	// 	allowHeaders: ['content-type']
	// }));
	app.mount(routes);
	app.mount(
		composeException((err, ctx) => {
			console.log('HWEHEHEHEE', err);
		}),
	);
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
