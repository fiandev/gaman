export interface ParsedInput {
	args: string[];
	flags: Record<string, string | boolean>;
}

export function parseInput(argv: string[]): ParsedInput {
	const args: string[] = [];
	const flags: Record<string, string | boolean> = {};

	for (let i = 0; i < argv.length; i++) {
		const token = argv[i];
		if (token === undefined) continue;

		if (token.startsWith('--')) {
			const key = token.slice(2);
			const next = argv[i + 1];

			// --force (boolean) vs --name value
			if (!next || next.startsWith('--') || next.startsWith('-')) {
				flags[key] = true;
			} else {
				flags[key] = next;
				i++; // skip next token
			}
		} else if (token.startsWith('-') && token.length === 2) {
			const key = token.slice(1);
			const next = argv[i + 1];

			if (!next || next.startsWith('--') || next.startsWith('-')) {
				flags[key] = true;
			} else {
				flags[key] = next;
				i++;
			}
		} else {
			args.push(token);
		}
	}

	return { args, flags };
}
