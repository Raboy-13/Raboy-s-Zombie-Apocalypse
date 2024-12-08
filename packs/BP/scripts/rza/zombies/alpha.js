export function alphaZombieMechanics(alpha) {
    try {
        const mutated = alpha.getProperty('rza:mutated');
        const location = alpha.location;
        const nearbyZombies = alpha.dimension.getEntities({
            location: location,
            maxDistance: 8,
            families: ['zombie'],
            excludeFamilies: ['alpha']
        });
        nearbyZombies.forEach(zombie => {
            const zombieLocation = zombie.location;
            const duration = mutated ? 2400 : 1200;
            addZombieEffects(zombie, duration, zombieLocation);
            if (mutated && !zombie.getProperty('rza:mutated')) {
                try {
                    zombie.triggerEvent('rza:mutate');
                    alpha.dimension.spawnParticle(`rza:alpha_zombie_buff`, zombieLocation);
                    alpha.dimension.playSound(`mob.zombie.remedy`, zombieLocation);
                }
                catch (e) {
                    zombie.addEffect('speed', 2400, { amplifier: 2, showParticles: true });
                }
            }
        });
    }
    catch (e) { }
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
