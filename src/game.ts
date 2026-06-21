import { AxialCoord, hexDistance, axialToCube, hexesInRange, hexEqual } from './hex';

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
    movementPoints: number;
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

    constructor() {
        this.initializeUnits();
    }

    private initializeUnits(): void {
        // Axis starting units (near Western starting position)
        this.addUnit({
            type: UnitType.ARMOR,
            owner: Player.AXIS,
            position: { q: -15, r: 0 },
            strength: 4,
        });
        this.addUnit({
            type: UnitType.INFANTRY,
            owner: Player.AXIS,
            position: { q: -15, r: 2 },
            strength: 3,
        });
        this.addUnit({
            type: UnitType.HEADQUARTERS,
            owner: Player.AXIS,
            position: { q: -15, r: -2 },
            strength: 2,
        });

        // Soviet starting units (near Eastern position)
        this.addUnit({
            type: UnitType.ARMOR,
            owner: Player.SOVIET,
            position: { q: 10, r: 0 },
            strength: 3,
        });
        this.addUnit({
            type: UnitType.INFANTRY,
            owner: Player.SOVIET,
            position: { q: 10, r: 2 },
            strength: 3,
        });
        this.addUnit({
            type: UnitType.INFANTRY,
            owner: Player.SOVIET,
            position: { q: 10, r: -2 },
            strength: 2,
        });
    }

    private addUnit(props: {
        type: UnitType;
        owner: Player;
        position: AxialCoord;
        strength: number;
    }): void {
        const id = `${props.owner}-${this.units.size}`;
        this.units.set(id, {
            id,
            type: props.type,
            owner: props.owner,
            position: props.position,
            strength: props.strength,
            movementPoints: 3,
            maxMovement: 3,
        });
    }

    selectUnit(unitId: string): boolean {
        const unit = this.units.get(unitId);
        if (!unit || unit.owner !== this.currentPlayer) {
            return false;
        }

        this.selectedUnitId = unitId;
        this.validMoves = hexesInRange(unit.position, unit.movementPoints);
        return true;
    }

    moveUnit(targetCoord: AxialCoord): boolean {
        if (!this.selectedUnitId) return false;

        const unit = this.units.get(this.selectedUnitId);
        if (!unit) return false;

        // Check if target is in valid moves
        if (!this.validMoves.some(coord => hexEqual(coord, targetCoord))) {
            return false;
        }

        // Calculate distance and deduct movement
        const distance = hexDistance(
            axialToCube(unit.position.q, unit.position.r),
            axialToCube(targetCoord.q, targetCoord.r)
        );

        unit.position = targetCoord;
        unit.movementPoints -= distance;
        this.validMoves = [];
        this.selectedUnitId = null;

        return true;
    }

    endTurn(): void {
        // Reset all units' movement points
        this.units.forEach((unit) => {
            if (unit.owner === this.currentPlayer) {
                unit.movementPoints = unit.maxMovement;
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
