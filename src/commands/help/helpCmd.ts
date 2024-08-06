import type { CLIFunc, Error, ResErr } from '../../ts/metaTypes.ts';
import { getCommands } from '../commandRegistry.ts';
import { VERSION } from '../../main.ts';

/**
 * @author GustavBW
 * @since 0.0.1
 */
export const formatTopLevelHelpString = (): string => {
    const availableCommands = getCommands();
    let helpString = "Devour v. " + VERSION + "\nAvailable commands:\n";
    for (const command of availableCommands) {
        helpString += `\t${command.identifier}: ${command.abstractExample}\n`;
        helpString += `\t\t${command.documentation}\n`;
        helpString += "\n";
    }
    return helpString;
}
/**
 * @param subCategory any, defaults to just top level help string
 * @author GustavBW
 * @since 0.0.1
 */
export const getSubCategoryHelpString = (args: string[]): Promise<ResErr<string>> => {
    const subcategory = args[0];
    
    switch (subcategory) {
        case "ingestFileFormat": return Promise.resolve({result: `
        Devour v. ${VERSION} Auto-Ingest Script Format

        ${INGEST_FILE_FORMAT_EXAMPLE}
        
        End of Example`, error: null});
        default: return Promise.resolve({result: formatTopLevelHelpString(), error: null});
    }
}
/**
 * @author GustavBW
 * @since 0.0.1
 */
export const HELP_CMD: CLIFunc<string> = {
    func: getSubCategoryHelpString,
    whatToDoWithResult: (result: string) => {
        console.log(result);
    },
    identifier: "help",
    documentation: `
    Prints this message.
    Available sub-categories are:
        ingestFileFormat`,
    abstractExample: "node devour help <sub-category>",
}

/**
 * @author GustavBW
 * @since 0.0.1
 */
const INGEST_FILE_FORMAT_EXAMPLE = `
{
	"settings": {
		"version": string?, // assumes newest
		"maxLOD": uint32?, // default 0 - any amount
		"LODThreshhold": uint32?, // num. kilobytes
		"allowedFailures": int32?, // num. allowed failures, default: 0
		"dsn": {
			"host": string,
			"port": uint8,
			"user": string,
			"password": string,
			"dbName": string,
			"sslMode": string
		},
	},
	"assets": [
		{
			"id": uint32
			"useCase": "icon" | "environment" | "player",

			"single": {     // mutually exclusive with field "collection"
				"id": uint32
				"source": string, 			
				"width": uint32, 			
				"height": uint32, 			
			}?,
			"collection": {
				"sources": {	
					"transform": Transform, // internal, relative, as seen below
					"graphicalAssetId": uint32,
				}[], 		
				"transform": {
					"xOffset": float32,
					"yOffset": float32,
					"zIndex": uint32,
					 // the scale parameters acts as width/height if no such exist
					"xScale": float32, 
					"yScale": float32, 
				}, 	
				"name": string, 			
			}?
		}
	]
}`