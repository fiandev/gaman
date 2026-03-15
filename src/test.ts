import gaman from './index';

gaman.ipc('/lobby', (ctx) => {
	console.log(ctx.json());
	ctx.send({
		name: 'dari yogey',
	});
});

gaman.listenIPC('/tmp/gaman.sock');

// client
Bun.connect({
	unix: '/tmp/gaman.sock',
	socket: {
		data(socket, data) {
			console.log(data.toString());
		},
		
		open(socket) {
			const bigData = Array.from({ length: 1000 }, (_, i) => ({
				id: i,
				note: 'Transaksi sawit ke-' + i,
				amount: Math.random() * 1000000,
			}));

			socket.write(
				JSON.stringify({
					path: '/lobby',
					data: bigData,
				}) + "\n",
			);
		},
	},
});
