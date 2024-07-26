import { EntityDamageCause } from "@minecraft/server";
import { stormWeaverLightning, stormWeavers } from "./stormWeaver";
export function calculateDistance(loc1, loc2) {
    const dx = loc1.x - loc2.x;
    const dy = loc1.y - loc2.y;
    const dz = loc1.z - loc2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function fixedPosRaycast(entity, dimension, from, to, distance, particle) {
    let step = 1;
    const entityType = entity.typeId;
    if (entityType == 'rza:repair_array')
        step = 0.5;
    if (entityType == 'rza:storm_weaver')
        step = 0.5;
    for (let i = 0; i <= distance; i += step) {
        const t = i / distance;
        const particleLoc = {
            x: from.x + t * (to.x - from.x),
            y: from.y + t * (to.y - from.y),
            z: from.z + t * (to.z - from.z)
        };
        try {
            dimension.spawnParticle(particle, particleLoc);
        }
        catch (e) { }
    }
    return;
}
export function fixedLenRaycast(entity, dimension, from, direction, length, particle) {
    let step = 1;
    const entityType = entity.typeId;
    const entityId = entity.id;
    if (entityType == 'rza:sonic_cannon')
        step = 2;
    if (entityType == 'rza:storm_weaver')
        step = 0.5;
    for (let i = 0; i <= length; i += step) {
        const particleLoc = {
            x: from.x + direction.x * i,
            y: from.y + direction.y * i,
            z: from.z + direction.z * i
        };
        try {
            if (entityType == 'rza:sonic_cannon') {
                const sonicCannon = entity;
                sonicCannon.dimension.getEntities({ location: particleLoc, families: ['zombie'], maxDistance: 5 }).forEach(zombie => {
                    zombie.applyDamage(10, { cause: EntityDamageCause.entityAttack, damagingEntity: sonicCannon });
                });
            }
            if (entityType == 'rza:storm_weaver' && stormWeavers["rza:chain_length"].get(entityId) > 0) {
                const stormWeaver = entity;
                const chainer = stormWeaver.dimension.getEntities({ location: particleLoc, families: ['zombie'], excludeTags: ['chainer'], maxDistance: 2, closest: 1 })[0];
                if (chainer) {
                    i = length;
                    stormWeaverLightning(chainer, stormWeaver);
                }
            }
            dimension.spawnParticle(particle, particleLoc);
        }
        catch (e) { }
    }
    return;
}
