import { Entity, Vector3 } from "@minecraft/server";

/**
 * Applies alpha zombie mechanics to nearby zombies.
 * @param alpha - The alpha zombie entity.
 */
export function alphaZombieMechanics(alpha: Entity) {
    try {
        const mutated = alpha.getProperty('rza:mutated') as boolean;
        const location = alpha.location;
        const nearbyZombies = alpha.dimension.getEntities({
            location: location,
            maxDistance: 8,
            families: ['zombie'],
            excludeFamilies: ['alpha']
        });

        nearbyZombies.forEach(zombie => {
            const zombieLocation = zombie.location;
            // Apply duration based on alpha's mutation status
            const duration = mutated ? 2400 : 1200;
            
            addZombieEffects(zombie, duration, zombieLocation);

            // Only attempt mutation if alpha is mutated and target isn't
            if (mutated && !(zombie.getProperty('rza:mutated') as boolean)) {
                try {
                    zombie.triggerEvent('rza:mutate');
                    alpha.dimension.spawnParticle(`rza:alpha_zombie_buff`, zombieLocation);
                    alpha.dimension.playSound(`mob.zombie.remedy`, zombieLocation);
                } catch (e) {
                    // Fallback to speed effect if mutation fails
                    zombie.addEffect('speed', 2400, { amplifier: 2, showParticles: true });
                }
            }
        });
    } catch (e) {}
    return;
}

/**
 * Adds effects to a zombie entity.
 * @param zombie - The zombie entity to add effects to.
 * @param duration - The duration of the effects in ticks.
 */
function addZombieEffects(zombie: Entity, duration: number, location: Vector3) {
    const hasResistance = zombie.getEffect('resistance');
    const hasRegeneration = zombie.getEffect('regeneration');
    const hasStrength = zombie.getEffect('strength');

    if (!(hasResistance || hasRegeneration || hasStrength)) {
        try {
            zombie.addEffect('resistance', duration, { amplifier: 2, showParticles: true });
            zombie.addEffect('regeneration', duration, { amplifier: 2, showParticles: true });
            zombie.addEffect('strength', duration, { amplifier: 1, showParticles: true });
            zombie.dimension.spawnParticle(`rza:alpha_zombie_buff`, location);
            zombie.dimension.playSound(`mob.zombie.remedy`, location);
        } catch (e) { }
    }
    return;
}