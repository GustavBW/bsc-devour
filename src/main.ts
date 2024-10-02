import { getCommandById } from './commands/commandRegistry.ts';
import { initializeLogger, onApplicationShutdown as loggerShutdown } from './logging/simpleLogger.ts';
import { DB_SINGLETON } from './networking/dbConn.ts';
import type { ApplicationContext } from './ts/metaTypes.ts';

export const VERSION = '1.0.0';
const timeStart = Date.now();
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
        context.logger.log('[main] Shutting down');
    }
    await loggerShutdown();
    process.exit(0);
};

const funcIdentifier = args[0];
const command = getCommandById(funcIdentifier);
if (command === undefined) {
    console.log('No such command: ' + funcIdentifier);
    process.exit(1);
}

context = {
    logger: await initializeLogger(),
    db: DB_SINGLETON,
};
context.logger.log('[main] Run args: ' + args.join(' '));
const { result, error } = await command.func(args.slice(1), context);
if (error !== null) {
    console.log('[main] [FATAL] ' + error);
} else {
    context.logger.log('[main] Command succesfull');
    command.whatToDoWithResult(result);
}
context.logger.logAndPrint(`[main] Execution time: ${Date.now() - timeStart}ms`);
shutdown();
