/**
 * AI module for Axis or Soviet side
 * Placeholder for future implementation
 */

import { GameState, Player } from './game';

export class AIPlayer {
    player: Player;
    gameState: GameState;

    constructor(player: Player, gameState: GameState) {
        this.player = player;
        this.gameState = gameState;
    }

    /**
     * Decide next move for AI
     * Simple heuristic: attack nearest enemy or advance
     */
    decideTurn(): void {
        const myUnits = this.gameState.getPlayerUnits(this.player);

        for (const unit of myUnits) {
            // For now, just end turn without moving
            void unit;
            // TODO: Implement simple heuristics
            // - Find nearest enemy
            // - Move toward it
            // - Attack if adjacent
        }
    }
}
