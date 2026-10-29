import { IniFile } from '@/data/IniFile';
import { IniSection } from '@/data/IniSection';

export interface TaskForceEntry {
    count: number;
    unitType: string;
}

export interface TaskForce {
    id: string;
    name: string;
    group: number;
    entries: TaskForceEntry[];
}

// Reads the [TaskForces] index section plus each referenced TaskForce's own
// section, e.g.:
//
//   [TaskForces]
//   0000=MYFORCE
//
//   [MYFORCE]
//   Name=Some descriptive name
//   Group=-1
//   0=5,E1
//   1=3,FV
//
// Numeric keys (0, 1, 2, ...) are the unit entries; each is "Count,UnitType".
// Mirrors the resolution performed against ai(md).ini is out of scope here -
// this only reads TaskForces defined directly in the given IniFile (map or
// rules file). Resolving TaskForces that a map references but does not
// redefine (inherited from ai.ini) is a follow-up, not handled here.
export class TaskForcesReader {
    read(iniFile: IniFile): Map<string, TaskForce> {
        const result = new Map<string, TaskForce>();
        const indexSection = iniFile.getSection('TaskForces');
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
                console.warn(`TaskForce "${id}" is listed in [TaskForces] but has no matching section. Skipping.`);
                continue;
            }
            result.set(id, this.readTaskForce(id, section));
        }
        return result;
    }

    private readTaskForce(id: string, section: IniSection): TaskForce {
        const name = section.getString('Name', id);
        const group = section.getNumber('Group', -1);
        const entries: TaskForceEntry[] = [];
        const indices = this.getSortedNumericKeys(section);
        for (const index of indices) {
            const raw = section.getArray(String(index));
            if (raw.length < 2) {
                console.warn(`Invalid TaskForce unit entry ${index}="${raw.join(',')}" in "${id}". Skipping.`);
                continue;
            }
            const count = Number(raw[0]);
            const unitType = raw[1];
            if (Number.isNaN(count) || !unitType) {
                console.warn(`Invalid TaskForce unit entry ${index}="${raw.join(',')}" in "${id}". Skipping.`);
                continue;
            }
            entries.push({ count, unitType });
        }
        return { id, name, group, entries };
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
