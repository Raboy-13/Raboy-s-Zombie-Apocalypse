import { Dimension, Entity, EntityDamageCause, Vector3 } from "@minecraft/server"
import { stormWeaverLightning, stormWeavers } from "./stormWeaver";

// Helper function to calculate the distance between the repair array and repairable locations
export function calculateDistance(loc1: Vector3, loc2: Vector3): number {
    const dx = loc1.x - loc2.x;
    const dy = loc1.y - loc2.y;
    const dz = loc1.z - loc2.z;

    //Distance calculation will be 1-block step
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

//Fixed raycast: Starting point rotation and end position are specified; length is determined by the distance of the 2 positions
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

// Fixed raycast: Starting point rotation and raycast length are specified; there is no end position
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
            if (entityType == 'rza:storm_weaver' && stormWeavers["rza:chain_length"].get(entityId) > 0) {
                const stormWeaver = entity;
                const chainer = stormWeaver.dimension.getEntities({ location: particleLoc, families: ['zombie'], excludeTags: ['chainer'], maxDistance: 2, closest: 1 })[0];
                
                if (chainer) {
                    i = length;
                    stormWeaverLightning(chainer, stormWeaver);
                }
            }
            dimension.spawnParticle(particle, particleLoc);
        } catch (e) { }
    }
    return;
}
