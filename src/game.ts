import { AxialCoord, hexEqual, hexKey } from './hex';
import { Hex } from './map';
import defaultSetupData from './default-setup.json';

export enum Player {
    AXIS = 'axis',
    SOVIET = 'soviet',
}

export enum UnitType {
    INFANTRY = 'infantry',
    ARMOR = 'armor',
    HEADQUARTERS = 'headquarters',
}

export interface Unit {
    id: string;
    type: UnitType;
    owner: Player;
    position: AxialCoord;
    strength: number; // 1-5
    movement: number;
    maxMovement: number;
}

export interface SetupUnitData {
    type: string;
    owner: string;
    position: AxialCoord;
    strength: number;
    movement: number;
    maxMovement: number;
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
    private setupData: GameSetupData;

    constructor(map: Map<string, Hex>, setupData: GameSetupData = defaultSetupData as GameSetupData) {
        this.map = map;
        this.setupData = setupData;
        this.initializeUnits();
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
                type,
                owner,
                position: unitData.position,
                strength: unitData.strength,
                movement: unitData.movement,
                maxMovement: unitData.maxMovement,
            });
        });
    }

    private addUnit(props: {
        type: UnitType;
        owner: Player;
        position: AxialCoord;
        strength: number;
        movement: number;
        maxMovement: number;
    }): void {
        const id = `${props.owner}-${this.units.size}`;
        this.units.set(id, {
            id,
            type: props.type,
            owner: props.owner,
            position: props.position,
            strength: props.strength,
            movement: props.movement,
            maxMovement: props.maxMovement,
        });
    }

    selectUnit(unitId: string): boolean {
        const unit = this.units.get(unitId);
        if (!unit || unit.owner !== this.currentPlayer) {
            return false;
        }

        this.selectedUnitId = unitId;
        this.selectedHex = null;
        // Compute reachable tiles using movementCost from map
        const costs = this.computeReachableCosts(unit.position, unit.movement, unit.owner);
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
        console.log(this.attacks.size, 'attacks recorded:', Array.from(this.attacks.entries()));
        return true;
    }

    getUniqueAttackTargetsCount(): number {
        return new Set(Array.from(this.attacks.values())).size;
    }

    resetAttacks(): void {
        this.attacks = new Map();
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

        const cost = this.lastMoveCosts.get(targetKey)!;
        unit.position = targetCoord;
        unit.movement -= cost;
        this.validMoves = [];
        this.lastMoveCosts = new Map();
        this.selectedUnitId = null;

        return true;
    }

    private computeReachableCosts(start: AxialCoord, movement: number, owner: Player): Map<string, number> {
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

                const occupyingUnit = this.getUnitAt(nc);
                if (occupyingUnit && occupyingUnit.owner !== owner) {
                    continue;
                }

                const hex = this.map.get(nkey)!;
                const enterCost = hex.movementCost ?? 1;
                const newCost = node.cost + enterCost;
                if (newCost > movement) continue;
                if (costs.has(nkey) && costs.get(nkey)! <= newCost) continue;
                pq.push({ key: nkey, coord: nc, cost: newCost });
            }
        }

        return costs;
    }

    advancePhase(): void {
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
            return;
        }

        // If we're in the attack phase, end the turn: reset movement for the outgoing player,
        // switch player, increment turn when Axis becomes current, and enter Movement phase.
        if (this.phase === TurnPhase.ATTACK) {
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
            return;
        }
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
