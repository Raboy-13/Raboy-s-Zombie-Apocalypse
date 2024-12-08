import { EntityDamageCause } from "@minecraft/server";
export const acidPuddleCooldowns = new Map();
export function spitterAcidPuddleEffect(entity) {
    try {
        const entityId = entity.id;
        const typeId = entity.typeId;
        const isNormalPuddle = typeId === 'rza:spitter_acid_puddle_normal';
        const isMutatedPuddle = typeId === 'rza:spitter_acid_puddle_mutated';
        if (!isNormalPuddle && !isMutatedPuddle)
            return;
        let cooldown = acidPuddleCooldowns.get(entityId) || 0;
        if (cooldown > 0) {
            acidPuddleCooldowns.set(entityId, cooldown - 1);
            return;
        }
        acidPuddleCooldowns.set(entityId, 5);
        const range = isNormalPuddle ? 3 : 5;
        const damage = isNormalPuddle ? 1 : 3;
        const nearbyEntities = entity.dimension.getEntities({
            location: entity.location,
            maxDistance: range,
            excludeTypes: ['item'],
            excludeFamilies: ['inanimate', 'zombie', 'projectile']
        });
        for (const target of nearbyEntities) {
            if (target.isValid()) {
                target.applyDamage(damage, { cause: EntityDamageCause.entityAttack });
            }
        }
    }
    catch (error) {
        console.warn(`Error in spitterAcidPuddleEffect: ${error}`);
    }
}
export function cleanupAcidPuddleCooldown(entityId) {
    if (acidPuddleCooldowns.has(entityId)) {
        acidPuddleCooldowns.delete(entityId);
    }
}
