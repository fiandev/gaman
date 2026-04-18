/**
 * ==========================================================================
 * Gaman Controller
 * ==========================================================================
 *
 * This controller handles the core logic for your application.
 * Controllers in GamanJS keep your code clean, modular, and
 * easy to maintain — just like a well-structured MVC pattern.
 *
 * Example:
 *    HelloWorld(ctx) {
 *        return Res.json({ message: '❤️ Welcome to GamanJS' });
 *    }
 *
 * For more details, visit:
 * 		https://gaman.7togk.id/docs/overview/controllers/
 *
 * ==========================================================================
 */

import { composeController } from '../../../../../src/compose';
import { Res } from '../../../../../src/responder';
import { AppService } from '../services/AppService';

export type Deps = {
	appService: AppService;
}

export default composeController(
	({ appService }: Deps) => ({
		HelloWorld(ctx) {
			return Res.json({
				message: appService.WelcomeMessage()
			});
		},
		GetUser(ctx) {
			const id = ctx.param('id');
			const user = appService.GetUser(id);
			return Res.json(user);
		},
		CreateItem(ctx) {
			return ctx.json().then((body: any) => {
				const item = appService.CreateItem(body);
				return Res.created(item);
			});
		},
	}),
);
