import {
	Command,
	registerCommand,
	type CommandHandler,
} from '../commands/registry';

export interface KameConsole {
	command(name: string, handler: CommandHandler): Command;
}

export function composeConsole(
	handler: (kame: KameConsole) => Promise<void> | void,
) {
	handler({
		command(name, handler) {
			const cmdClass = new Command(name, handler);
			registerCommand(cmdClass);
			return cmdClass;
		},
	});
}
