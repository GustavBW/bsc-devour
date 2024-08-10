import { getCommandById } from './commands/commandRegistry.ts';
import { initializeLogger, onApplicationShutdown } from './logging/simpleLogger.ts';
import type { ApplicationContext } from './ts/metaTypes.ts';

export const VERSION = "0.0.1";

// Get the command-line arguments
const args = process.argv.slice(2);

// Check if there are any arguments
if (args.length === 0) {
  console.log('No arguments provided.');
  process.exit(1);
} 
let context: ApplicationContext;

const shutdown = async () => {
  if (context !== undefined) {
    context.logger.log("[main] Shutting down");
  }
  await onApplicationShutdown();
  process.exit(0);
}

const funcIdentifier = args[0];
const command = getCommandById(funcIdentifier);
if (command === undefined) {
  console.log('No such command: ' + funcIdentifier);
  process.exit(1);
} else {
  context = {
    logger: await initializeLogger(),
  };
  context.logger.log("[main] Run args: " + args.join(' '));
  const { result, error } = await command.func(args.slice(1), context);
  if (error !== null) {
    console.log(error);
  } else {
    context.logger.log("[main] Command succesfull");
    command.whatToDoWithResult(result);
  }
}
shutdown();
