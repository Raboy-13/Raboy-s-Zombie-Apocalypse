import { Entity, EntityComponentTypes, EntityEquippableComponent, EntityTypeFamilyComponent, EquipmentSlot, system, world } from "@minecraft/server";
import "./player/playerSetup";
import { pulsarSystemConfigurator, turretConfigurator } from "./turrets/targetConfig";
import { collectorDroneConfigurator, collectorDroneDie, collectorDroneHopperPairing, collectorDroneOwnerPairing, collectorDroneOwnerRepair, collectorDroneUnload, ownerCollectorDroneCounter, collectorDroneMechanics } from "./drones/collectorDrone/mechanics";
import { collectorDroneRemote } from "./drones/collectorDrone/remote";
import { sonicCannonHit } from "./turrets/sonicCannon";
import { stormWeaverLightning, stormWeavers, cleanupStormWeaver, restoreChainedZombies } from "./turrets/stormWeaver";
import { pyroChargerFireball } from "./turrets/pyroCharger";
import { activateInactiveElectronReactorCore } from "./blocks/electronReactorCore";
import { ferralLeap } from "./zombies/feral";
import { pulsarSystemMechanics, pulsarSystems } from "./turrets/pulsarSystem";
import { repairArrayMechanics, repairArrayCooldown } from "./turrets/repairArray";
import { meleeWeaponCooldown, nonPlayerMeleeWeaponAttack, playerMeleeWeaponAttack } from "./weapons/melee";
import { fixedLenRaycast } from "./turrets/raycast";
import { witheratorMechanics, witheratorSkullHit } from "./turrets/witherator";
import { setEntityToCardinalDirection } from "./other/entityCardinalFacing";
import { alphaZombieMechanics } from "./zombies/alpha";
import { blockFeatures } from "./blocks/blocks";
import { spitterAcidPuddleEffect, cleanupAcidPuddleCooldown } from "./zombies/spitter";

let worldAgeOffset = 0;
const dimensions = ['overworld', 'nether', 'the_end'].map(name => world.getDimension(name));

//World Initialization / global scoreboards for the base game mechanics of the add-on
world.afterEvents.worldInitialize.subscribe(() => {
    const mutatedZombies = world.scoreboard.getObjective('mutated_zombies');
    const maxDrones = world.scoreboard.getObjective('max_drones');
    const commandBlocksEnabled = world.gameRules.commandBlocksEnabled;
    const commandBlockOutput = world.gameRules.commandBlockOutput;

    if (mutatedZombies == undefined) world.scoreboard.addObjective('mutated_zombies').addScore('main', 0);
    if (maxDrones === undefined) world.scoreboard.addObjective('max_drones');
    if (!commandBlocksEnabled) world.getDimension('overworld').runCommand('gamerule commandblocksenabled true');
    if (commandBlockOutput) world.getDimension('overworld').runCommand('gamerule commandblockoutput false');
});

//Custom components registration
world.beforeEvents.worldInitialize.subscribe(data => {
    data.blockComponentRegistry.registerCustomComponent('rza:emit_particles', {
        onTick: (data) => {
            const block = data.block;
            const blockTypeId = block.type.id;

            blockFeatures(block, blockTypeId);
        }
    });
});

world.afterEvents.itemUseOn.subscribe((data) => {
    const item = data.itemStack.typeId;
    const player = data.source;

    //Player collector drone counter
    if (item === 'rza:collector_drone_item') {
        let run = system.run(() => {
            ownerCollectorDroneCounter(player);
            system.clearRun(run);
        });
    }
});

//General player item use event listener
world.afterEvents.itemUse.subscribe((data) => {
    const item = data.itemStack;
    const player = data.source;

    //Collector Drone Remote listener
    if (item?.typeId === 'rza:collector_drone_remote') {
        let run = system.run(() => {
            collectorDroneRemote(player);
            system.clearRun(run);
        });
    }
})

//General entity spawn event listener
world.afterEvents.entitySpawn.subscribe((data) => {
    const entity = data.entity;
    const entityType = entity.typeId;
    const entityId = entity.id;
    //Collector Drone and player owner pairing
    if (entityType === 'rza:collector_drone') {
        const drone = entity;
        const playerOwner = drone.dimension.getPlayers({ closest: 1, location: drone.location })[0];
        if (playerOwner) {
            let run = system.run(() => {
                collectorDroneOwnerPairing(drone, playerOwner);
                system.clearRun(run);
            });
        }
    }

    //Player and hopper pairing for drone delivery
    if (entityType === 'minecraft:hopper_minecart') {
        const hopper = entity;
        const playerOwner = hopper.dimension.getPlayers({ closest: 1, location: hopper.location })[0];
        if (playerOwner) {
            let run = system.run(() => {
                collectorDroneHopperPairing(hopper, playerOwner);
                system.clearRun(run);
            });
        }
    }

    //Electron core activator for storm weaver turret
    if (entityType === 'minecraft:lightning_bolt') {
        const blockHit = entity.dimension.getBlock(entity.location);

        if (blockHit && blockHit.permutation?.matches('minecraft:lightning_rod')) {
            let run = system.run(() => {
                activateInactiveElectronReactorCore(blockHit);
                system.clearRun(run);
            });
        }
    }

    //Storm Weaver lightning strike
    if (entityType === 'rza:storm_weaver') {
        //Randomize cooldown time
        stormWeavers["rza:chain_length"].set(entityId, 10);
    }

    //Pulsar System mechanics mapper
    if (entityType === 'rza:pulsar_system') {
        pulsarSystems["rza:cooldown"].set(entityId, 600);
        pulsarSystems["rza:fire_time"].set(entityId, 0);
        pulsarSystems["rza:pulse_radius_offset"].set(entityId, 0);
    }

    //Repair Array random cooldown times (max=40 ticks)
    if (entityType === 'rza:repair_array') {
        //Randomize cooldown time
        repairArrayCooldown.set(entityId, Math.floor(Math.random() * (40 - 0 + 1)) + 0);
    }

    //Entities wielding axes and swords
    if (entityType == 'minecraft:pillager' || entityType == 'minecraft:vindicator') {
        if (!meleeWeaponCooldown.has(entityId)) meleeWeaponCooldown.set(entityId, 0);
    }

    //Witherator turret | Set rotation to the nearest cardinal direction
    if (entityType === 'rza:witherator') setEntityToCardinalDirection(entity);

    //Transform mobs into zombies
    if (entityType === 'minecraft:creeper' || entityType === 'minecraft:drowned' ||
        entityType === 'minecraft:enderman' || entityType === 'minecraft:husk' ||
        entityType === 'minecraft:skeleton' ||
        entityType === 'minecraft:spider' || entityType === 'minecraft:stray' ||
        entityType === 'minecraft:zombie') {
        try {
            // Spawn the walker zombie at the entity's location 
            entity.dimension.spawnEntity("rza:walker", entity.location);

            // Remove the original entity
            entity.remove();
        } catch (e) { }
    }
    else if (entityType === 'minecraft:witch') {
        try {
            // Spawn the feral zombie at the entity's location
            entity.dimension.spawnEntity("rza:feral", entity.location);

            // Remove the original entity
            entity.remove();
        } catch (e) { }
    }

    // Disable phantoms
    else if (entityType === 'minecraft:phantom') {
        try {
            // Instantly despawn the phantom
            entity.remove();
        } catch (e) { }
    }
});

//General entity Load listener
world.afterEvents.entityLoad.subscribe((data) => {
    const entity = data.entity;
    const entityType = entity.typeId;
    const entityId = entity.id;

    //Re-pair drone and owner on world reload
    if (entity?.typeId === 'rza:collector_drone') {
        const drone = entity;
        let run = system.runTimeout(() => {
            collectorDroneOwnerRepair(drone);
            system.clearRun(run);
        }, 60);
    }

    //Storm Weaver lightning strike and restore chained zombies
    if (entityType === 'rza:storm_weaver') {
        //Randomize cooldown time
        stormWeavers["rza:chain_length"].set(entityId, 10);
        
        // Restore any chained zombies from previous session
        let run = system.runTimeout(() => {
            restoreChainedZombies(entity);
            system.clearRun(run);
        }, 80); // Small delay to ensure entities are loaded
    }

    //Pulsar System mechanics mapper
    if (entityType === 'rza:pulsar_system') {
        //Randomize cooldown time
        pulsarSystems["rza:cooldown"].set(entityId, Math.floor(Math.random() * (600 - 100 + 1)) + 100);
        pulsarSystems["rza:fire_time"].set(entityId, 0);
        pulsarSystems["rza:pulse_radius_offset"].set(entityId, 0);
    }

    //Repair Array random cooldown times (max=40 ticks)
    if (entityType === 'rza:repair_array') {
        //Randomize cooldown time
        repairArrayCooldown.set(entityId, Math.floor(Math.random() * (40 - 0 + 1)) + 0);
    }

    //Entities wielding axes and swords
    if (entityType == 'minecraft:pillager' || entityType == 'minecraft:vindicator') {
        if (!meleeWeaponCooldown.has(entityId)) meleeWeaponCooldown.set(entityId, 0);
    }
});

// Add beforeEvent listener for entity removal
world.beforeEvents.entityRemove.subscribe((data) => {
    const removedEntity = data.removedEntity;
    
    // Storm Weaver unload cleanup - only if not already destroyed
    if (removedEntity.typeId === 'rza:storm_weaver' && !stormWeavers["rza:destroyed_weavers"].has(removedEntity.id)) {
        let run = system.run(() => {
            cleanupStormWeaver(removedEntity, true); // true = just unloading, preserve data
            system.clearRun(run);
        });
    }
    return;
});

// Modify existing afterEvent listener
world.afterEvents.entityRemove.subscribe((data) => {
    const entityType = data.typeId;
    const entityId = data.removedEntityId;

    if (entityType === 'rza:collector_drone') {
        let run = system.run(() => {
            collectorDroneUnload(entityId);
            system.clearRun(run);
        });
    }

    // Only clean up maps after entity is removed
    if (entityType === 'rza:storm_weaver') {
        stormWeavers["rza:destroyed_weavers"].delete(entityId);
        if (stormWeavers["rza:chain_length"].has(entityId)) {
            stormWeavers["rza:chain_length"].delete(entityId);
        }
        if (stormWeavers["rza:chained_zombies"].has(entityId)) {
            stormWeavers["rza:chained_zombies"].delete(entityId);
        }
    }

    //Pulsar System
    if (pulsarSystems["rza:cooldown"].has(entityId)) pulsarSystems["rza:cooldown"].delete(entityId);
    if (pulsarSystems["rza:fire_time"].has(entityId)) pulsarSystems["rza:fire_time"].delete(entityId);
    if (pulsarSystems["rza:pulse_radius_offset"].has(entityId)) pulsarSystems["rza:pulse_radius_offset"].delete(entityId);


    //Repair Array
    if (repairArrayCooldown.has(entityId)) repairArrayCooldown.delete(entityId);

    //Entities wielding axes and swords
    if (entityId == 'minecraft:pillager' || entityId == 'minecraft:vindicator') meleeWeaponCooldown.delete(entityId);

    // Cleanup acid puddle cooldowns
    if (entityType === 'rza:spitter_acid_puddle_normal' || entityType === 'rza:spitter_acid_puddle_mutated') {
        cleanupAcidPuddleCooldown(entityId);
    }
});

//General Entity Die Event Listener
world.afterEvents.entityDie.subscribe((data) => {
    const entity = data.deadEntity;

    //Reduce the player's drone count when one of their drones get destroyed
    try {
        if (entity?.matches({ type: 'rza:collector_drone' })) {
            const drone = entity;
            const playerOwner = drone.dimension.getPlayers({ closest: 1, location: drone.location, tags: [`${drone.id}_owner`] })[0];
            if (playerOwner) {
                let run = system.run(() => {
                    collectorDroneDie(drone, playerOwner);
                    system.clearRun(run);
                });
            }
        }
    } catch (error) { }
    
    // Storm Weaver death cleanup - clear everything
    if (entity?.typeId === 'rza:storm_weaver') {
        let run = system.run(() => {
            cleanupStormWeaver(entity, false); // false = entity is destroyed, clean up everything
            stormWeavers["rza:destroyed_weavers"].add(entity.id); // Track that this storm weaver was destroyed
            system.clearRun(run);
        });
    }
});

//General Entity Hurt Listener (Non-melee attacks)
world.afterEvents.entityHurt.subscribe((data) => {
    const entity = data.hurtEntity;
    const source = data.damageSource.damagingEntity;
    const sourceId = source?.typeId;
    const isZombie = entity.hasComponent(EntityComponentTypes.TypeFamily) && (entity.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('zombie');

    //From sonic cannon
    if (sourceId === 'rza:sonic_cannon' && isZombie && source) {
        let run = system.run(() => {
            sonicCannonHit(entity, source);
            system.clearRun(run);
        });
    }

    //From storm weaver
    if (sourceId === 'rza:storm_weaver' && isZombie && source) {
        let run = system.runTimeout(() => {
            stormWeaverLightning(entity, source);
            system.clearRun(run);
        }, 2);
    }
});

//General Entity Hurt Listener (Melee attacks)
world.afterEvents.entityHitEntity.subscribe((data) => {
    const entity = data.hitEntity;
    const source = data.damagingEntity;
    const sourceId = source.typeId;
    const isZombie = source.hasComponent(EntityComponentTypes.TypeFamily) && (source.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('zombie');

    if (!isZombie) {
        const cooldown = meleeWeaponCooldown.get(source.id);
        const isPlayer = sourceId == 'minecraft:player';
        const isNonPlayer = sourceId == 'minecraft:pillager' || sourceId == 'minecraft:vindicator';

        //Entities wielding axes and swords
        if (isPlayer && cooldown == 0) {
            const weapon = (source.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent).getEquipment(EquipmentSlot.Mainhand);

            if (weapon) {
                let run = system.run(() => {
                    playerMeleeWeaponAttack(entity, source, weapon);
                    system.clearRun(run);
                });
            }
        }
        else if (isNonPlayer && cooldown == 0) {
            let run = system.run(() => {
                nonPlayerMeleeWeaponAttack(entity, source);
                system.clearRun(run);
            });
        }
    }
})

//General entity event listener
world.afterEvents.dataDrivenEntityTrigger.subscribe((data) => {
    const event = data.eventId;
    const entity = data.entity;

    //Feral Leap/Headbutt
    if (event === 'rza:leap') {
        let run = system.run(() => {
            ferralLeap(entity);
            system.clearRun(run);
        });
    }

    //Sonic Cannon Sonic Charge
    if (event === 'rza:sonic_charge') {
        let run = system.run(() => {
            const dimension = entity.dimension;
            const location = entity.location;
            const direction = entity.getViewDirection();
            const startOffset = 1.5;
            fixedLenRaycast(entity, dimension, { x: location.x + direction.x * startOffset, y: location.y + 0.55 + direction.y * startOffset, z: location.z + direction.z * startOffset }, direction, 48, 'rza:sonic_charge');
            system.clearRun(run);
        });
    }

    //Storm Weaver Lightning Strike
    if (event === 'rza:lightning_strike') {
        let run = system.run(() => {
            const id = entity.id;
            const dimension = entity.dimension;
            const location = entity.location;
            const direction = entity.getViewDirection();
            const startOffset = 1.5;
            stormWeavers["rza:chain_length"].set(id, 16);
            fixedLenRaycast(entity, dimension, { x: location.x + direction.x * startOffset, y: location.y + 1 + direction.y * startOffset, z: location.z + direction.z * startOffset }, direction, 32, 'rza:lightning');
            system.clearRun(run);
        });
    }

    //Explode (Witherator skull & others)
    if (event === 'rza:explode') {
        let run = system.run(() => {
            const id = entity.id;
            stormWeavers["rza:chain_length"].set(id, 16);
            witheratorSkullHit(entity, id);
            system.clearRun(run);
        });
    }

    //Alpha Zombie
    if (event === 'rza:alpha_zombie_buff') {
        let run = system.run(() => {
            alphaZombieMechanics(entity);
            system.clearRun(run);
        });
    }

    //General configurator
    if (event === 'rza:configure') {
        //Turret Configurator
        const isTurret = entity.hasComponent(EntityComponentTypes.TypeFamily) && (entity.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('turret');
        if (isTurret) {
            const turret = entity;
            const turretType = turret.typeId;
            let turretName: string;
            const configurator = turret.dimension.getPlayers({ closest: 1, location: turret.location });
            let player = configurator[0];

            if (!player) return;

            //Arrow Turret Configurator
            if (turretType === 'rza:arrow_turret') {
                let confArrowTurret = system.run(() => {
                    turretName = '§2Arrow Turret§r';
                    turretConfigurator(player, turret, turretName);
                    system.clearRun(confArrowTurret);
                });
            }

            //Pyro Charger Configurator
            if (turretType === 'rza:pyro_charger') {
                let confPyroCharger = system.run(() => {
                    turretName = '§6Pyro Charger§r';
                    turretConfigurator(player, turret, turretName);
                    system.clearRun(confPyroCharger);
                });
            }

            //Sonic Cannon Configurator
            if (turretType === 'rza:sonic_cannon') {
                let confSonicCannon = system.run(() => {
                    turretName = '§5Sonic Cannon§r';
                    turretConfigurator(player, turret, turretName);
                    system.clearRun(confSonicCannon);
                });
            }

            //Storm Weaver Configurator
            if (turretType === 'rza:storm_weaver') {
                let confStormWeaver = system.run(() => {
                    turretName = '§cStorm Weaver§r';
                    turretConfigurator(player, turret, turretName);
                    system.clearRun(confStormWeaver);
                });
            }

            //Witherator Configurator
            if (turretType === 'rza:witherator') {
                let confWitherator = system.run(() => {
                    turretName = '§6Witherator§r';
                    turretConfigurator(player, turret, turretName);
                    system.clearRun(confWitherator);
                });
            }

            //Pulsar System Configurator
            if (turretType === 'rza:pulsar_system') {
                let confPulsarSystem = system.run(() => {
                    pulsarSystemConfigurator(player, turret);
                    system.clearRun(confPulsarSystem);
                });
            }
        }

        //Collector Drone Configurator
        if (entity.matches({ type: 'rza:collector_drone' })) {
            let run = system.run(() => {
                collectorDroneConfigurator(entity);
                system.clearRun(run);
            });
        }
    }
}, { eventTypes: ['rza:configure', 'rza:leap', 'rza:sonic_charge', 'rza:lightning_strike', 'rza:explode', 'rza:alpha_zombie_buff'] });

//Main Tick
system.runTimeout(() => {
    system.runInterval(() => {
        //Day counter
        let worldAge = world.getDay();

        if (worldAge > worldAgeOffset) {
            world.getDimension('overworld').runCommand(`title @a title Day §2${worldAge}§r`);
            world.getDimension('nether').runCommand(`title @a title Day §2${worldAge}§r`);
            world.getDimension('the_end').runCommand(`title @a title Day §2${worldAge}§r`);
            world.sendMessage(`Current Day: Day §2${worldAge}§r`);
            worldAgeOffset = worldAge;

            if (worldAge == 60) {
                world.getDimension('overworld').runCommand(`title @a title Day §4${worldAge}§r`);
                world.getDimension('nether').runCommand(`title @a title Day §4${worldAge}§r`);
                world.getDimension('the_end').runCommand(`title @a title Day §4${worldAge}§r`);
                world.sendMessage('§cWarning! zombies will now  be able to mutate!§r');
                world.sendMessage(`Current Day: Day §4${worldAge}§r`);
                const mutatedZombies = world.scoreboard.getObjective('mutated_zombies');
                if (mutatedZombies) mutatedZombies.setScore('main', 1);
            }

            if (worldAge >= 60) {
                const mutatedZombies = world.scoreboard.getObjective('mutated_zombies');
                if (mutatedZombies) mutatedZombies.setScore('main', 1);
            }
        }

        //MAIN ENTITY FEATURES
        dimensions.forEach(dimension => {
            const entities = dimension.getEntities();
            entities.forEach(entity => {
                mainEntityFeatures(entity);
            });
        });
    });
}, 200);

function mainEntityFeatures(entity: Entity) {
    const typeId = entity.typeId;
    //Pyro Charger Fireball
    if (typeId == 'rza:pyro_charger_fireball') {
        let run = system.run(() => {
            pyroChargerFireball(entity);
            system.clearRun(run);
        });
    }

    //Collector Drone
    if (typeId == 'rza:collector_drone') {
        let run = system.run(() => {
            collectorDroneMechanics(entity);
            system.clearRun(run);
        });
    }

    //Pulsar System
    if (typeId == 'rza:pulsar_system') {
        let run = system.run(() => {
            pulsarSystemMechanics(entity);
            system.clearRun(run);
        });
    }

    //Repair Array
    if (typeId == 'rza:repair_array') {
        let run = system.run(() => {
            repairArrayMechanics(entity);
            system.clearRun(run);
        });
    }

    //Witherator
    if (typeId == 'rza:witherator') {
        let run = system.run(() => {
            witheratorMechanics(entity);
            system.clearRun(run);
        });
    }

    //Spitter Acid Puddles
    if (typeId === 'rza:spitter_acid_puddle_normal' || typeId === 'rza:spitter_acid_puddle_mutated') {
        let run = system.run(() => {
            spitterAcidPuddleEffect(entity);
            system.clearRun(run);
        });
    }
}
