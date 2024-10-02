import type { BunFile, FileSink } from 'bun';

export enum LogLevel {
    TRACE = 'TRACE',
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    FATAL = 'FATAL',
}

export type Logger = {
    log: (message: string, level?: LogLevel) => void;
    logAndPrint: (message: string, level?: LogLevel) => void;
};

const logDir = './devour-logs';
let logWriter: FileSink;

const logLevelStyles = {
    [LogLevel.TRACE]: (message: string) => `${message}`,
    [LogLevel.INFO]: (message: string) => `${message}`,
    [LogLevel.WARNING]: (message: string) => `#### ${message}`,
    [LogLevel.ERROR]: (message: string) => `### ${message}`,
    [LogLevel.FATAL]: (message: string) => `## ${message}`,
};

const writeMessage = (message: string, level: LogLevel) => {
    const logMessage = logLevelStyles[level](`${new Date().toISOString()} [${level}]: ${message}`) + '\n';
    logWriter.write(new TextEncoder().encode(logMessage));
    logWriter.flush();
};

export const initializeLogger = async (): Promise<Logger> => {
    const currentLogFileName = `${logDir}/${formatDate(Date.now())}.md`;
    await Bun.write(currentLogFileName, new Uint8Array([1, 2, 3, 4, 5, 6, 76, 8]), {
        createPath: true,
    });
    const file = Bun.file(currentLogFileName);
    const exists = await file.exists();
    if (!exists) {
        console.error('Failed to create log file. No logging will be done.');
    }
    logWriter = file.writer();

    const logMethod = (message: string, level: LogLevel = LogLevel.INFO) => {
        writeMessage(message, level);
    };

    return {
        log: logMethod,
        logAndPrint: (message: string, level: LogLevel = LogLevel.INFO) => {
            console.log('[' + level + '] ' + message);
            logMethod(message, level);
        },
    };
};

export const onApplicationShutdown = async () => {
    if (logWriter !== undefined) {
        await logWriter.flush();
        await logWriter.end();
    }
};

function formatDate(now: number): string {
    const date = new Date(now);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = String(date.getFullYear());
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}${month}${year}_${hours}h${minutes}m${seconds}s`;
}
