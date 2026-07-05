import { AxialCoord, hexEqual, hexKey } from './hex';
import { Hex } from './map';

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

export enum TurnPhase {
    SELECT = 'select',
    MOVE = 'move',
    ATTACK = 'attack',
    END = 'end',
}

export class GameState {
    currentPlayer: Player = Player.AXIS;
    turn: number = 1;
    phase: TurnPhase = TurnPhase.SELECT;
    units: Map<string, Unit> = new Map();
    selectedUnitId: string | null = null;
    validMoves: AxialCoord[] = [];
    selectedHex: AxialCoord | null = null;
    map: Map<string, Hex>;
    lastMoveCosts: Map<string, number> = new Map();

    constructor(map: Map<string, Hex>) {
        this.map = map;
        this.initializeUnits();
    }

    private initializeUnits(): void {
        // Axis starting units (near Western starting position)
        this.addUnit({
            type: UnitType.ARMOR,
            owner: Player.AXIS,
            position: { q: -15, r: 0 },
            strength: 4,
            movement: 6,
            maxMovement: 6
        });
        this.addUnit({
            type: UnitType.INFANTRY,
            owner: Player.AXIS,
            position: { q: -15, r: 2 },
            strength: 3,
            movement: 4,
            maxMovement: 4
        });
        this.addUnit({
            type: UnitType.HEADQUARTERS,
            owner: Player.AXIS,
            position: { q: -13, r: 2 },
            strength: 2,
            movement: 3,
            maxMovement: 3
        });

        // Soviet starting units (near Eastern position)
        this.addUnit({
            type: UnitType.ARMOR,
            owner: Player.SOVIET,
            position: { q: 10, r: 0 },
            strength: 3,
            movement: 5,
            maxMovement: 5
        });
        this.addUnit({
            type: UnitType.INFANTRY,
            owner: Player.SOVIET,
            position: { q: 10, r: 2 },
            strength: 3,
            movement: 3,
            maxMovement: 3
        });
        this.addUnit({
            type: UnitType.INFANTRY,
            owner: Player.SOVIET,
            position: { q: 10, r: -2 },
            strength: 2,
            movement: 3,
            maxMovement: 3
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
        const costs = this.computeReachableCosts(unit.position, unit.movement);
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

    moveUnit(targetCoord: AxialCoord): boolean {
        if (!this.selectedUnitId) return false;

        const unit = this.units.get(this.selectedUnitId);
        if (!unit) return false;

        const targetKey = hexKey(targetCoord);
        if (!this.lastMoveCosts.has(targetKey)) return false;

        const cost = this.lastMoveCosts.get(targetKey)!;
        unit.position = targetCoord;
        unit.movement -= cost;
        this.validMoves = [];
        this.lastMoveCosts = new Map();
        this.selectedUnitId = null;

        return true;
    }

    private computeReachableCosts(start: AxialCoord, movement: number): Map<string, number> {
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
                const enterCost = hex.movementCost ?? 1;
                const newCost = node.cost + enterCost;
                if (newCost > movement) continue;
                if (costs.has(nkey) && costs.get(nkey)! <= newCost) continue;
                pq.push({ key: nkey, coord: nc, cost: newCost });
            }
        }

        return costs;
    }

    endTurn(): void {
        // Reset all units' movement points
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
        this.phase = TurnPhase.SELECT;
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
