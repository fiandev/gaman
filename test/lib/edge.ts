import { composeMiddleware } from '../../src/compose';
import { Edge as EdgeJS } from 'edge.js';
import { join } from 'node:path';
import * as utils from '../../src/utils';
import { Res } from '../../src/responder';

export const Edge = async () => {
	const edge = EdgeJS.create();
	edge.mount(join(process.cwd(), 'test/views'));

	return composeMiddleware(async (ctx, next) => {
		const view = await next(); // run all next handlers
		if (!utils.isResponseView(view)) {
			return view;
		}
		const renderer = await edge.render(view.template, view.data);
		return Res.html(renderer, view.options);
	});
};
