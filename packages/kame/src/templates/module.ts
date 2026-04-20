import { capitalize, toCamelCase } from '../utils';

export const serviceTemplate = (name: string) => {
	const nameCapitalized = capitalize(name);
	return `
import { composeService } from 'gaman/compose';
import type { RT } from 'gaman/types';

export const ${nameCapitalized}Service = composeService(() => {
	
	// TODO: Implement your service logic here

	return {
		WelcomeMessage() {
			return 'Welcome to ${nameCapitalized} Service!';
		},
	};
});

export type ${nameCapitalized}Service = RT<typeof ${nameCapitalized}Service>;
`.trim();
};

export const controllerTemplate = (name: string) => {
	const nameCapitalized = capitalize(name);
	return `
import { composeController } from 'gaman/compose';
import { Res } from 'gaman/responder';
import { ${nameCapitalized}Service } from '../services/${nameCapitalized}Service';

export type Deps = {
	${toCamelCase(name)}Service: ${nameCapitalized}Service;
}
	
export default composeController(({ ${toCamelCase(name)}Service }: Deps) => {
	
	// TODO: Implement your controller logic here

	return {
		index(ctx) {
			return Res.json({
				message: ${toCamelCase(name)}Service.WelcomeMessage(),
			});
		},
	};
});
`.trim();
};

export const routerTemplate = (name: string) => {
	const nameCapitalized = capitalize(name);
	const camelCaseName = toCamelCase(name);

	return `
import { composeRouter } from 'gaman/compose';
import ${nameCapitalized}Controller from './controllers/${nameCapitalized}Controller';
import { ${nameCapitalized}Service } from './services/${nameCapitalized}Service';

export default composeRouter((r) => {
	r.mountService({
		${camelCaseName}Service: ${nameCapitalized}Service(),
	});
  
  r.get('/', [${nameCapitalized}Controller, 'index']);
});
`.trim();
};

export const routerBlankTemplate = () => {
	return `
import { composeRouter } from 'gaman/compose';

export default composeRouter((r) => {
	r.mountService({
		
	});
	
	// TODO: Implement your routers
});
`.trim();
};

export const middlewareTemplate = () => {
	return `
import { composeMiddleware } from 'gaman/compose';

export default composeMiddleware(async (ctx, next) => {

	// TODO: Implement your middleware logic here

	return next();
});
`.trim();
};

export const exceptionTemplate = () => {
	return `
import { composeException } from 'gaman/compose';
import { Res } from 'gaman/responder';

export default composeException((err, ctx) => {
	
	// TODO: Implement your exception handler logic here

	return Res.internalServerError();
});
	`.trim();
};
