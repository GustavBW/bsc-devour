/**
 * @author GustavBW
 * @since 0.0.1
 */
export type Error = string;
export type ResErr<T> = | { result: T; error: null } | { result: null; error: Error };

/**
 * @author GustavBW
 * @since 0.0.1
 */
export type CLIFunc<T> = {
    func: (args: string[]) => Promise<ResErr<T>>;
    whatToDoWithResult: (result: T) => void;
    identifier: string;
    abstractExample: string;
    documentation: string;
}