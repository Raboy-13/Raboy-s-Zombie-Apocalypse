/**
 * @file pyroCharger.ts
 * @description Handles the Pyro Charger turret's fireball behavior and zombie ignition mechanics
 */

import { Entity } from "@minecraft/server";

/**
 * Handles the ignition of zombies when hit by a Pyro Charger's fireball
 * @param pyroFireball - The fireball entity projectile fired by the Pyro Charger
 * @throws Will catch and handle any errors during entity processing
 * @returns void
 */
export function pyroChargerFireball(pyroFireball: Entity): void {
    try {
        // Validate if the fireball entity exists and is still valid
        if (pyroFireball && pyroFireball.isValid()) {
            // Search for zombies within 2 blocks of the fireball
            pyroFireball.dimension.getEntities({ 
                families: ['zombie'], 
                location: pyroFireball.location, 
                maxDistance: 2 
            }).forEach(zombie => {
                // Set each zombie on fire for 20 ticks (1 second)
                zombie.setOnFire(20, true);
            });
        }
    } catch (error) {
        // Log the error for debugging purposes
        console.warn(`Error in pyroChargerFireball: ${error}`);
    }

    return;
}