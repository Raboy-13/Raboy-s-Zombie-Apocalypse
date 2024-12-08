import { Entity, EntityDamageCause, system } from "@minecraft/server";
import { calculateDistance, fixedPosRaycast } from "./raycast";

/**
 * Stores the state of all storm weavers in the world
 * chain_length: Number of chain jumps remaining
 * chained_zombies: Array of zombies currently in the chain
 * destroyed_weavers: Set of IDs of storm weavers that were destroyed (not just unloaded)
 */
export let stormWeavers = {
    "rza:chain_length": new Map<string, number>(),
    "rza:chained_zombies": new Map<string, Entity[]>(),
    "rza:destroyed_weavers": new Set<string>()
};

/**
 * Applies chain lightning damage from a storm weaver to nearby zombies.
 * Stores chain data in dynamic properties for persistence.
 * 
 * @param chainer - The initial zombie to start the chain from
 * @param stormWeaver - The storm weaver turret entity
 */
export function stormWeaverLightning(chainer: Entity, stormWeaver: Entity) {
    const stormWeaverId = stormWeaver.id;

    // Initialize chained zombies array for this storm weaver if it doesn't exist
    if (!stormWeavers["rza:chained_zombies"].has(stormWeaverId)) {
        stormWeavers["rza:chained_zombies"].set(stormWeaverId, []);
    }

    // Get the array of chained zombies for this storm weaver
    const chainedZombies = stormWeavers["rza:chained_zombies"].get(stormWeaverId)!;

    // Check if the storm weaver has any chain length left to chain lightning
    const chainLength = stormWeavers["rza:chain_length"].get(stormWeaverId);
    if (chainLength && chainLength > 0) {
        // Apply damage to the initial chainer entity
        try {
            if (chainer.isValid()) {
                chainer.applyDamage(4, { cause: EntityDamageCause.entityAttack, damagingEntity: stormWeaver });
                chainer.setOnFire(5, true);
                chainer.addTag('chainer');
                chainedZombies.push(chainer);
            }
        } catch (error) { }

        // Decrease the chain length for the storm weaver
        stormWeavers["rza:chain_length"].set(stormWeaverId, Math.max(chainLength - 1, 0));

        // Attempt to find the next entity to chain the lightning to
        const nextChainer = findNextChainer(chainer, stormWeaverId);
        if (nextChainer) {
            // Apply damage and add the chainer tag to the next entity
            try {
                if (nextChainer.isValid()) {
                    nextChainer.applyDamage(4, { cause: EntityDamageCause.entityAttack, damagingEntity: stormWeaver });
                    nextChainer.setOnFire(5, true);
                    nextChainer.addTag('chainer');
                    chainedZombies.push(nextChainer);
                }
            } catch (error) { }

            // Extract and store only the entity IDs from chained zombies, joined as a comma-separated string
            const chainedZombieIds = chainedZombies.map(zombie => zombie.id).join(',');
            stormWeaver.setDynamicProperty(`storm_weaver${stormWeaverId}chained_zombies_data`, chainedZombieIds);

            // Visualize the lightning effect between the chainer and the next chainer
            visualizeLightningEffect(chainer, nextChainer, stormWeaver);
        } else {
            // No next target - clean up chain
            for (const zombie of chainedZombies) {
                try {
                    if (zombie.isValid()) {
                        zombie.removeTag('chainer');
                    }
                } catch (error) { }
            }
            chainedZombies.length = 0;
        }
    }
    return;
}

/**
 * Finds the next entity to chain the lightning to.
 * 
 * @param chainer - The current entity being chained from.
 * @param stormWeaverId - ID of the storm weaver that owns this chain
 * @returns The next entity to chain to or undefined if none found.
 */
function findNextChainer(chainer: Entity, stormWeaverId: string): Entity | undefined {

    // Schedule removal of the chainer tag from the current chainer zombie
    scheduleChainerTagRemoval(chainer, stormWeaverId);

    try {
        return chainer.dimension.getEntities({
            location: chainer.location,
            families: ['zombie'],
            excludeTags: ['chainer'],
            minDistance: 3,
            maxDistance: 24,
            closest: 1
        })[0];
    } catch (error) {
        return undefined;
    }
}

/**
 * Visualizes the lightning effect between two entities.
 * 
 * @param chainer - The current entity being chained from.
 * @param nextChainer - The next entity being chained to.
 * @param stormWeaver - The storm weaver entity causing the damage.
 */
function visualizeLightningEffect(chainer: Entity, nextChainer: Entity, stormWeaver: Entity): void {
    const chainerLocation = { ...chainer.location, y: chainer.location.y + 0.5 };
    const nextChainerLocation = { ...nextChainer.location, y: nextChainer.location.y + 0.5 };
    const distance = calculateDistance(chainer.location, nextChainer.location);

    fixedPosRaycast(
        stormWeaver,
        chainer.dimension,
        chainerLocation,
        nextChainerLocation,
        distance,
        'rza:lightning'
    );
    return;
}

/**
 * Restores chained zombie data when a storm weaver is loaded.
 * Only removes tags from zombies that were specifically chained by this storm weaver.
 * 
 * @param stormWeaver - The storm weaver entity being loaded
 */
export function restoreChainedZombies(stormWeaver: Entity): void {
    try {
        const stormWeaverId = stormWeaver.id;
        const dataKey = `storm_weaver${stormWeaverId}chained_zombies_data`;
        const chainedZombieIds = stormWeaver.getDynamicProperty(dataKey);

        if (typeof chainedZombieIds === 'string' && chainedZombieIds.length > 0) {
            const storedZombieIds = chainedZombieIds.split(',');
            const nearbyTaggedZombies = stormWeaver.dimension.getEntities({
                location: stormWeaver.location,
                maxDistance: 256,
                families: ['zombie'],
                tags: ['chainer']
            });

            // Only remove tags from zombies that were chained by this storm weaver
            for (const zombie of nearbyTaggedZombies) {
                try {
                    if (zombie.isValid() && storedZombieIds.includes(zombie.id)) {
                        zombie.removeTag('chainer');
                    }
                } catch (error) { }
            }

            // Initialize tracking array
            if (!stormWeavers["rza:chained_zombies"].has(stormWeaver.id)) {
                stormWeavers["rza:chained_zombies"].set(stormWeaver.id, []);
            }
            const chainedZombies = stormWeavers["rza:chained_zombies"].get(stormWeaver.id)!;

            // Clear dynamic property
            try {
                stormWeaver.clearDynamicProperties();
            } catch (error) { }

            chainedZombies.length = 0;
        }
    } catch (error) { }
    return;
}

/**
 * Schedules the removal of the 'chainer' tag from zombies.
 * If at end of chain (length 0), removes all tags and clears array.
 * Otherwise, just removes tag from current zombie.
 * 
 * @param chainer - The chained zombie to remove tag from
 * @param stormWeaverId - ID of the storm weaver that owns this chain
 */
function scheduleChainerTagRemoval(chainer: Entity, stormWeaverId: string): void {
    const chainLength = stormWeavers["rza:chain_length"].get(stormWeaverId) || 0;

    if (chainLength <= 0) {
        const chainedZombies = stormWeavers["rza:chained_zombies"].get(stormWeaverId) || [];
        let removeTagDelay = system.runTimeout(() => {
            for (const zombie of chainedZombies) {
                try {
                    if (zombie.isValid()) {
                        zombie.removeTag('chainer');
                    }
                } catch (error) { }
            }
            chainedZombies.length = 0;
            system.clearRun(removeTagDelay);
        }, 10);
    } else {
        let removeTagDelay = system.runTimeout(() => {
            try {
                if (chainer.isValid()) {
                    chainer.removeTag('chainer');
                }
            } catch (error) { }
            system.clearRun(removeTagDelay);
        }, 10);
    }
    return;
}

/**
 * Cleans up storm weaver data during unload or destruction.
 * If unloading (willBeUnloaded=true), preserves dynamic properties for reload.
 * If destroyed (willBeUnloaded=false), cleans up everything.
 * 
 * @param stormWeaver - The storm weaver entity being cleaned up
 * @param willBeUnloaded - Whether entity is being unloaded vs destroyed
 */
export function cleanupStormWeaver(stormWeaver: Entity, willBeUnloaded: boolean): void {
    try {
        const stormWeaverId = stormWeaver.id;
        const chainedZombies = stormWeavers["rza:chained_zombies"].get(stormWeaverId) || [];

        // Remove tags from tracked zombies
        for (const zombie of chainedZombies) {
            try {
                if (zombie.isValid()) {
                    zombie.removeTag('chainer');
                }
            } catch (error) { }
        }

        // Clear tracking arrays
        chainedZombies.length = 0;
        stormWeavers["rza:chained_zombies"].delete(stormWeaverId);
        stormWeavers["rza:chain_length"].delete(stormWeaverId);

        // Only clear dynamic properties if being destroyed
        if (!willBeUnloaded) {
            try {
                stormWeaver.clearDynamicProperties();
            } catch (error) { }
        }
    } catch (error) { }
    return;
}