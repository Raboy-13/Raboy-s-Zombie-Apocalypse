import { Entity, EntityComponentTypes, EntityDamageCause, EntityProjectileComponent, EntityTypeFamilyComponent, system, Vector3 } from "@minecraft/server";
import { faceDirection } from "rza/other/projectileRotation";

const COOLDOWN_RESET = 100;
const MAX_ZOMBIE_DISTANCE = 48;
const MAX_SKULL_DISTANCE = 96;
const MAX_SKULL_TARGETS = 24;
const DANGER_CHANCE_THRESHOLD = 28;
const skullTargetMap = new Map<string, Entity>();

export function witheratorMechanics(witherator: Entity) {
    // Retrieve properties from the witherator entity
    const isActive = witherator.getProperty('rza:active') as boolean | null;
    const targetZombies = witherator.getProperty('rza:target_zombies') as string | null;
    const prioritizeMutants = witherator.getProperty('rza:prioritize_mutants') as boolean | null;
    const location = witherator.location;
    const locX = location.x;
    const locY = location.y;
    const locZ = location.z;
    let cooldown = witherator.getProperty('rza:cooldown') as number | null;

    // Get nearby zombies, normal skulls, and danger skulls
    const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
    const normalSkulls = witherator.dimension.getEntities({ location: location, type: 'rza:witherator_skull', maxDistance: MAX_SKULL_DISTANCE });
    const dangerSkulls = witherator.dimension.getEntities({ location: location, type: 'rza:witherator_skull_dangerous', maxDistance: MAX_SKULL_DISTANCE });

    // Check if the witherator is on cooldown
    if (cooldown !== null && cooldown > 0) {
        witherator.setProperty('rza:cooldown', Math.max(0, cooldown - 1));

        // Track targets for all skulls fired
        const allSkulls = [...normalSkulls, ...dangerSkulls];
        allSkulls.forEach(skull => {
            if (skull.hasTag(`owner_${witherator.id}`)) {
                let family: string;
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
                    case skull.hasTag('alpha_mutated'):
                        family = 'alpha';
                        trackTargetAll(witherator, skull, family, true);
                        break;
                    case skull.hasTag('alpha_not_mutated'):
                        family = 'alpha';
                        trackTargetAll(witherator, skull, family, false);
                        break;
                    default:
                        // Handle other cases or do nothing
                        break;
                }
            }
        });
        return;
    }

    // Check if the witherator is not active
    if (!isActive) {
        witherator.setProperty('rza:cooldown', COOLDOWN_RESET);
        return;
    }

    // Remove tags of all previously-targeted zombies
    zombies.forEach(zombie => {
        zombie.getTags().forEach(tag => {
            if (tag.startsWith('witherator_skull_')) {
                zombie.removeTag(tag);
            }
        });
    });

    // Target All: Prioritize Mutants
    if (targetZombies === 'All' && prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'all_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }

    // Target All: Do Not Prioritize Mutants
    if (targetZombies === 'All' && !prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'all_not_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }

    // Target Walkers: Prioritize Mutants
    if (targetZombies === 'Walkers' && prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'walker_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }

    // Target Walkers: Do Not Prioritize Mutants
    if (targetZombies === 'Walkers' && !prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'walker_not_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }

    // Target Miners: Prioritize Mutants
    if (targetZombies === 'Miners' && prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'miner_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }

    // Target Miners: Do Not Prioritize Mutants
    if (targetZombies === 'Miners' && !prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'miner_not_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }

    // Target Ferals: Prioritize Mutants
    if (targetZombies === 'Ferals' && prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'feral_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }

    // Target Ferals: Do Not Prioritize Mutants
    if (targetZombies === 'Ferals' && !prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'feral_not_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }

    // Target Spitters: Prioritize Mutants
    if (targetZombies === 'Spitters' && prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'spitter_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }

    // Target Spitters: Do Not Prioritize Mutants
    if (targetZombies === 'Spitters' && !prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'spitter_not_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }

    // Target Alphas: Prioritize Mutants
    if (targetZombies === 'Alphas' && prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'alpha_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }

    // Target Alphas: Do Not Prioritize Mutants
    if (targetZombies === 'Alphas' && !prioritizeMutants) {
        const zombies = witherator.dimension.getEntities({ location: location, families: ['zombie'], maxDistance: MAX_ZOMBIE_DISTANCE });
        if (zombies.length > 0) {
            const tag = 'alpha_not_mutated';
            fireSkulls(witherator, location, locX, locY, locZ, tag);
        }
    }

    witherator.setProperty('rza:cooldown', COOLDOWN_RESET);
    return;
}

//General function to fire skulls
function fireSkulls(witherator: Entity, location: Vector3, locX: number, locY: number, locZ: number, tag: string) {
    // For client side
    witherator.setProperty('rza:fire', true);
    witherator.dimension.playSound('mob.wither.shoot', location, { volume: 3 });

    // Determine the type of skull to fire based on a random danger chance
    const dangerChance = Math.floor(Math.random() * 101);
    const skullType = dangerChance <= DANGER_CHANCE_THRESHOLD ? 'rza:witherator_skull_dangerous' : 'rza:witherator_skull';

    // Define the positions where the skulls will be spawned
    const skullPositions: Vector3[] = [
        { x: locX, y: locY + 1.75, z: locZ + 0.37 },
        { x: locX, y: locY + 1.75, z: locZ + 0.75 },
        { x: locX + 0.37, y: locY + 1.75, z: locZ },
        { x: locX + 0.75, y: locY + 1.75, z: locZ },
        { x: locX, y: locY + 1.75, z: locZ - 0.37 },
        { x: locX, y: locY + 1.75, z: locZ - 0.75 },
        { x: locX - 0.37, y: locY + 1.75, z: locZ },
        { x: locX - 0.75, y: locY + 1.75, z: locZ }
    ];

    // Spawn skulls at the defined positions
    skullPositions.forEach(pos => {
        const skull = witherator.dimension.spawnEntity(skullType, pos);
        const randomSpeedUpward = Math.random() * (1.6 - 1.4) + 1.4; // Random upward speed between 1.4 and 1.6

        // Add tags to the skull for identification. The purpose of this is for each turret to only control its own skulls to avoid performance issues
        skull.addTag(`owner_${witherator.id}`);
        skull.addTag(`${tag}`);

        // Shoot the skull upwards
        (skull.getComponent(EntityComponentTypes.Projectile) as EntityProjectileComponent).shoot({ x: 0, y: randomSpeedUpward, z: 0 }, { uncertainty: 0 });
    });

    // Set a delay to reset the witherator's fire property to false after 1 tick (For client firing animation)
    let shootDelay = system.runTimeout(() => {
        witherator.setProperty('rza:fire', false);
        system.clearRun(shootDelay);
    }, 1);
    return;
}

// Generalized function to track and target zombies
function trackTargetAll(witherator: Entity, skull: Entity, family: string, prioritizeMutants: boolean) {
    const id = skull.id;
    const location = skull.location;

    // Check if there is already a targeted zombie
    const targetZombie = witherator.dimension.getEntities({ location: location, tags: [`witherator_skull_${id}`], maxDistance: MAX_SKULL_DISTANCE })[0];
    if (targetZombie) {
        shootSkull(skull, targetZombie, 0.9);
        return;
    }

    // Get all possible zombie targets within a 96-block radius
    const filterablePossibleTargets = witherator.dimension.getEntities({ location: location, families: [`zombie`, `${family}`], closest: MAX_SKULL_TARGETS, maxDistance: MAX_SKULL_DISTANCE });
    const filterablePossibleTargetsOther = witherator.dimension.getEntities({ location: location, families: ['zombie'], excludeFamilies: [`${family}`], closest: MAX_SKULL_TARGETS, maxDistance: MAX_SKULL_DISTANCE });

    // Filter out zombies with tags that start with 'witherator_skull_'
    const possibleTargets = filterablePossibleTargets.filter(zombie =>
        !zombie.getTags().some(tag => tag.startsWith('witherator_skull_'))
    );
    const possibleTargetsOther = filterablePossibleTargetsOther.filter(zombie =>
        !zombie.getTags().some(tag => tag.startsWith('witherator_skull_'))
    );

    // Get the trackable property of the skull
    let trackable = skull.getProperty('rza:trackable') as number;
    if (trackable > 0) {
        skull.setProperty('rza:trackable', Math.max(0, trackable - 1));
        return;
    }

    // Check if the skull already has a target
    let target = skullTargetMap.get(id);
    if (target && possibleTargets.includes(target)) {
        shootSkull(skull, target, 0.9);
        return;
    }

    // Function to find targetable zombie based on prioritization and family
    const findTargetableZombie = (targets: Entity[]) => {
        return targets.find(zombie => {
            const tags = zombie.getTags();
            const familyType = (zombie.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily(family);
            const hasTargetTag = tags.some(tag => tag.startsWith('witherator_skull_'));
            const isMutated = zombie.getProperty('rza:mutated') as boolean;
            const isFamilyMatch = family === 'all' || familyType;
            return prioritizeMutants ? (isMutated && !hasTargetTag && isFamilyMatch) : (!isMutated && !hasTargetTag && isFamilyMatch);
        });
    };

    // Find the first targetable zombie based on prioritization and family
    let targetableZombie = findTargetableZombie(possibleTargets);

    // If no targetable zombie found in possibleTargets, check possibleTargetsOther
    if (!targetableZombie) {
        targetableZombie = findTargetableZombie(possibleTargetsOther);
    }

    // Find the first targetable zombie of the opposite type if no prioritized type is found
    const findOppositeTypeZombie = (targets: Entity[]) => {
        return targets.find(zombie => {
            const tags = zombie.getTags();
            const familyType = (zombie.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily(family);
            const hasTargetTag = tags.some(tag => tag.startsWith('witherator_skull_'));
            const isMutated = zombie.getProperty('rza:mutated') as boolean;
            const isFamilyMatch = family === 'all' || familyType;
            return prioritizeMutants ? (!isMutated && !hasTargetTag && isFamilyMatch) : (isMutated && !hasTargetTag && isFamilyMatch);
        });
    };
    
    let oppositeTypeZombie = !targetableZombie ? findOppositeTypeZombie(possibleTargets) : null;

    if (!oppositeTypeZombie) {
        oppositeTypeZombie = findOppositeTypeZombie(possibleTargetsOther);
    }

    // Find the final first mutated targetable zombie if no prioritized family is found
    const findFinalTargetableZombieType = (targets: Entity[]) => {
        return targets.find(zombie => {
            const tags = zombie.getTags();
            const familyType = (zombie.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily(family);
            const hasTargetTag = tags.some(tag => tag.startsWith('witherator_skull_'));
            const isMutated = zombie.getProperty('rza:mutated') as boolean;
            const isFamilyMatch = familyType;
            return prioritizeMutants ? (isMutated && !hasTargetTag && !isFamilyMatch) : (!isMutated && !hasTargetTag && !isFamilyMatch);
        });
    };

    let finalTargetableZombieType = !targetableZombie ? findFinalTargetableZombieType(possibleTargets) : null;

    if (!finalTargetableZombieType) {
        finalTargetableZombieType = findFinalTargetableZombieType(possibleTargetsOther);
    }

    // Find the final first non-mutated targetable zombie if no prioritized family is found
    const findFinalOppositeTargetableZombieType = (targets: Entity[]) => {
        return targets.find(zombie => {
            const tags = zombie.getTags();
            const familyType = (zombie.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily(family);
            const hasTargetTag = tags.some(tag => tag.startsWith('witherator_skull_'));
            const isMutated = zombie.getProperty('rza:mutated') as boolean;
            const isFamilyMatch = familyType;
            return prioritizeMutants ? (!isMutated && !hasTargetTag && !isFamilyMatch) : (isMutated && !hasTargetTag && !isFamilyMatch);
        });
    };

    let finalOppositeTargetableZombieType = !targetableZombie ? findFinalOppositeTargetableZombieType(possibleTargets) : null;

    if (!finalOppositeTargetableZombieType) {
        finalOppositeTargetableZombieType = findFinalOppositeTargetableZombieType(possibleTargetsOther);
    }

    // Find the nearest tagged zombie if no targetable zombie is found
    // (Target zombies that are already targeted by other skulls)
    const findNearestTaggedZombie = (targets: Entity[]) => {
        interface NearestZombie {
            zombie: Entity | null;
            distance: number;
        }
        return targets.reduce<NearestZombie>((nearest, zombie) => {
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

    // Tag the targetable zombie if found and set it as its target for the next tick runs
    // until it hits its target (Lock target while it's still valid)
    const finalTargetableZombie = targetableZombie || oppositeTypeZombie || finalTargetableZombieType || finalOppositeTargetableZombieType;
    if (finalTargetableZombie) {
        finalTargetableZombie.addTag(`witherator_skull_${id}`);
        skullTargetMap.set(id, finalTargetableZombie);
    }

    // Select the target: prioritized type, then targetable, then nearest tagged zombie, then any possible target
    const selectedTarget = targetableZombie ?? oppositeTypeZombie ?? finalTargetableZombieType ?? finalOppositeTargetableZombieType ?? nearestTaggedZombie;
    target = selectedTarget === null ? undefined : selectedTarget;
    if (target) {
        shootSkull(skull, target, targetableZombie ? 0.9 : 1.2);
        return;
    } else {
        // Check if the skull already has a target
        let target = skullTargetMap.get(id);
        if (target && possibleTargets.includes(target)) {
            shootSkull(skull, target, 0.9);
            return;
        }
        else {
            const targetZombie = witherator.dimension.getEntities({ location: location, families: [`zombie`], closest: 1, maxDistance: MAX_SKULL_DISTANCE })[0];
            if (targetZombie) {
                skullTargetMap.set(id, targetZombie)
                shootSkull(skull, targetZombie, 0.9);
                return;
            }
            else skull.remove();
        }
    }
    return;
}

// General function to shoot and rotate a skull at a target
function shootSkull(skull: Entity, target: Entity, speed: number) {
    const direction = calculateDirection(skull.location, target.location, speed);
    const skullLocation = skull.location;
    const targetLocation = target.location;
    faceDirection(skull, skullLocation, targetLocation);
    (skull.getComponent(EntityComponentTypes.Projectile) as EntityProjectileComponent).shoot(direction, { uncertainty: 0 });
    return;
}

function getDistance(loc1: Vector3, loc2: Vector3): number {
    return Math.sqrt(
        (loc1.x - loc2.x) ** 2 +
        (loc1.y - loc2.y) ** 2 +
        (loc1.z - loc2.z) ** 2
    );
}

// Used to calculate the direction of the skull projectile with a configurable speed factor
function calculateDirection(from: Vector3, to: Vector3, speedFactor: number): Vector3 {
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

// Explosion knockback effect for zombies hit by a skull
function applyShockwaveEffect(zombie: Entity, location: Vector3, hStrength: number, vStrength: number) {
    const zombieLocation = zombie.location;
    const direction = {
        x: zombieLocation.x - location.x,
        y: zombieLocation.y - location.y,
        z: zombieLocation.z - location.z
    };

    const magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);

    if (magnitude > 0) {
        zombie.applyKnockback(
            direction.x / magnitude, // directionX
            direction.z / magnitude, // directionZ
            hStrength,         // horizontalStrength
            vStrength // verticalStrength
        );
    }
    return;
}

// General function to handle the skull hit event
export function witheratorSkullHit(skull: Entity, id: string) {
    try {
        const location = skull.location;
        const type = skull.typeId;

        // Check the type of skull to determine the effect
        if (type === 'rza:witherator_skull') {
            const radius = 2; // Radius for the shockwave effect

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

        // Handle the dangerous skull effect
        else {
            const radius = 4; // Radius for the shockwave effect

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
    } catch (error) { }
    // Remove the skull from the target map to avoid memory leaks
    skullTargetMap.delete(id);
    return;
}