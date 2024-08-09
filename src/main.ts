import { getCommandById } from './commands/commandRegistry.ts';
import type { ApplicationContext } from './ts/metaTypes.ts';

export const VERSION = "0.0.1";

// Get the command-line arguments
const args = process.argv.slice(2);

// Check if there are any arguments
if (args.length === 0) {
  console.log('No arguments provided.');
  process.exit(1);
} 

const funcIdentifier = args[0];
const command = getCommandById(funcIdentifier);
if (command === undefined) {
  console.log('No such command: ' + funcIdentifier);
  process.exit(1);
} else {
  const context: ApplicationContext = {};
  const { result, error } = await command.func(args.slice(1), context);
  if (error !== null) {
    console.log(error);
    process.exit(1);
  } else {
    command.whatToDoWithResult(result);
  }
}