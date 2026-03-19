import { Gaman } from './index';
import type { HTTP, IPC } from './index.types';
import { GamanPacker } from './utils/gaman-packer';

const gaman = Gaman();

gaman.ipc('/tmp/gaman.sock', (ctx) => {
	console.log(ctx.json());
	// console.log(ctx.data());
	return ctx.send({
		name: 'dari yogey',
	});
});

gaman.ipc('/tmp/anu.sock', (ctx) => {
	
})

gaman.mountServer({
	http: {
		port: 3431,
	},
});

// client
Bun.connect({
	unix: '/tmp/gaman.sock',
	socket: {
		data(socket, data) {
			console.log(data.readUInt32BE(0));
		},

		open(socket) {
			const bigData = Array.from({ length: 1 }, (_, i) => ({
				id: i,
				note: 'Transaksi sawit ke-' + i,
				amount: Math.random() * 1000000,
			}));

			socket.write(JSON.stringify(bigData));
		},
	},
});
