import { Player } from "@minecraft/server";

/**
 * Controls the behavior mode and activation state of collector drones owned by a player
 * 
 * @param player - The player using the remote control
 * 
 * Features:
 * - Toggles drone activation state when sneaking (on/off)
 * - Toggles drone behavior between following player and collecting items when not sneaking
 * - Only affects drones owned by the using player
 * - Plays feedback sound when used
 * - Shows actionbar message indicating current state/mode
 * - Clears any existing collection targets when switching modes
 * - Prevents mode switching when drones are inactive
 * 
 * States:
 * - Active: Drones can operate in either follow or collect mode
 * - Inactive: Drones power down and land
 * 
 * Behavior modes (when active):
 * - Follow Owner: Drones will follow the player around
 * - Collect Items: Drones will search for and collect nearby items/XP
 * 
 * Controls:
 * - Use while sneaking: Toggle drone activation (on/off)
 * - Use while not sneaking: Switch between follow/collect modes (if active)
 */
export function collectorDroneRemote(player: Player) {
    // Get player's current position and ownership tag
    const playerLocation = player.location;
    const playerOwnedTag = `${player.id}_owned`;

    // Find all collector drones owned by this player
    const collectorDrones = player.dimension.getEntities({
        type: 'rza:collector_drone',
        location: playerLocation,
        tags: [playerOwnedTag]
    });

    // Play feedback sound at player's eye level
    player.runCommand('execute anchored eyes positioned ^^^2 run playsound click_on.metal_pressure_plate @s ~~~');

    // Check if player is sneaking to toggle active state
    if (player.isSneaking) {
        // Get the active state of the first drone (all drones will be in same state)
        const firstDrone = collectorDrones[0];
        if (!firstDrone) return;

        const isActive = firstDrone.getProperty('rza:active');

        collectorDrones.forEach(collectorDrone => {
            // Toggle active state
            collectorDrone.setProperty('rza:active', !isActive);
            // When deactivating, also disable follow mode
            if (isActive) {
                collectorDrone.setProperty('rza:follow_owner', false);
                collectorDrone.triggerEvent('rza:drone_land');
                player.runCommand('title @s actionbar §4Collector Drones§r: Deactivated');
            } else {
                player.runCommand('title @s actionbar §2Collector Drones§r: Activated');
                collectorDrone.triggerEvent('rza:drone_hover');
            }
        });
        return;
    }

    // Only proceed with mode switching if drones are active
    if (!collectorDrones[0]?.getProperty('rza:active')) {
        player.runCommand('title @s actionbar §4Collector Drones§r: Must activate drones first');
        return;
    }

    // Toggle mode for each owned drone
    collectorDrones.forEach(collectorDrone => {
        // Ensure drone is active when changing modes
        collectorDrone.setProperty('rza:active', true);

        const followOwner = collectorDrone.getProperty('rza:follow_owner');
        if (followOwner) {
            collectorDrone.setProperty('rza:follow_owner', false);
            player.runCommand('title @s actionbar §2Collector Drones§r: Collect Items / XP');
        } else {
            collectorDrone.setProperty('rza:follow_owner', true);
            player.runCommand('title @s actionbar §2Collector Drones§r: Follow Owner');
        }
    });

    // Clear any existing collection targets within range
    const nearbyCollectibles = player.dimension.getEntities({
        tags: ['targeted'],
        location: playerLocation,
        maxDistance: 128
    });
    nearbyCollectibles.forEach(collectible => {
        collectible.removeTag('targeted');
    });

    return;
}