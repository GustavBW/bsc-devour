import type { CLIFunc } from '../ts/metaTypes.ts';
import { HELP_CMD } from './help/helpCmd.ts';
import { SINGLE_ASSET_INPUT_CMD } from './this/singleAssetInput.ts';
import { INGEST_FILE_INPUT_CMD } from './everything/ingestFileInput.ts';

const availableCommands: CLIFunc<any>[] = [];

export const registerCommand = <T>(command: CLIFunc<T>) => {
    availableCommands.push(command);
};
registerCommand(HELP_CMD);
registerCommand(SINGLE_ASSET_INPUT_CMD);
registerCommand(INGEST_FILE_INPUT_CMD);

export const getCommands = () => {
    return availableCommands;
};

export const getCommandById = (identifier: string) => {
    return availableCommands.find((command) => command.identifier === identifier);
};
