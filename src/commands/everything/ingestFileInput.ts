import { readUrlArg } from '../../processing/cliInputProcessor.ts';
import type { CLIFunc, ResErr } from '../../ts/metaTypes.ts';
/**
 * @author GustavBW
 * @since 0.0.1
 */
const handleIngestFileInput = async (args: string[]): Promise<ResErr<string>> => {
    let url = "";
    for (const arg of args) {
        if (arg.startsWith("path=")) {
            const {result, error} = readUrlArg(arg);
            if (error !== null) {
                return {result: null, error: error};
            }
            url = result;
        }
    }

    if (url === "") {
        return {result: null, error: "No path argument provided"};
    }

    const file = Bun.file(url);
    const fileExists = await file.exists();
    if (!fileExists) {
        return { result: null, error: "File: \""+url+"\" does not exist. WD: " + import.meta.dir };
    }
    const json = await file.text();
    console.log(json);

    return {result: null, error: "Not implemented yet."};
}
/**
 * @author GustavBW
 * @since 0.0.1
 */
export const INGEST_FILE_INPUT_CMD: CLIFunc<string> = {
    func: handleIngestFileInput,
    whatToDoWithResult: (result: string) => {
        console.log(result);
    },
    identifier: "everything",
    documentation: `
    Devours all assets specified in the file according to the given settings.
    The source may be an http url or a filepath.
    To see an example of the ingest file format, run "node devour help ingestFileFormat".
    `,
    abstractExample: "node devour everything path=\"url\"",
}