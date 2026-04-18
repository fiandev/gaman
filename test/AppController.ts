import { composeController } from '../src/compose';
import { Res } from '../src/responder';
import { AppService } from './AppServices';

export type AppController = {
	appService: AppService;
};

export default composeController(({ appService }: AppController) => {
	return {
		async ANu(ctx) {
      
			return Res.render('index', {
        message: appService.Welcome().message,
      });
		},
	};
});
