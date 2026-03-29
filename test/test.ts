import { composeRouter } from '../src/compose';
import { defineBootstrap } from '../src/index';
import { Cors } from '../packages/cors/src';
import { StaticServe } from '../packages/static/src';
import AppController from './AppController';
import { AppService } from './AppServices';

const childRouter = composeRouter((r) => {
	r.mountMiddleware((ctx, next) => {
		console.log('ahahhha');
		return next();
	});
	r.get('/', () => 'asdsad');
	r.group('/child', (r) => {
		r.get('/', [AppController, 'ANu']);
	});
});

const routes = composeRouter((r) => {
	r.mountService({
		appService: AppService(),
	});
	r.mountRouter('/v1', childRouter);

	r.get('/', [AppController, 'ANu']);
});

defineBootstrap((app) => {
	// app.mount(Cors({
	// 	allowHeaders: ['content-type']
	// }));
	app.mount(
		StaticServe({
			publicPath: 'test/public',
		}),
	);
	app.mount(Cors());
	app.mount(routes);
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
