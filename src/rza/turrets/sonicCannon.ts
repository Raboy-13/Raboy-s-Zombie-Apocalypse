/**
 * @file Sonic Cannon functionality for the Zombie Apocalypse addon.
 * Handles sonic blast impulse mechanics for both regular and attachment variants.
 */

import { Entity } from "@minecraft/server";

/**
 * Applies a sonic blast impulse to the target entity from a regular sonic cannon.
 * The blast creates a strong upward force combined with horizontal movement.
 * 
 * @param {Entity} entity - The target entity to receive the sonic blast
 * @param {Entity} source - The entity firing the sonic cannon (used for direction)
 * @returns {void}
 */
export function sonicCannonHit(entity: Entity, source: Entity): void {
    const cannonDir = source.getViewDirection();
    entity.applyImpulse(
        {
            x: cannonDir.x * 3, // Horizontal force multiplier
            y: cannonDir.y * 8, // Strong vertical force
            z: cannonDir.z * 3  // Horizontal force multiplier
        }
    );
    return;
}