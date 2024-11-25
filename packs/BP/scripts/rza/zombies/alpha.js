export function alphaZombieMechanics(alpha) {
    const mutated = alpha?.getProperty('rza:mutated');
    const location = alpha.location;
    const nearbyZombies = alpha.dimension.getEntities({
        location: location,
        maxDistance: 8,
        families: ['zombie'],
        excludeFamilies: ['alpha']
    });
    nearbyZombies.forEach(zombie => {
        const zombieLocation = zombie.location;
        if (mutated) {
            const isMutated = zombie.getProperty('rza:mutated');
            addZombieEffects(zombie, 2400, zombieLocation);
            if (!isMutated) {
                try {
                    zombie.triggerEvent('rza:mutate');
                    alpha.dimension.spawnParticle(`rza:alpha_zombie_buff`, zombieLocation);
                    alpha.dimension.playSound(`mob.zombie.remedy`, zombieLocation);
                }
                catch (e) {
                    zombie.addEffect('speed', 2400, { amplifier: 2, showParticles: true });
                }
            }
        }
        else {
            addZombieEffects(zombie, 1200, zombieLocation);
        }
    });
    return;
}
function addZombieEffects(zombie, duration, location) {
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
        }
        catch (e) { }
    }
    return;
}
