import { Logger } from 'gaman/utils';
import { composeConsole } from '../packages/kame/src/compose';

export default composeConsole((kame) => {
	kame.command('anu', async (args, flags) => {
		Logger.info('anjay', flags['f']);
	}).usage('anu <name>');
});
