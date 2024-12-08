import { Dimension, Entity, EntityDamageCause, Vector3 } from "@minecraft/server"
import { stormWeaverLightning, stormWeavers } from "./stormWeaver";

/**
 * Calculates the Euclidean distance between two 3D points
 * @param {Vector3} loc1 - The first position vector
 * @param {Vector3} loc2 - The second position vector
 * @returns {number} The distance between the two points in blocks
 * @description Used primarily for repair array calculations. Distance is calculated in 1-block steps.
 */
export function calculateDistance(loc1: Vector3, loc2: Vector3): number {
    const dx = loc1.x - loc2.x;
    const dy = loc1.y - loc2.y;
    const dz = loc1.z - loc2.z;

    //Distance calculation will be 1-block step
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Performs a raycast between two fixed positions with specified particle effects
 * @param {Entity} entity - The entity performing the raycast
 * @param {Dimension} dimension - The dimension where the raycast occurs
 * @param {Vector3} from - Starting position of the raycast
 * @param {Vector3} to - End position of the raycast
 * @param {number} distance - Maximum distance of the raycast in blocks
 * @param {string} particle - Identifier of the particle to spawn along the ray
 * @description 
 * - Step size varies by entity type:
 *   - Repair Array: 0.5 blocks
 *   - Storm Weaver: 0.5 blocks
 *   - Others: 1 block
 */
export function fixedPosRaycast(entity: Entity, dimension: Dimension, from: Vector3, to: Vector3, distance: number, particle: string) {
    let step = 1;
    const entityType = entity.typeId;

    if (entityType == 'rza:repair_array') step = 0.5;
    if (entityType == 'rza:storm_weaver') step = 0.5;

    for (let i = 0; i <= distance; i += step) {
        const t = i / distance; // Normalized interpolation factor
        const particleLoc: Vector3 = {
            x: from.x + t * (to.x - from.x),
            y: from.y + t * (to.y - from.y),
            z: from.z + t * (to.z - from.z)
        }
        try {
            dimension.spawnParticle(particle, particleLoc);
        } catch (e) { }
    }
    return;
}

/**
 * Performs a directional raycast with a fixed length and particle effects
 * @param {Entity} entity - The entity performing the raycast
 * @param {Dimension} dimension - The dimension where the raycast occurs
 * @param {Vector3} from - Starting position of the raycast
 * @param {Vector3} direction - Direction vector of the raycast
 * @param {number} length - Length of the raycast in blocks
 * @param {string} particle - Identifier of the particle to spawn along the ray
 * @description
 * - Step size varies by entity type:
 *   - Sonic Cannon: 2 blocks (Deals 10 damage to zombies within 5 blocks)
 *   - Storm Weaver: 0.5 blocks (Chains lightning between zombies)
 *   - Others: 1 block
 * - Special behaviors:
 *   - Sonic Cannon: Damages zombies in range
 *   - Storm Weaver: Chains lightning between zombies if chain length > 0
 */
export function fixedLenRaycast(entity: Entity, dimension: Dimension, from: Vector3, direction: Vector3, length: number, particle: string) {
    // default step size is 1 block
    let step = 1;
    const entityType = entity.typeId;
    const entityId = entity.id;

    if (entityType == 'rza:sonic_cannon') step = 2;
    if (entityType == 'rza:storm_weaver') step = 0.5;

    for (let i = 0; i <= length; i += step) {
        // Calculate the particle position based on the direction and current step
        const particleLoc: Vector3 = {
            x: from.x + direction.x * i,
            y: from.y + direction.y * i,
            z: from.z + direction.z * i
        };
        try {
            //Sonic Cannon
            if (entityType == 'rza:sonic_cannon') {
                const sonicCannon = entity;
                sonicCannon.dimension.getEntities({ location: particleLoc, families: ['zombie'], maxDistance: 5 }).forEach(zombie => {
                    zombie.applyDamage(10, { cause: EntityDamageCause.entityAttack, damagingEntity: sonicCannon });
                });
            }

            //Storm Weaver
            if (entityType === 'rza:storm_weaver' && (stormWeavers?.["rza:chain_length"]?.get(entityId) ?? 0) > 0) {
                const stormWeaver = entity;
                const chainer = stormWeaver.dimension.getEntities({ 
                    location: particleLoc, 
                    families: ['zombie'], 
                    excludeTags: ['chainer'], 
                    maxDistance: 4, 
                    closest: 1 
                })[0];
                const zombieTypeId = chainer?.typeId;
                
                if (chainer) {
                    // Check if zombie is an alpha or if it's close enough
                    if (zombieTypeId === "rza:alpha") {
                        i = length;
                        stormWeaverLightning(chainer, stormWeaver);
                    } else {
                        const distance = calculateDistance(particleLoc, chainer.location);
                        if (distance < 2) {
                            i = length;
                            stormWeaverLightning(chainer, stormWeaver);
                        }
                    }
                }
            }
            dimension.spawnParticle(particle, particleLoc);
        } catch (e) { }
    }
    return;
}
