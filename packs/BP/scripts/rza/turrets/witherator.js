import { EntityComponentTypes, EntityDamageCause, system } from "@minecraft/server";
import { faceDirection } from "rza/other/projectileRotation";
const COOLDOWN_RESET = 100;
const MAX_ZOMBIE_DISTANCE = 48;
const MAX_SKULL_DISTANCE = 96;
const MAX_SKULL_TARGETS = 24;
const DANGER_CHANCE_THRESHOLD = 28;
const skullTargetMap = new Map();
export function witheratorMechanics(witherator) {
    const isActive = witherator.getProperty('rza:active');
    const targetZombies = witherator.getProperty('rza:target_zombies');
    const prioritizeMutants = witherator.getProperty('rza:prioritize_mutants');
    const location = witherator.location;
    const locX = location.x;
    const locY = location.y;
    const locZ = location.z;
    let cooldown = witherator.getProperty('rza:cooldown');
    const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
    const normalSkulls = witherator.dimension.getEntities({ location: location, type: 'rza:witherator_skull', maxDistance: MAX_SKULL_DISTANCE });
    const dangerSkulls = witherator.dimension.getEntities({ location: location, type: 'rza:witherator_skull_dangerous', maxDistance: MAX_SKULL_DISTANCE });
    if (cooldown !== null && cooldown > 0) {
        witherator.setProperty('rza:cooldown', Math.max(0, cooldown - 1));
        const allSkulls = [...normalSkulls, ...dangerSkulls];
        allSkulls.forEach(skull => {
            if (skull.hasTag(`owner_${witherator.id}`)) {
                let family;
                switch (true) {
                    case skull.hasTag('all_mutated'):
                        family = 'all';
                        trackTargetAll(witherator, skull, family, true);
                        break;
                    case skull.hasTag('all_not_mutated'):
                        family = 'all';
                        trackTargetAll(witherator, skull, family, false);
                        break;
                    case skull.hasTag('walker_mutated'):
                        family = 'walker';
                        trackTargetAll(witherator, skull, family, true);
                        break;
                    case skull.hasTag('walker_not_mutated'):
                        family = 'walker';
                        trackTargetAll(witherator, skull, family, false);
                        break;
                    case skull.hasTag('miner_mutated'):
                        family = 'miner';
                        trackTargetAll(witherator, skull, family, true);
                        break;
                    case skull.hasTag('miner_not_mutated'):
                        family = 'miner';
                        trackTargetAll(witherator, skull, family, false);
                        break;
                    case skull.hasTag('feral_mutated'):
                        family = 'feral';
                        trackTargetAll(witherator, skull, family, true);
                        break;
                    case skull.hasTag('feral_not_mutated'):
                        family = 'feral';
                        trackTargetAll(witherator, skull, family, false);
                        break;
                    case skull.hasTag('spitter_mutated'):
                        family = 'spitter';
                        trackTargetAll(witherator, skull, family, true);
                        break;
                    case skull.hasTag('spitter_not_mutated'):
                        family = 'spitter';
                        trackTargetAll(witherator, skull, family, false);
                        break;
                    default:
                        break;
                }
            }
        });
        return;
    }
    if (!isActive) {
        witherator.setProperty('rza:cooldown', COOLDOWN_RESET);
        return;
    }
    zombies.forEach(zombie => {
        zombie.getTags().forEach(tag => {
            if (tag.startsWith('witherator_skull_')) {
                zombie.removeTag(tag);
            }
        });
    });
    if (targetZombies === 'All' && prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'all_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }
    if (targetZombies === 'All' && !prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'all_not_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }
    if (targetZombies === 'Walkers' && prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'walker_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }
    if (targetZombies === 'Walkers' && !prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'walker_not_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }
    if (targetZombies === 'Miners' && prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'miner_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }
    if (targetZombies === 'Miners' && !prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'miner_not_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }
    if (targetZombies === 'Ferals' && prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'feral_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }
    if (targetZombies === 'Ferals' && !prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'feral_not_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }
    if (targetZombies === 'Spitters' && prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'spitter_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }
    if (targetZombies === 'Spitters' && !prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'spitter_not_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }
    witherator.setProperty('rza:cooldown', COOLDOWN_RESET);
    return;
}
function fireSkulls(witherator, location, locX, locY, locZ, tag) {
    witherator.setProperty('rza:fire', true);
    witherator.dimension.playSound('mob.wither.shoot', location, { volume: 3 });
    const dangerChance = Math.floor(Math.random() * 101);
    const skullType = dangerChance <= DANGER_CHANCE_THRESHOLD ? 'rza:witherator_skull_dangerous' : 'rza:witherator_skull';
    const skullPositions = [
        { x: locX, y: locY + 1.75, z: locZ + 0.37 },
        { x: locX, y: locY + 1.75, z: locZ + 0.75 },
        { x: locX + 0.37, y: locY + 1.75, z: locZ },
        { x: locX + 0.75, y: locY + 1.75, z: locZ },
        { x: locX, y: locY + 1.75, z: locZ - 0.37 },
        { x: locX, y: locY + 1.75, z: locZ - 0.75 },
        { x: locX - 0.37, y: locY + 1.75, z: locZ },
        { x: locX - 0.75, y: locY + 1.75, z: locZ }
    ];
    skullPositions.forEach(pos => {
        const skull = witherator.dimension.spawnEntity(skullType, pos);
        const randomSpeedUpward = Math.random() * (1.6 - 1.4) + 1.4;
        skull.addTag(`owner_${witherator.id}`);
        skull.addTag(`${tag}`);
        skull.getComponent(EntityComponentTypes.Projectile).shoot({ x: 0, y: randomSpeedUpward, z: 0 }, { uncertainty: 0 });
    });
    let shootDelay = system.runTimeout(() => {
        witherator.setProperty('rza:fire', false);
        system.clearRun(shootDelay);
    }, 1);
    return;
}
function trackTargetAll(witherator, skull, family, prioritizeMutants) {
    const id = skull.id;
    const location = skull.location;
    const targetZombie = witherator.dimension.getEntities({ location: location, tags: [`witherator_skull_${id}`], maxDistance: MAX_SKULL_DISTANCE })[0];
    if (targetZombie) {
        shootSkull(skull, targetZombie, 0.9);
        return;
    }
    const filterablePossibleTargets = witherator.dimension.getEntities({ location: location, families: [`zombie`, `${family}`], closest: MAX_SKULL_TARGETS, maxDistance: MAX_SKULL_DISTANCE });
    const filterablePossibleTargetsOther = witherator.dimension.getEntities({ location: location, families: ['zombie'], excludeFamilies: [`${family}`], closest: MAX_SKULL_TARGETS, maxDistance: MAX_SKULL_DISTANCE });
    const possibleTargets = filterablePossibleTargets.filter(zombie => !zombie.getTags().some(tag => tag.startsWith('witherator_skull_')));
    const possibleTargetsOther = filterablePossibleTargetsOther.filter(zombie => !zombie.getTags().some(tag => tag.startsWith('witherator_skull_')));
    let trackable = skull.getProperty('rza:trackable');
    if (trackable > 0) {
        skull.setProperty('rza:trackable', Math.max(0, trackable - 1));
        return;
    }
    let target = skullTargetMap.get(id);
    if (target && possibleTargets.includes(target)) {
        shootSkull(skull, target, 0.9);
        return;
    }
    const findTargetableZombie = (targets) => {
        return targets.find(zombie => {
            const tags = zombie.getTags();
            const familyType = zombie.getComponent(EntityComponentTypes.TypeFamily).hasTypeFamily(family);
            const hasTargetTag = tags.some(tag => tag.startsWith('witherator_skull_'));
            const isMutated = zombie.getProperty('rza:mutated');
            const isFamilyMatch = family === 'all' || familyType;
            return prioritizeMutants ? (isMutated && !hasTargetTag && isFamilyMatch) : (!isMutated && !hasTargetTag && isFamilyMatch);
        });
    };
    let targetableZombie = findTargetableZombie(possibleTargets);
    if (!targetableZombie) {
        targetableZombie = findTargetableZombie(possibleTargetsOther);
    }
    const findOppositeTypeZombie = (targets) => {
        return targets.find(zombie => {
            const tags = zombie.getTags();
            const familyType = zombie.getComponent(EntityComponentTypes.TypeFamily).hasTypeFamily(family);
            const hasTargetTag = tags.some(tag => tag.startsWith('witherator_skull_'));
            const isMutated = zombie.getProperty('rza:mutated');
            const isFamilyMatch = family === 'all' || familyType;
            return prioritizeMutants ? (!isMutated && !hasTargetTag && isFamilyMatch) : (isMutated && !hasTargetTag && isFamilyMatch);
        });
    };
    let oppositeTypeZombie = !targetableZombie ? findOppositeTypeZombie(possibleTargets) : null;
    if (!oppositeTypeZombie) {
        oppositeTypeZombie = findOppositeTypeZombie(possibleTargetsOther);
    }
    const findFinalTargetableZombieType = (targets) => {
        return targets.find(zombie => {
            const tags = zombie.getTags();
            const familyType = zombie.getComponent(EntityComponentTypes.TypeFamily).hasTypeFamily(family);
            const hasTargetTag = tags.some(tag => tag.startsWith('witherator_skull_'));
            const isMutated = zombie.getProperty('rza:mutated');
            const isFamilyMatch = familyType;
            return prioritizeMutants ? (isMutated && !hasTargetTag && !isFamilyMatch) : (!isMutated && !hasTargetTag && !isFamilyMatch);
        });
    };
    let finalTargetableZombieType = !targetableZombie ? findFinalTargetableZombieType(possibleTargets) : null;
    if (!finalTargetableZombieType) {
        finalTargetableZombieType = findFinalTargetableZombieType(possibleTargetsOther);
    }
    const findFinalOppositeTargetableZombieType = (targets) => {
        return targets.find(zombie => {
            const tags = zombie.getTags();
            const familyType = zombie.getComponent(EntityComponentTypes.TypeFamily).hasTypeFamily(family);
            const hasTargetTag = tags.some(tag => tag.startsWith('witherator_skull_'));
            const isMutated = zombie.getProperty('rza:mutated');
            const isFamilyMatch = familyType;
            return prioritizeMutants ? (!isMutated && !hasTargetTag && !isFamilyMatch) : (isMutated && !hasTargetTag && !isFamilyMatch);
        });
    };
    let finalOppositeTargetableZombieType = !targetableZombie ? findFinalOppositeTargetableZombieType(possibleTargets) : null;
    if (!finalOppositeTargetableZombieType) {
        finalOppositeTargetableZombieType = findFinalOppositeTargetableZombieType(possibleTargetsOther);
    }
    const findNearestTaggedZombie = (targets) => {
        return targets.reduce((nearest, zombie) => {
            const tags = zombie.getTags();
            if (tags.some(tag => tag.startsWith('witherator_skull_'))) {
                const distance = getDistance(zombie.location, location);
                return distance < nearest.distance ? { zombie, distance } : nearest;
            }
            return nearest;
        }, { zombie: null, distance: Infinity }).zombie;
    };
    let nearestTaggedZombie = !targetableZombie && !oppositeTypeZombie ? findNearestTaggedZombie(possibleTargets) : null;
    if (!nearestTaggedZombie) {
        nearestTaggedZombie = findNearestTaggedZombie(possibleTargetsOther);
    }
    const finalTargetableZombie = targetableZombie || oppositeTypeZombie || finalTargetableZombieType || finalOppositeTargetableZombieType;
    if (finalTargetableZombie) {
        finalTargetableZombie.addTag(`witherator_skull_${id}`);
        skullTargetMap.set(id, finalTargetableZombie);
    }
    const selectedTarget = targetableZombie ?? oppositeTypeZombie ?? finalTargetableZombieType ?? finalOppositeTargetableZombieType ?? nearestTaggedZombie;
    target = selectedTarget === null ? undefined : selectedTarget;
    if (target) {
        shootSkull(skull, target, targetableZombie ? 0.9 : 1.2);
        return;
    }
    else {
        let target = skullTargetMap.get(id);
        if (target && possibleTargets.includes(target)) {
            shootSkull(skull, target, 0.9);
            return;
        }
        else {
            const targetZombie = witherator.dimension.getEntities({ location: location, families: [`zombie`], closest: 1, maxDistance: MAX_SKULL_DISTANCE })[0];
            if (targetZombie) {
                skullTargetMap.set(id, targetZombie);
                shootSkull(skull, targetZombie, 0.9);
                return;
            }
            else
                skull.remove();
        }
    }
    return;
}
function shootSkull(skull, target, speed) {
    const direction = calculateDirection(skull.location, target.location, speed);
    const skullLocation = skull.location;
    const targetLocation = target.location;
    faceDirection(skull, skullLocation, targetLocation);
    skull.getComponent(EntityComponentTypes.Projectile).shoot(direction, { uncertainty: 0 });
    return;
}
function getDistance(loc1, loc2) {
    return Math.sqrt((loc1.x - loc2.x) ** 2 +
        (loc1.y - loc2.y) ** 2 +
        (loc1.z - loc2.z) ** 2);
}
function calculateDirection(from, to, speedFactor) {
    const direction = {
        x: to.x - from.x,
        y: to.y - from.y,
        z: to.z - from.z
    };
    const magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    return {
        x: (direction.x / magnitude) * speedFactor,
        y: (direction.y / magnitude) * speedFactor,
        z: (direction.z / magnitude) * speedFactor
    };
}
function applyShockwaveEffect(zombie, location, hStrength, vStrength) {
    const zombieLocation = zombie.location;
    const direction = {
        x: zombieLocation.x - location.x,
        y: zombieLocation.y - location.y,
        z: zombieLocation.z - location.z
    };
    const magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    if (magnitude > 0) {
        zombie.applyKnockback(direction.x / magnitude, direction.z / magnitude, hStrength, vStrength);
    }
    return;
}
export function witheratorSkullHit(skull, id) {
    try {
        const location = skull.location;
        const type = skull.typeId;
        if (type === 'rza:witherator_skull') {
            const radius = 2;
            const zombies = skull.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: radius });
            if (zombies.length > 0) {
                zombies.forEach(zombie => {
                    zombie.applyDamage(6, { cause: EntityDamageCause.entityExplosion, damagingProjectile: skull });
                    zombie.addEffect('wither', 60, { amplifier: 1, showParticles: true });
                    skull.dimension.playSound('random.explode', location, { volume: 2 });
                    skull.dimension.spawnParticle('minecraft:large_explosion', location);
                    applyShockwaveEffect(zombie, location, 1, 0.3);
                });
                skull.remove();
            }
        }
        else {
            const radius = 4;
            const zombies = skull.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: radius });
            if (zombies.length > 0) {
                zombies.forEach(zombie => {
                    zombie.applyDamage(9, { cause: EntityDamageCause.entityExplosion, damagingProjectile: skull });
                    zombie.addEffect('wither', 80, { amplifier: 2, showParticles: true });
                    skull.dimension.playSound('random.explode', location, { volume: 2 });
                    skull.dimension.spawnParticle('minecraft:huge_explosion_emitter', location);
                    applyShockwaveEffect(zombie, location, 2, 0.7);
                });
                skull.remove();
            }
        }
    }
    catch (error) { }
    skullTargetMap.delete(id);
    return;
}
