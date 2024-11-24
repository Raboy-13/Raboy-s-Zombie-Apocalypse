import { EntityDamageCause, system } from "@minecraft/server";
import { calculateDistance, fixedPosRaycast } from "./raycast";
// Store the chain lengths of storm weavers
export let stormWeavers = {
    "rza:chain_length": new Map()
};
/**
 * Applies lightning damage from a storm weaver to a chain of entities.
 *
 * @param chainer - The initial entity to start chaining from.
 * @param stormWeaver - The storm weaver entity causing the damage.
 */
export function stormWeaverLightning(chainer, stormWeaver) {
    const stormWeaverId = stormWeaver.id;
    // Check if the storm weaver has any chain length left to chain lightning
    const chainLength = stormWeavers["rza:chain_length"].get(stormWeaverId);
    if (chainLength && chainLength > 0) {
        // Apply damage to the initial chainer entity
        chainer?.applyDamage(4, { cause: EntityDamageCause.entityAttack, damagingEntity: stormWeaver });
        chainer.addTag('chainer'); // Mark the entity as chained
        // Decrease the chain length for the storm weaver
        stormWeavers["rza:chain_length"].set(stormWeaverId, Math.max(chainLength - 1, 0));
        // Attempt to find the next entity to chain the lightning to
        const nextChainer = findNextChainer(chainer);
        if (nextChainer) {
            // Apply damage and add the chainer tag to the next entity
            nextChainer.applyDamage(4, { cause: EntityDamageCause.entityAttack, damagingEntity: stormWeaver });
            nextChainer.addTag('chainer');
            // Visualize the lightning effect between the chainer and the next chainer
            visualizeLightningEffect(chainer, nextChainer, stormWeaver);
            // Schedule removal of the chainer tag from affected entities
            scheduleChainerTagRemoval(stormWeaver);
        }
    }
}
/**
 * Finds the next entity to chain the lightning to.
 *
 * @param chainer - The current entity being chained from.
 * @returns The next entity to chain to or undefined if none found.
 */
function findNextChainer(chainer) {
    return chainer.dimension.getEntities({
        location: chainer.location,
        families: ['zombie'],
        excludeTags: ['chainer'],
        minDistance: 3,
        maxDistance: 10,
        closest: 1
    })[0];
}
/**
 * Visualizes the lightning effect between two entities.
 *
 * @param chainer - The current entity being chained from.
 * @param nextChainer - The next entity being chained to.
 * @param stormWeaver - The storm weaver entity causing the damage.
 */
function visualizeLightningEffect(chainer, nextChainer, stormWeaver) {
    const chainerLocation = { ...chainer.location, y: chainer.location.y + 0.5 };
    const nextChainerLocation = { ...nextChainer.location, y: nextChainer.location.y + 0.5 };
    const distance = calculateDistance(chainer.location, nextChainer.location);
    fixedPosRaycast(stormWeaver, chainer.dimension, chainerLocation, nextChainerLocation, distance, 'rza:lightning');
    return;
}
/**
 * Schedules the removal of the 'chainer' tag from entities after a delay.
 *
 * @param stormWeaver - The storm weaver entity causing the damage.
 */
function scheduleChainerTagRemoval(stormWeaver) {
    let removeTagDelay = system.runTimeout(() => {
        const taggedZombies = stormWeaver.dimension.getEntities({
            location: stormWeaver.location,
            families: ['zombie'],
            tags: ['chainer']
        });
        taggedZombies.forEach(zombie => zombie.removeTag('chainer'));
        system.clearRun(removeTagDelay);
    }, 40);
}
