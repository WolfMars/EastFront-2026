import { AxialCoord, axialToCube, hexDistance, hexEqual, hexKey } from './hex';
import { Hex, TerrainType } from './map';
import defaultSetupData from './default-setup.json';
import { globalBus, GameMessage } from './messaging';

export enum Player {
    AXIS = 'axis',
    SOVIET = 'soviet',
}

export enum UnitType {
    INFANTRY = 'infantry',
    ARMOR = 'armor',
    HEADQUARTERS = 'headquarters',
}

export type StrengthBand = 'low' | 'medium' | 'high' | 'elite';
export type QualityBand = 'poor' | 'standard' | 'good' | 'elite';

export function getStrengthBand(strength: number): StrengthBand {
    if (strength <= 2) return 'low';
    if (strength <= 4) return 'medium';
    if (strength <= 6) return 'high';
    return 'elite';
}

export function getStrengthBandLabel(strength: number): string {
    switch (getStrengthBand(strength)) {
        case 'low':
            return 'Low (1-2)';
        case 'medium':
            return 'Medium (3-4)';
        case 'high':
            return 'High (5-6)';
        case 'elite':
            return 'Elite (7+)';
    }
}

export function getStrengthBandShortLabel(strength: number): string {
    switch (getStrengthBand(strength)) {
        case 'low':
            return 'L';
        case 'medium':
            return 'M';
        case 'high':
            return 'H';
        case 'elite':
            return 'E';
    }
}

export function getQualityBand(quality: number): QualityBand {
    if (quality <= 2) return 'poor';
    if (quality === 3) return 'standard';
    if (quality === 4) return 'good';
    return 'elite';
}

export function getQualityBandLabel(quality: number): string {
    switch (getQualityBand(quality)) {
        case 'poor':
            return 'Poor';
        case 'standard':
            return 'Standard';
        case 'good':
            return 'Good';
        case 'elite':
            return 'Elite';
    }
}

export function getIntelAgeLabel(currentTurn: number, lastObservedTurn: number): string {
    const age = Math.max(0, currentTurn - lastObservedTurn);
    if (age === 0) return 'fresh';
    if (age === 1) return 'recent';
    if (age <= 3) return 'stale';
    return 'outdated';
}

const COMMAND_RANGE_WITH_SUPPLY = 4;
const COMMAND_RANGE_WITHOUT_SUPPLY = 2;
const COMMAND_BONUS = 1;
const COMMAND_PENALTY = -1;
const DEFAULT_HQ_SUPPLY_POINTS = 6;

export interface UnitCommandView {
    commandHqId?: string;
    commandHqName?: string;
    hqSymbol?: string;
    commandRange: number;
    commandDistance?: number;
    inCommandRange: boolean;
    movementModifier: number;
    combatModifier: number;
    commandStateLabel: string;
    hqSupplyText?: string;
    independent: boolean;
}

export interface UnitIntelView {
    id: string;
    name?: string;
    type: UnitType;
    owner: Player;
    strengthLabel: string;
    qualityLabel: string;
    intelAgeLabel: string;
    movementText: string;
    exactStrength?: number;
    exactQuality?: number;
    isOwnerUnit: boolean;
    command: UnitCommandView;
}

export interface Unit {
    id: string;
    name?: string;
    type: UnitType;
    owner: Player;
    position: AxialCoord;
    strength: number; // 1-5
    quality: number; // 1-5
    movement: number;
    maxMovement: number;
    lastObservedTurn: number;
    commandHqId?: string;
    commandHqName?: string;
    hqSymbol?: string;
    independent?: boolean;
    supplyPoints: number;
    maxSupplyPoints: number;
}

export interface SetupUnitData {
    name?: string;
    type: string;
    owner: string;
    position: AxialCoord;
    strength: number;
    quality?: number;
    movement: number;
    maxMovement: number;
    lastObservedTurn?: number;
    commandHqId?: string;
    commandHqName?: string;
    hqSymbol?: string;
    independent?: boolean;
    supplyPoints?: number;
    maxSupplyPoints?: number;
}

export interface GameSetupData {
    units: SetupUnitData[];
}

export enum TurnPhase {
    MOVE = 'move',
    ATTACK = 'attack',
}

export class GameState {
    currentPlayer: Player = Player.AXIS;
    turn: number = 1;
    phase: TurnPhase = TurnPhase.MOVE;
    units: Map<string, Unit> = new Map();
    selectedUnitId: string | null = null;
    validMoves: AxialCoord[] = [];
    selectedHex: AxialCoord | null = null;
    map: Map<string, Hex>;
    lastMoveCosts: Map<string, number> = new Map();
    // Map of attackerId -> targetUnitId for the current attack phase
    attacks: Map<string, string> = new Map();
    // Last combat resolution messages (UI reads this for debug display)
    lastCombatMessages: string[] = [];
    private setupData: GameSetupData;

    constructor(map: Map<string, Hex>, setupData: GameSetupData = defaultSetupData as GameSetupData) {
        this.map = map;
        this.setupData = setupData;
        this.initializeUnits();
        this.assignCommandHeadquarters();
    }

    private initializeUnits(): void {
        this.setupData.units.forEach((unitData) => {
            const type = unitData.type === UnitType.ARMOR
                ? UnitType.ARMOR
                : unitData.type === UnitType.HEADQUARTERS
                    ? UnitType.HEADQUARTERS
                    : UnitType.INFANTRY;
            const owner = unitData.owner === Player.AXIS ? Player.AXIS : Player.SOVIET;

            this.addUnit({
                name: unitData.name,
                type,
                owner,
                position: unitData.position,
                strength: unitData.strength,
                quality: unitData.quality,
                movement: unitData.movement,
                maxMovement: unitData.maxMovement,
                lastObservedTurn: unitData.lastObservedTurn,
                commandHqId: unitData.commandHqId,
                commandHqName: unitData.commandHqName,
                hqSymbol: unitData.hqSymbol,
                independent: unitData.independent,
                supplyPoints: unitData.supplyPoints,
                maxSupplyPoints: unitData.maxSupplyPoints,
            });
        });
    }

    private addUnit(props: {
        name?: string;
        type: UnitType;
        owner: Player;
        position: AxialCoord;
        strength: number;
        quality?: number;
        movement: number;
        maxMovement: number;
        lastObservedTurn?: number;
        commandHqId?: string;
        commandHqName?: string;
        hqSymbol?: string;
        independent?: boolean;
        supplyPoints?: number;
        maxSupplyPoints?: number;
    }): void {
        const id = `${props.owner}-${this.units.size}`;
        const isHeadquarters = props.type === UnitType.HEADQUARTERS;
        const maxSupplyPoints = isHeadquarters ? (props.maxSupplyPoints ?? DEFAULT_HQ_SUPPLY_POINTS) : 0;
        this.units.set(id, {
            id,
            name: props.name,
            type: props.type,
            owner: props.owner,
            position: props.position,
            strength: props.strength,
            quality: props.quality ?? 3,
            movement: props.movement,
            maxMovement: props.maxMovement,
            lastObservedTurn: props.lastObservedTurn ?? this.turn,
            commandHqId: props.commandHqId,
            commandHqName: props.commandHqName,
            hqSymbol: props.hqSymbol,
            independent: props.independent ?? false,
            supplyPoints: isHeadquarters ? (props.supplyPoints ?? maxSupplyPoints) : 0,
            maxSupplyPoints,
        });
    }

    private assignCommandHeadquarters(): void {
        const headquarterUnits = Array.from(this.units.values()).filter(unit => unit.type === UnitType.HEADQUARTERS);

        this.units.forEach((unit) => {
            if (unit.type === UnitType.HEADQUARTERS) {
                if (!unit.hqSymbol) {
                    unit.hqSymbol = unit.name ? unit.name.replace(/[^A-Z0-9]/gi, '').charAt(0).toUpperCase() : 'H';
                }
                return;
            }

            if (unit.commandHqId) {
                const explicitHQ = this.units.get(unit.commandHqId);
                if (explicitHQ && explicitHQ.type === UnitType.HEADQUARTERS && explicitHQ.owner === unit.owner) {
                    return;
                }
            }

            const candidateHQs = headquarterUnits.filter(hq => hq.owner === unit.owner);
            if (candidateHQs.length === 0) {
                unit.commandHqId = undefined;
                return;
            }

            if (unit.commandHqName) {
                const namedHQ = candidateHQs.find(hq => hq.name === unit.commandHqName);
                if (namedHQ) {
                    unit.commandHqId = namedHQ.id;
                    if (!unit.hqSymbol) {
                        unit.hqSymbol = namedHQ.hqSymbol ?? namedHQ.name?.replace(/[^A-Z0-9]/gi, '').charAt(0).toUpperCase();
                    }
                    return;
                }
            }

            let bestHQ = candidateHQs[0];
            let bestDistance = hexDistance(axialToCube(unit.position.q, unit.position.r), axialToCube(bestHQ.position.q, bestHQ.position.r));

            for (let index = 1; index < candidateHQs.length; index++) {
                const candidate = candidateHQs[index];
                const distance = hexDistance(axialToCube(unit.position.q, unit.position.r), axialToCube(candidate.position.q, candidate.position.r));
                if (distance < bestDistance) {
                    bestHQ = candidate;
                    bestDistance = distance;
                }
            }

            unit.commandHqId = bestHQ.id;
            if (!unit.hqSymbol) {
                unit.hqSymbol = bestHQ.hqSymbol ?? bestHQ.name?.replace(/[^A-Z0-9]/gi, '').charAt(0).toUpperCase();
            }
        });
    }

    markUnitObserved(unitId: string): void {
        const unit = this.units.get(unitId);
        if (!unit) return;
        unit.lastObservedTurn = this.turn;
    }

    private getCommandHeadquarters(unit: Unit): Unit | undefined {
        if (unit.type === UnitType.HEADQUARTERS) {
            return unit;
        }

        if (unit.commandHqId) {
            const hq = this.units.get(unit.commandHqId);
            if (hq && hq.type === UnitType.HEADQUARTERS && hq.owner === unit.owner) {
                return hq;
            }
        }

        if (unit.independent) {
            const anyHQs = Array.from(this.units.values()).filter(other => other.type === UnitType.HEADQUARTERS && other.owner === unit.owner);
            if (anyHQs.length === 0) return undefined;

            let bestHQ = anyHQs[0];
            let bestDistance = hexDistance(axialToCube(unit.position.q, unit.position.r), axialToCube(bestHQ.position.q, bestHQ.position.r));

            for (let index = 1; index < anyHQs.length; index++) {
                const candidate = anyHQs[index];
                const distance = hexDistance(axialToCube(unit.position.q, unit.position.r), axialToCube(candidate.position.q, candidate.position.r));
                if (distance < bestDistance) {
                    bestHQ = candidate;
                    bestDistance = distance;
                }
            }

            return bestHQ;
        }

        const candidateHQs = Array.from(this.units.values()).filter(other => other.type === UnitType.HEADQUARTERS && other.owner === unit.owner);
        if (candidateHQs.length === 0) return undefined;

        let bestHQ = candidateHQs[0];
        let bestDistance = hexDistance(axialToCube(unit.position.q, unit.position.r), axialToCube(bestHQ.position.q, bestHQ.position.r));

        for (let index = 1; index < candidateHQs.length; index++) {
            const candidate = candidateHQs[index];
            const distance = hexDistance(axialToCube(unit.position.q, unit.position.r), axialToCube(candidate.position.q, candidate.position.r));
            if (distance < bestDistance) {
                bestHQ = candidate;
                bestDistance = distance;
            }
        }

        return bestHQ;
    }

    private getCommandRangeForHQ(hq: Unit): number {
        return hq.supplyPoints > 0 ? COMMAND_RANGE_WITH_SUPPLY : COMMAND_RANGE_WITHOUT_SUPPLY;
    }

    getUnitCommandView(unit: Unit): UnitCommandView {
        const hq = this.getCommandHeadquarters(unit);

        if (!hq) {
            return {
                hqSymbol: unit.hqSymbol,
                commandRange: 0,
                inCommandRange: false,
                movementModifier: COMMAND_PENALTY,
                combatModifier: COMMAND_PENALTY,
                commandStateLabel: unit.independent ? 'Independent, no HQ assigned' : 'No HQ assigned',
                independent: !!unit.independent,
            };
        }

        if (unit.type === UnitType.HEADQUARTERS) {
            const commandRange = this.getCommandRangeForHQ(unit);
            return {
                commandHqId: unit.id,
                commandHqName: unit.name ?? 'HQ',
                hqSymbol: unit.hqSymbol,
                commandRange,
                commandDistance: 0,
                inCommandRange: true,
                movementModifier: 0,
                combatModifier: 0,
                commandStateLabel: unit.supplyPoints > 0
                    ? `HQ supplied (${unit.supplyPoints}/${unit.maxSupplyPoints}), command range ${commandRange}`
                    : `HQ out of supply (${unit.supplyPoints}/${unit.maxSupplyPoints}), command range ${commandRange}`,
                hqSupplyText: `${unit.supplyPoints}/${unit.maxSupplyPoints}`,
                independent: false,
            };
        }

        const commandRange = this.getCommandRangeForHQ(hq);
        const commandDistance = hexDistance(axialToCube(unit.position.q, unit.position.r), axialToCube(hq.position.q, hq.position.r));
        const inCommandRange = commandDistance <= commandRange;
        const modifier = inCommandRange ? COMMAND_BONUS : COMMAND_PENALTY;

        return {
            commandHqId: hq.id,
            commandHqName: hq.name ?? hq.id,
            hqSymbol: unit.hqSymbol ?? hq.hqSymbol ?? hq.name?.replace(/[^A-Z0-9]/gi, '').charAt(0).toUpperCase(),
            commandRange,
            commandDistance,
            inCommandRange,
            movementModifier: modifier,
            combatModifier: modifier,
            commandStateLabel: unit.independent
                ? (inCommandRange ? `Independent, supported by ${hq.name ?? hq.id}` : `Independent, outside HQ support`)
                : (inCommandRange ? `In command range of ${hq.name ?? hq.id}` : `Out of command range of ${hq.name ?? hq.id}`),
            hqSupplyText: `${hq.supplyPoints}/${hq.maxSupplyPoints}`,
            independent: !!unit.independent,
        };
    }

    private spendHQSupplyForAction(unit: Unit): void {
        if (unit.type === UnitType.HEADQUARTERS) return;

        const hq = this.getCommandHeadquarters(unit);
        if (!hq) return;

        const commandView = this.getUnitCommandView(unit);
        if (!commandView.inCommandRange || hq.supplyPoints <= 0) return;

        hq.supplyPoints = Math.max(0, hq.supplyPoints - 1);
    }

    getUnitMovementAllowance(unit: Unit): number {
        const commandView = this.getUnitCommandView(unit);
        return Math.max(0, unit.movement + commandView.movementModifier);
    }

    getUnitCombatStrength(unit: Unit): number {
        const commandView = this.getUnitCommandView(unit);
        return Math.max(1, unit.strength + commandView.combatModifier);
    }

    selectUnit(unitId: string): boolean {
        const unit = this.units.get(unitId);
        if (!unit || unit.owner !== this.currentPlayer) {
            return false;
        }

        this.selectedUnitId = unitId;
        this.selectedHex = null;
        this.markUnitObserved(unitId);
        // Compute reachable tiles using movementCost from map
        const costs = this.computeReachableCosts(unit.position, this.getUnitMovementAllowance(unit), unit.owner, unit);
        this.lastMoveCosts = costs;

        this.validMoves = Array.from(costs.keys())
            .filter(k => k !== hexKey(unit.position))
            .map(k => {
                const [qStr, rStr] = k.split(',');
                return { q: Number(qStr), r: Number(rStr) } as AxialCoord;
            });
        return true;
    }

    selectHex(coord: AxialCoord): void {
        this.selectedHex = coord;
        this.selectedUnitId = null;
        this.validMoves = [];
        this.lastMoveCosts = new Map();
    }

    hasUnitAttacked(unitId: string): boolean {
        return this.attacks.has(unitId);
    }

    recordAttack(attackerId: string, targetUnitId: string): boolean {
        const attacker = this.units.get(attackerId);
        const target = this.units.get(targetUnitId);
        if (!attacker || !target) return false;
        if (attacker.owner !== this.currentPlayer) return false;
        if (target.owner === this.currentPlayer) return false;
        if (this.attacks.has(attackerId)) return false; // attacker already used

        this.attacks.set(attackerId, targetUnitId);
        // const msg: GameMessage = { type: 'attack', text: `Attack declared: ${attackerId} → ${targetUnitId}`, data: { attackerId, targetUnitId } };
        // globalBus.emit(msg);
        return true;
    }

    getUniqueAttackTargetsCount(): number {
        return new Set(Array.from(this.attacks.values())).size;
    }

    getUnitIntelView(unitId: string, viewer: Player): UnitIntelView | undefined {
        const unit = this.units.get(unitId);
        if (!unit) return undefined;

        const isOwnerUnit = unit.owner === viewer;
        const intelAgeLabel = getIntelAgeLabel(this.turn, unit.lastObservedTurn);
        const command = this.getUnitCommandView(unit);

        return {
            id: unit.id,
            name: unit.name,
            type: unit.type,
            owner: unit.owner,
            strengthLabel: getStrengthBandLabel(unit.strength),
            qualityLabel: getQualityBandLabel(unit.quality),
            intelAgeLabel,
            movementText: `${this.getUnitMovementAllowance(unit)} effective (${unit.movement}/${unit.maxMovement} raw)`,
            exactStrength: isOwnerUnit ? unit.strength : undefined,
            exactQuality: isOwnerUnit ? unit.quality : undefined,
            isOwnerUnit,
            command,
        };
    }

    getVisibleUnitsForPlayer(viewer: Player): UnitIntelView[] {
        return Array.from(this.units.values()).map(unit => this.getUnitIntelView(unit.id, viewer)).filter((unit): unit is UnitIntelView => !!unit);
    }

    resetAttacks(): void {
        this.attacks = new Map();
    }

    private getStackingLimitForHex(coord: AxialCoord): number {
        const hex = this.map.get(hexKey(coord));
        if (!hex) return 0;

        switch (hex.terrain) {
            case TerrainType.WATER:
                return 0;
            case TerrainType.FOREST:
            case TerrainType.MOUNTAIN:
            case TerrainType.MARSHLAND:
                return 1;
            case TerrainType.CITY:
                return 2;
            default:
                return 2;
        }
    }

    private canUnitOccupyHex(coord: AxialCoord, incomingUnit: Unit): boolean {
        const hex = this.map.get(hexKey(coord));
        if (!hex) return false;
        if (hex.terrain === TerrainType.WATER) return false;

        const occupants = this.getUnitsAtHex(coord).filter(unit => unit.id !== incomingUnit.id);
        const totalUnits = occupants.length + 1;
        const limit = this.getStackingLimitForHex(coord);
        if (totalUnits > limit) return false;

        if (hex.terrain === TerrainType.CITY) {
            const combatUnits = occupants.filter(unit => unit.type !== UnitType.HEADQUARTERS).length + (incomingUnit.type !== UnitType.HEADQUARTERS ? 1 : 0);
            const hasHq = occupants.some(unit => unit.type === UnitType.HEADQUARTERS) || incomingUnit.type === UnitType.HEADQUARTERS;
            if (combatUnits > 1 && !hasHq) return false;
        }

        return true;
    }

    private canUnitEnterHexForMovement(coord: AxialCoord, movingUnit: Unit): boolean {
        const existingUnit = this.getUnitAt(coord);
        if (existingUnit && existingUnit.id !== movingUnit.id && existingUnit.owner !== movingUnit.owner) {
            return false;
        }

        return this.canUnitOccupyHex(coord, movingUnit);
    }

    private getUnitsAtHex(coord: AxialCoord): Unit[] {
        return Array.from(this.units.values()).filter(unit => hexEqual(unit.position, coord));
    }

    moveUnit(targetCoord: AxialCoord): boolean {
        if (!this.selectedUnitId) return false;

        const unit = this.units.get(this.selectedUnitId);
        if (!unit) return false;

        const targetKey = hexKey(targetCoord);
        if (!this.lastMoveCosts.has(targetKey)) return false;

        const occupyingUnit = this.getUnitAt(targetCoord);
        if (occupyingUnit && occupyingUnit.owner !== unit.owner) {
            return false;
        }

        if (!this.canUnitOccupyHex(targetCoord, unit)) {
            return false;
        }

        const cost = this.lastMoveCosts.get(targetKey)!;
        this.spendHQSupplyForAction(unit);
        unit.position = targetCoord;
        unit.movement -= cost;
        unit.lastObservedTurn = this.turn;
        this.validMoves = [];
        this.lastMoveCosts = new Map();
        this.selectedUnitId = null;

        const msg: GameMessage = { type: 'movement', text: `Unit ${unit.id} moved to ${targetCoord.q},${targetCoord.r}`, data: { unitId: unit.id, to: targetCoord } };
        globalBus.emit(msg);

        return true;
    }

    private computeReachableCosts(start: AxialCoord, movement: number, owner: Player, movingUnit: Unit): Map<string, number> {
        const dirs = [
            { q: 1, r: 0 },
            { q: -1, r: 0 },
            { q: 0, r: 1 },
            { q: 0, r: -1 },
            { q: 1, r: -1 },
            { q: -1, r: 1 },
        ];

        const startKey = hexKey(start);
        const costs = new Map<string, number>();
        const pq: Array<{ key: string; coord: AxialCoord; cost: number }> = [{ key: startKey, coord: start, cost: 0 }];

        while (pq.length > 0) {
            pq.sort((a, b) => a.cost - b.cost);
            const node = pq.shift()!;
            if (costs.has(node.key)) continue;
            costs.set(node.key, node.cost);

            for (const d of dirs) {
                const nc: AxialCoord = { q: node.coord.q + d.q, r: node.coord.r + d.r };
                const nkey = hexKey(nc);
                if (!this.map.has(nkey)) continue;

                const hex = this.map.get(nkey)!;
                if (hex.terrain === TerrainType.WATER) continue;

                const virtualUnit = { ...movingUnit, position: nc, id: `${movingUnit.id}-virtual` } as Unit;
                if (!this.canUnitEnterHexForMovement(nc, virtualUnit)) continue;

                const enterCost = hex.movementCost ?? 1;
                const newCost = node.cost + enterCost;
                if (newCost > movement) continue;
                if (costs.has(nkey) && costs.get(nkey)! <= newCost) continue;
                pq.push({ key: nkey, coord: nc, cost: newCost });
            }
        }

        return costs;
    }

    advancePhase(): string[] {
        // If we're in the movement phase, advance to attack phase.
        if (this.phase === TurnPhase.MOVE) {
            this.phase = TurnPhase.ATTACK;
            this.selectedUnitId = null;
            this.validMoves = [];
            this.lastMoveCosts = new Map();
            this.units.forEach((unit) => {
                if (unit.owner === this.currentPlayer) {
                    unit.movement = 0; // No movement left during attack phase
                }
            });
            this.resetAttacks();
            return [];
        }

        // If we're in the attack phase, end the turn: reset movement for the outgoing player,
        // switch player, increment turn when Axis becomes current, and enter Movement phase.
        if (this.phase === TurnPhase.ATTACK) {
            // Resolve all recorded attacks before ending the attack phase
            const messages = this.resolveAttacks();
            // expose messages for UI/debug panel
            this.lastCombatMessages = messages;

            this.units.forEach((unit) => {
                if (unit.owner === this.currentPlayer) {
                    unit.movement = unit.maxMovement;
                }
            });

            // Switch player
            this.currentPlayer = this.currentPlayer === Player.AXIS ? Player.SOVIET : Player.AXIS;

            if (this.currentPlayer === Player.AXIS) {
                this.turn++;
            }

            this.selectedUnitId = null;
            this.validMoves = [];
            this.lastMoveCosts = new Map();
            this.resetAttacks();
            this.phase = TurnPhase.MOVE;
            return messages;
        }
        return [];
    }

    // Resolve combat based on the collected `attacks` map.
    // Rules (simple):
    // - For each defender, sum strengths of all attackers targeting it.
    // - If combined attacker strength > defender strength -> remove defender.
    // - If equal -> no result.
    // - If combined attacker strength < defender strength -> remove all attackers.
    private resolveAttacks(): string[] {
        // Group attackers by target
        const byTarget = new Map<string, string[]>();
        for (const [attackerId, targetId] of this.attacks.entries()) {
            if (!byTarget.has(targetId)) byTarget.set(targetId, []);
            byTarget.get(targetId)!.push(attackerId);
        }

        // Keep sets of units to remove to avoid mutating while iterating
        const removeUnitIds = new Set<string>();
        const messages: string[] = [];

        for (const [targetId, attackerIds] of byTarget.entries()) {
            const target = this.units.get(targetId);
            if (!target) continue; // defender already gone or invalid

            this.markUnitObserved(targetId);

            // Collect valid attackers (skip attackers that have been removed earlier)
            const attackers = attackerIds
                .map(id => this.units.get(id))
                .filter((u): u is NonNullable<typeof u> => !!u);

            if (attackers.length === 0) continue;

            const combined = attackers.reduce((s, u) => s + this.getUnitCombatStrength(u), 0);
            const targetStrength = this.getUnitCombatStrength(target);
            attackers.forEach((attacker) => {
                attacker.lastObservedTurn = this.turn;
                this.spendHQSupplyForAction(attacker);
            });
            this.spendHQSupplyForAction(target);

            if (combined > targetStrength) {
                // Attackers win: defender removed
                removeUnitIds.add(targetId);
                const atkNames = attackers.map(a => a.id).join(', ');
                const text = `Attack success ${target.id} removed by ${atkNames} (${combined} > ${targetStrength})`;
                messages.push(text);
                globalBus.emit({ type: 'combat', text, data: { targetId, attackerIds, combined, targetStrength } });
            } else if (combined < targetStrength) {
                // Defender wins: remove all attackers that attacked this defender
                for (const a of attackers) removeUnitIds.add(a.id);
                const atkNames = attackers.map(a => a.id).join(', ');
                const text = `Attackers ${atkNames} eliminated by ${target.id} (${combined} < ${targetStrength})`;
                messages.push(text);
                globalBus.emit({ type: 'combat', text, data: { targetId, attackerIds, combined, targetStrength } });
            } else {
                // equal: no result
                const atkNames = attackers.map(a => a.id).join(', ');
                const text = `No result: ${atkNames} vs ${target.id} (${combined} = ${targetStrength})`;
                messages.push(text);
                globalBus.emit({ type: 'combat', text, data: { targetId, attackerIds, combined, targetStrength } });
            }
        }

        // Apply removals
        for (const id of removeUnitIds) {
            this.units.delete(id);
        }

        return messages;
    }

    getUnitAt(coord: AxialCoord): Unit | undefined {
        for (const unit of this.units.values()) {
            if (hexEqual(unit.position, coord)) {
                return unit;
            }
        }
        return undefined;
    }

    getPlayerUnits(player: Player): Unit[] {
        return Array.from(this.units.values()).filter(u => u.owner === player);
    }
}
