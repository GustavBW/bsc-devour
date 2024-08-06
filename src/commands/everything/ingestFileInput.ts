import type { CLIFunc, ResErr } from '../../ts/metaTypes.ts';
/**
 * @author GustavBW
 * @since 0.0.1
 */
const handleIngestFileInput = (args: string[]): Promise<ResErr<string>> => {
    return Promise.resolve({result: null, error: "Not implemented yet."});
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