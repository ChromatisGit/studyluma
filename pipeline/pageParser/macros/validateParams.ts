import { RawMacro } from "./parseMacro";
import { Params } from "./parseParams";


export function checkParamsAndSetDefaults<
    const Defaults extends Params
>(
    node: RawMacro,
    defaults: Defaults,
): Defaults {
    if (node.params == null) return { ...defaults };

    const obj = { ...node.params } as Params;

    // Map a positional argument to the single expected key
    if ("_positional" in obj) {
        const defaultKeys = Object.keys(defaults);
        if (defaultKeys.length === 1) {
            obj[defaultKeys[0]] = obj._positional;
        }
        delete obj._positional;
    }

    for (const key of Object.keys(obj)) {
        if (!(key in defaults)) {
            throw new Error(`Invalid key "${key}" for ${node.type} `);
        }
    }

    const result: Params = { ...defaults };

    for (const key of Object.keys(defaults)) {
        const incoming = obj[key];
        if (incoming === undefined) continue; // keep default

        const expectedType = typeof defaults[key];
        const actualType = typeof incoming;

        if (actualType !== expectedType) {
            throw new Error(
                `Invalid type for ${node.type}. ${key}: expected ${expectedType}, got ${actualType}`
            );
        }

        result[key] = incoming;
    }

    return result as Defaults;
}