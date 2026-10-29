import { IniFile } from '@/data/IniFile';
import { IniSection } from '@/data/IniSection';

export interface ScriptAction {
    action: number;
    argument: string;
}

export interface ScriptType {
    id: string;
    name: string;
    actions: ScriptAction[];
}

// Reads the [ScriptTypes] index section plus each referenced ScriptType's own
// section, e.g.:
//
//   [ScriptTypes]
//   0000=MYSCRIPT
//
//   [MYSCRIPT]
//   Name=Some descriptive name
//   0=58,1
//   1=5,10
//
// Numeric keys are the ordered action entries; each is "ActionCode,Argument".
// This only captures the raw action code + argument pair - interpreting what
// each action code actually does (move to waypoint, deploy, attack, etc.) is
// scoped to the runtime work that consumes this data (Phase 1), not here.
export class ScriptTypesReader {
    read(iniFile: IniFile): Map<string, ScriptType> {
        const result = new Map<string, ScriptType>();
        const indexSection = iniFile.getSection('ScriptTypes');
        if (!indexSection) {
            return result;
        }
        for (const [, rawId] of indexSection.entries) {
            const id = this.normalizeId(rawId);
            if (!id || result.has(id)) {
                continue;
            }
            const section = iniFile.getSection(id);
            if (!section) {
                console.warn(`ScriptType "${id}" is listed in [ScriptTypes] but has no matching section. Skipping.`);
                continue;
            }
            result.set(id, this.readScriptType(id, section));
        }
        return result;
    }

    private readScriptType(id: string, section: IniSection): ScriptType {
        const name = section.getString('Name', id);
        const actions: ScriptAction[] = [];
        const indices = this.getSortedNumericKeys(section);
        for (const index of indices) {
            const raw = section.getArray(String(index));
            if (raw.length < 2) {
                console.warn(`Invalid ScriptType action entry ${index}="${raw.join(',')}" in "${id}". Skipping.`);
                continue;
            }
            const action = Number(raw[0]);
            const argument = raw[1];
            if (Number.isNaN(action)) {
                console.warn(`Invalid ScriptType action entry ${index}="${raw.join(',')}" in "${id}". Skipping.`);
                continue;
            }
            actions.push({ action, argument });
        }
        return { id, name, actions };
    }

    private getSortedNumericKeys(section: IniSection): number[] {
        return [...section.entries.keys()]
            .filter((key) => /^\d+$/.test(key))
            .map(Number)
            .sort((a, b) => a - b);
    }

    private normalizeId(rawId: string | string[]): string | undefined {
        return typeof rawId === 'string' ? rawId : undefined;
    }
}
