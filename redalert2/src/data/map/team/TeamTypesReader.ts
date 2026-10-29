import { IniFile } from '@/data/IniFile';
import { IniSection } from '@/data/IniSection';

export interface TeamType {
    id: string;
    name: string;
    // References into the TaskForces/ScriptTypes tables read by
    // TaskForcesReader/ScriptTypesReader. Resolving these to actual objects
    // is left to the runtime that consumes this data.
    taskForceId?: string;
    scriptId?: string;
    // Raw house name as it appears in the INI ("<none>" becomes undefined).
    // Resolving this to an actual Country/house at runtime is out of scope
    // here, consistent with how other map object readers (e.g. structure/
    // vehicle "owner") keep the raw house string.
    house?: string;
    veteranLevel: number;
    mindControlDecision: number;
    loadable: boolean;
    full: boolean;
    annoyance: boolean;
    guardSlower: boolean;
    recruiter: boolean;
    autocreate: boolean;
    prebuild: boolean;
    reinforce: boolean;
    droppod: boolean;
    useTransportOrigin: boolean;
    whiner: boolean;
    looseRecruit: boolean;
    aggressive: boolean;
    suicide: boolean;
    priority: number;
    max: number;
    techLevel: number;
    group: number;
    onTransOnly: boolean;
    avoidThreats: boolean;
    ionImmune: boolean;
    transportsReturnOnUnload: boolean;
    areTeamMembersRecruitable: boolean;
    isBaseDefense: boolean;
    onlyTargetHouseEnemy: boolean;
    // Attaches a trigger tag to the team, same mechanism as a preplaced unit.
    tag?: string;
    // Only meaningful for cargo-plane teams.
    waypoint?: number;
}

// Reads the [TeamTypes] index section plus each referenced TeamType's own
// section. A TeamType combines a TaskForce (the units) with a ScriptType
// (what they do), plus AI/behavior flags, e.g.:
//
//   [TeamTypes]
//   0000=MYTEAM
//
//   [MYTEAM]
//   Name=Some descriptive name
//   House=Americans
//   TaskForce=MYFORCE
//   Script=MYSCRIPT
//   Priority=5
//   Max=2
//   TechLevel=0
//   Group=-1
//   Reinforce=yes
//   ... (remaining boolean/behavior flags)
export class TeamTypesReader {
    read(iniFile: IniFile): Map<string, TeamType> {
        const result = new Map<string, TeamType>();
        const indexSection = iniFile.getSection('TeamTypes');
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
                console.warn(`TeamType "${id}" is listed in [TeamTypes] but has no matching section. Skipping.`);
                continue;
            }
            result.set(id, this.readTeamType(id, section));
        }
        return result;
    }

    private readTeamType(id: string, section: IniSection): TeamType {
        return {
            id,
            name: section.getString('Name', id),
            taskForceId: this.readOptionalRef(section, 'TaskForce'),
            scriptId: this.readOptionalRef(section, 'Script'),
            house: this.readOptionalRef(section, 'House'),
            veteranLevel: section.getNumber('VeteranLevel', 0),
            mindControlDecision: section.getNumber('MindControlDecision', 0),
            loadable: section.getBool('Loadable', false),
            full: section.getBool('Full', false),
            annoyance: section.getBool('Annoyance', false),
            guardSlower: section.getBool('GuardSlower', false),
            recruiter: section.getBool('Recruiter', false),
            autocreate: section.getBool('Autocreate', false),
            prebuild: section.getBool('Prebuild', false),
            reinforce: section.getBool('Reinforce', false),
            droppod: section.getBool('Droppod', false),
            useTransportOrigin: section.getBool('UseTransportOrigin', false),
            whiner: section.getBool('Whiner', false),
            looseRecruit: section.getBool('LooseRecruit', false),
            aggressive: section.getBool('Aggressive', false),
            suicide: section.getBool('Suicide', false),
            priority: section.getNumber('Priority', 5),
            max: section.getNumber('Max', 5),
            techLevel: section.getNumber('TechLevel', -1),
            group: section.getNumber('Group', -1),
            onTransOnly: section.getBool('OnTransOnly', false),
            avoidThreats: section.getBool('AvoidThreats', false),
            ionImmune: section.getBool('IonImmune', false),
            transportsReturnOnUnload: section.getBool('TransportsReturnOnUnload', false),
            areTeamMembersRecruitable: section.getBool('AreTeamMembersRecruitable', false),
            isBaseDefense: section.getBool('IsBaseDefense', false),
            onlyTargetHouseEnemy: section.getBool('OnlyTargetHouseEnemy', false),
            tag: this.readOptionalRef(section, 'Tag'),
            waypoint: section.has('Waypoint') ? section.getNumber('Waypoint') : undefined,
        };
    }

    private readOptionalRef(section: IniSection, key: string): string | undefined {
        const value = section.getString(key, '<none>');
        return value === '<none>' || value === '' ? undefined : value;
    }

    private normalizeId(rawId: string | string[]): string | undefined {
        return typeof rawId === 'string' ? rawId : undefined;
    }
}
