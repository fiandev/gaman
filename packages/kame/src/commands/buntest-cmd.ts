import { $ } from 'bun';
import { Logger } from 'gaman/utils';
import { registerCommand } from './registry';

const handler = async (args: string[]): Promise<void> => {
  Logger.info("Starting Bun test suite...");

  try {
    const result = await $`bun test ${args}`.quiet().text();
    
    result.split('\n').forEach((line) => {
      if (line.trim()) {
        Logger.info(line);
      }
    });

    Logger.info("All tests passed successfully.");
  } catch (err: any) {
    const errorOutput = err.stderr?.toString() || err.stdout?.toString() || "";
    
    errorOutput.split('\n').forEach((line: string) => {
      if (line.trim()) {
        Logger.error(line);
      }
    });

    Logger.error("Test suite failed.");
  }
};

registerCommand({
  name: 'test',
  description: 'Run project tests.',
  usage: 'test [filter]',
  aliases: ['t'],
  handler,
});