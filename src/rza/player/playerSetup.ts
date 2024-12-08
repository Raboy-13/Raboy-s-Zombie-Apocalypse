import { system, world } from "@minecraft/server";
import { meleeWeaponCooldown } from "rza/weapons/melee";

/**
 * Sets up event handlers and initialization for new players joining the game.
 * This includes welcome messages, cooldown initialization, and other first-time setup tasks.
 * The function recursively re-registers itself to handle future player joins.
 */
function playerSetup() {
    /**
     * Event subscription for when players spawn in the world
     * Handles both initial spawns and respawns
     * @param {PlayerSpawnAfterEvent} spawn - The spawn event data containing player information
     */
    const onSpawn = world.afterEvents.playerSpawn.subscribe((spawn) => {
        const player = spawn.player;
        const initialSpawn = spawn.initialSpawn;

        // Only run setup for first-time spawns
        if (initialSpawn) {
            // Display welcome sequence with staged timing
            let title = system.runTimeout(() => {
                // Show title screen overlay
                player.onScreenDisplay.setTitle('title'); // Image title in JSON UI
                
                // First welcome message after title
                let sysmes = system.runTimeout(() => {
                    player.sendMessage(`[SYSTEM] Welcome to §6Raboy's §2Zombie §4Apocalypse§r!`);
                    
                    // Second welcome message
                    let sysmes2 = system.runTimeout(() => {
                        player.sendMessage(`[SYSTEM] Good luck and have fun!`);
                        
                        // Cleanup all timeouts
                        system.clearRun(sysmes2);
                        system.clearRun(sysmes);
                        system.clearRun(title);
                    }, 60); // 3 seconds after first message
                }, 140); // 7 seconds after title
            }, 300); // 15 seconds after spawn

            // Initialize player melee weapon cooldown system
            meleeWeaponCooldown.set(player.id, 0);
            
            // Cleanup and restart listener for next player
            world.afterEvents.playerSpawn.unsubscribe(onSpawn);
            playerSetup();
            return;
        }
        return;
    });
}

// Initialize the player setup system
playerSetup();