import { defineBootstrap } from '../src/index';
import { composeRouter } from '../src/compose';

const routes = composeRouter((app) => {
    app.get('/json', (ctx) => {
        return { message: 'Hello World' }
    });

    app.post('/form', async (ctx) => {
        const field1 = await ctx.input('field1'); 
        return { field1 };
    });

    app.post('/file', async (ctx) => {
        const file = await ctx.file('file');
        const buffer = await file?.arrayBuffer();
        return { filename: file?.filename || 'unknown', size: file?.size || 0, bufferSize: buffer?.byteLength };
    });
});

import { Log } from '../src/utils/logger';
Log.level = 'warn'; // completely disable verbose logging

defineBootstrap((app) => {
    app.mount(routes);
    app.mountServer({
        http: { port: 3001 }
    });
    console.log("GamanJS started on port 3001");
});
