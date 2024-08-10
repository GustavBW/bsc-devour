import type { BunFile, FileSink } from "bun";

export enum LogLevel {
    INFO = "INFO",
    WARNING = "WARNING",
    ERROR = "ERROR",
    FATAL = "FATAL"
}

export type Logger = {
    log: (message: string, level?: LogLevel) => void;
}

const logDir = "./devour-logs";
let logWriter: FileSink;

const writeMessage = (message: string, level: LogLevel) => {
    const logMessage = `${new Date().toISOString()} [${level}]: ${message}\n`;
    logWriter.write(new TextEncoder().encode(logMessage));
    logWriter.flush();
}

export const initializeLogger = async (): Promise<Logger> => {
    const currentLogFileName = `${logDir}/${Date.now()}.txt`;
    await Bun.write(currentLogFileName, new Uint8Array([1,2,3,4,5,6,76,8]), {createPath: true});
    const file = Bun.file(currentLogFileName);
    const exists = await file.exists();
    if (!exists) {
        console.error("Failed to create log file. No logging will be done.");
    }
    logWriter = file.writer();

    return {
        log: (message: string, level: LogLevel = LogLevel.INFO) => {
            writeMessage(message, level);
        }
    }
}

export const onApplicationShutdown = async () => {
    if (logWriter !== undefined) {
        await logWriter.flush();
        await logWriter.end();
    }
}