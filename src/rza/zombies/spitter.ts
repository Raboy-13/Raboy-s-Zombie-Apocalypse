import { Entity, EntityDamageCause } from "@minecraft/server";

// Map to track acid puddle effect cooldowns (key: entityId, value: cooldown ticks)
export const acidPuddleCooldowns = new Map<string, number>();

/**
 * Applies the acid puddle effect to nearby entities based on the puddle type
 * Effects are applied every 5 ticks (0.25 seconds)
 * @param entity The acid puddle entity
 */
export function spitterAcidPuddleEffect(entity: Entity) {
    try {
        const entityId = entity.id;
        const typeId = entity.typeId;
        const isNormalPuddle = typeId === 'rza:spitter_acid_puddle_normal';
        const isMutatedPuddle = typeId === 'rza:spitter_acid_puddle_mutated';

        // Skip if not a puddle entity
        if (!isNormalPuddle && !isMutatedPuddle) return;

        // Initialize or update cooldown
        let cooldown = acidPuddleCooldowns.get(entityId) || 0;
        if (cooldown > 0) {
            acidPuddleCooldowns.set(entityId, cooldown - 1);
            return;
        }

        // Reset cooldown to 5 ticks (0.25 seconds)
        acidPuddleCooldowns.set(entityId, 5);

        // Get nearby entities within range
        const range = isNormalPuddle ? 3 : 5; // Normal = 3 blocks, Mutated = 5 blocks
        const damage = isNormalPuddle ? 1 : 3; // Normal = 1, Mutated = 3
        
        const nearbyEntities = entity.dimension.getEntities({
            location: entity.location,
            maxDistance: range,
            excludeTypes: ['item'],
            excludeFamilies: ['inanimate', 'zombie', 'projectile']
        });

        // Apply fatal poison effect to valid entities
        for (const target of nearbyEntities) {
            if (target.isValid()) {
                target.applyDamage(damage, {cause: EntityDamageCause.entityAttack});
            }
        }
    } catch (error) {
        // Handle any errors that might occur
        console.warn(`Error in spitterAcidPuddleEffect: ${error}`);
    }
}

/**
 * Cleanup function to remove cooldown tracking when acid puddles are removed
 * @param entityId The ID of the removed acid puddle entity
 */
export function cleanupAcidPuddleCooldown(entityId: string) {
    if (acidPuddleCooldowns.has(entityId)) {
        acidPuddleCooldowns.delete(entityId);
    }
}
