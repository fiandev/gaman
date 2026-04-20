import { capitalize } from '../utils';

export const standaloneServiceTemplate = (name: string): string => {
	const nameCapitalized = capitalize(name);
	return `
import { composeService } from 'gaman/compose';
import type { RT } from 'gaman/types';

export const ${nameCapitalized}Service = composeService(() => {

	// TODO: Implement ${nameCapitalized}Service logic here

	return {};
});

export type ${nameCapitalized}Service = RT<typeof ${nameCapitalized}Service>;
`.trim();
};
