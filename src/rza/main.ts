import { Entity, EntityComponentTypes, EntityEquippableComponent, EntityTypeFamilyComponent, EquipmentSlot, system, world } from "@minecraft/server";
import "./player/playerSetup";
import { arrowTurretConfigurator, pulsarSystemConfigurator, pyroChargerConfigurator, sonicCannonConfigurator, stormWeaverConfigurator } from "./turrets/targetConfig";
import { collectorDroneConfigurator, collectorDroneDie, collectorDroneHopperPairing, collectorDroneOwnerPairing, collectorDroneOwnerRepair, collectorDroneUnload, ownerCollectorDroneCounter, collectorDroneMechanics } from "./drones/collectorDrone/mechanics";
import { collectorDroneRemote } from "./drones/collectorDrone/remote";
import { sonicCannonAttachmentHit, sonicCannonHit } from "./turrets/sonicCannon";
import { stormWeaverhit } from "./turrets/stormWeaver";
import { pyroChargerFireball } from "./turrets/pyroCharger";
import { activateInactiveElectronReactorCore, activeElectronReactorCore, destroyActiveElectronReactorCore, placeActiveElectronReactorCore } from "./blocks/electronReactorCore";
import { ferralLeap } from "./zombies/feral";
import { pulsarSystemMechanics, pulsarSystems } from "./turrets/pulsarSystem";
import { repairArrays, repairArrayMechanics } from "./turrets/repairArray";
import { meleeWeaponCooldown, nonPlayerMeleeWeaponAttack, playerMeleeWeaponAttack } from "./weapons/melee";

let worldAgeOffset = 0;

//World Initialization / global scoreboards for the base game mechanics of the add-on
world.afterEvents.worldInitialize.subscribe(() => {
    const mutatedZombies = world.scoreboard.getObjective('mutated_zombies');
    const maxDrones = world.scoreboard.getObjective('max_drones');
    const sonicRange = world.scoreboard.getObjective('sonic_range');
    const lightningChain = world.scoreboard.getObjective('lightning_chain');
    const lightningBranch = world.scoreboard.getObjective('lightning_branch');
    const lightningChainLength = world.scoreboard.getObjective('lightning_chain_length');
    const lightningBranchLength = world.scoreboard.getObjective('lightning_branch_length');
    const removeChainerTagDelay = world.scoreboard.getObjective('remove_chainer_tag_delay');
    const repairDistance = world.scoreboard.getObjective('repair_distance');
    const commandBlocksEnabled = world.gameRules.commandBlocksEnabled;
    const commandBlockOutput = world.gameRules.commandBlockOutput;

    if (mutatedZombies == undefined) world.scoreboard.addObjective('mutated_zombies').addScore('main', 0);
    if (maxDrones === undefined) world.scoreboard.addObjective('max_drones');
    if (sonicRange == undefined) world.scoreboard.addObjective('sonic_range');
    if (lightningChain == undefined) world.scoreboard.addObjective('lightning_chain');
    if (lightningBranch == undefined) world.scoreboard.addObjective('lightning_branch');
    if (lightningChainLength == undefined) world.scoreboard.addObjective('lightning_chain_length');
    if (lightningBranchLength == undefined) world.scoreboard.addObjective('lightning_branch_length');
    if (removeChainerTagDelay == undefined) world.scoreboard.addObjective('remove_chainer_tag_delay');
    if (repairDistance == undefined) world.scoreboard.addObjective('repair_distance');
    if (!commandBlocksEnabled) world.getDimension('overworld').runCommand('gamerule commandblocksenabled true');
    if (!commandBlockOutput) world.getDimension('overworld').runCommand('gamerule commandblockoutput false');
});

world.afterEvents.playerPlaceBlock.subscribe((data) => {
    const block = data.block;

    //Initiate active electron reactor core data on placement
    if (block.permutation.matches('rza:active_electron_reactor_core')) {
        let run = system.run(() => {
            placeActiveElectronReactorCore(block);
            system.clearRun(run);
        });
    }
}, { blockTypes: ['rza:active_electron_reactor_core'] });

world.afterEvents.playerBreakBlock.subscribe((data) => {
    const blockPermutation = data.brokenBlockPermutation;
    const block = data.block

    //delete active electron reactore core data on break
    if (blockPermutation?.matches('rza:active_electron_reactor_core')) {
        let run = system.run(() => {
            destroyActiveElectronReactorCore(block);
            system.clearRun(run);
        })
    }
}, { blockTypes: ['rza:active_electron_reactor_core'] });

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
    const entityId = entity.typeId;
    //Collector Drone and player owner pairing
    if (entity.typeId === 'rza:collector_drone') {
        const drone = entity;
        const playerOwner = drone.dimension.getPlayers({ closest: 1, location: drone.location })[0];
        let run = system.run(() => {
            collectorDroneOwnerPairing(drone, playerOwner);
            system.clearRun(run);
        });
    }

    //Player and hopper pairing for drone delivery
    if (entity.typeId === 'minecraft:hopper_minecart') {
        const hopper = entity;
        const playerOwner = hopper.dimension.getPlayers({ closest: 1, location: hopper.location })[0];
        let run = system.run(() => {
            collectorDroneHopperPairing(hopper, playerOwner);
            system.clearRun(run);
        });
    }

    //Electron core activator for storm weaver turret
    if (entity?.typeId === 'minecraft:lightning_bolt') {
        const blockHit = entity.dimension.getBlock(entity.location);

        if (blockHit.permutation?.matches('minecraft:lightning_rod')) {
            let run = system.run(() => {
                activateInactiveElectronReactorCore(blockHit);
                system.clearRun(run);
            });
        }
    }

    //Pulsar System mechanics mapper
    if (entity?.typeId === 'rza:pulsar_system') {
        pulsarSystems["rza:cooldown"].set(entity.id, 600);
        pulsarSystems["rza:fire_time"].set(entity.id, 0);
        pulsarSystems["rza:pulse_radius_offset"].set(entity.id, 0);
    }

    //Repair Array random cooldown times (max=40 ticks)
    if (entity?.typeId === 'rza:repair_array') {
        //Randomize cooldown time
        repairArrays["rza:cooldown"].set(entity.id, Math.floor(Math.random() * (40 - 0 + 1)) + 0);
    }

    //Entities wielding axes and swords
    if (entityId == 'minecraft:pillager' || entityId == 'minecraft:vindicator') {
        if (!meleeWeaponCooldown.has(entity.id)) meleeWeaponCooldown.set(entity.id, 0);
    }
});

//General entity Load listener
world.afterEvents.entityLoad.subscribe((data) => {
    const entity = data.entity;
    const entityId = entity.typeId;

    //Re-pair drone and owner on world reload
    if (entity?.typeId === 'rza:collector_drone') {
        const drone = entity;
        let run = system.runTimeout(() => {
            collectorDroneOwnerRepair(drone);
            system.clearRun(run);
        }, 60);
    }

    //Pulsar System mechanics mapper
    if (entity?.typeId === 'rza:pulsar_system') {
        //Randomize cooldown time
        pulsarSystems["rza:cooldown"].set(entity.id, Math.floor(Math.random() * (600 - 100 + 1)) + 100);
        pulsarSystems["rza:fire_time"].set(entity.id, 0);
        pulsarSystems["rza:pulse_radius_offset"].set(entity.id, 0);
    }

    //Repair Array random cooldown times (max=40 ticks)
    if (entity?.typeId === 'rza:repair_array') {
        //Randomize cooldown time
        repairArrays["rza:cooldown"].set(entity.id, Math.floor(Math.random() * (40 - 0 + 1)) + 0);
    }

    //Entities wielding axes and swords
    if (entityId == 'minecraft:pillager' || entityId == 'minecraft:vindicator') {
        if (!meleeWeaponCooldown.has(entity.id)) meleeWeaponCooldown.set(entity.id, 0);
    }
});

//General entity unload listener
world.afterEvents.entityRemove.subscribe((data) => {
    const entityType = data.typeId;
    const entityId = data.removedEntityId;

    if (entityType === 'rza:collector_drone') {
        let run = system.run(() => {
            collectorDroneUnload(entityId);
            system.clearRun(run);
        });
    }
});

//General Entity Die Event Listener
world.afterEvents.entityDie.subscribe((data) => {
    const entity = data.deadEntity;

    //Reduce the player's drone count when one of their drones get destroyed
    if (entity?.matches({ type: 'rza:collector_drone' })) {
        const drone = entity;
        const playerOwner = drone.dimension.getPlayers({ closest: 1, location: drone.location, tags: [`${drone.id}_owner`] })[0];
        let run = system.run(() => {
            collectorDroneDie(drone, playerOwner);
            system.clearRun(run);
        });
    }
}, { entityTypes: ['rza:collector_drone'] });

//General Entity Hurt Listener (Non-melee attacks)
world.afterEvents.entityHurt.subscribe((data) => {
    const entity = data.hurtEntity;
    const source = data.damageSource.damagingEntity;
    const isZombie = entity.hasComponent(EntityComponentTypes.TypeFamily) && (entity.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('zombie');

    //From sonic cannon
    if (source?.typeId === 'rza:sonic_cannon' && isZombie) {
        let run = system.run(() => {
            sonicCannonHit(entity, source);
            system.clearRun(run);
        });
    }

    //From sonic cannon attachment
    if (source?.typeId === 'rza:sonic_cannon_attachment' && isZombie) {
        let run = system.run(() => {
            sonicCannonAttachmentHit(entity, source);
            system.clearRun(run);
        });
    }

    //From storm weaver
    if (source?.typeId === 'rza:storm_weaver' && isZombie) {
        let run = system.run(() => {
            stormWeaverhit(entity, source);
            system.clearRun(run);
        });
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

            if ((weapon?.typeId.endsWith('axe') || weapon?.typeId.endsWith('sword'))) {
                let run = system.run(() => {
                    playerMeleeWeaponAttack(entity, source);
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

    //General configurator
    if (event === 'rza:configure') {
        //Turret Configurator
        const isTurret = entity.hasComponent(EntityComponentTypes.TypeFamily) && (entity.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('turret');
        if (isTurret) {
            let turret = entity;
            const configurator = turret.dimension.getPlayers({ closest: 1, location: turret.location });
            let player = configurator[0];

            //Arrow Turret Configurator
            if (turret?.typeId === 'rza:arrow_turret') {
                let confArrowTurret = system.run(() => {
                    arrowTurretConfigurator(player, turret);
                    system.clearRun(confArrowTurret);
                });
            }

            //Pyro Charger Configurator
            if (turret?.typeId === 'rza:pyro_charger') {
                let confPyroCharger = system.run(() => {
                    pyroChargerConfigurator(player, turret);
                    system.clearRun(confPyroCharger);
                });
            }

            //Sonic Cannon Configurator
            if (turret?.typeId === 'rza:sonic_cannon') {
                let confSonicCannon = system.run(() => {
                    sonicCannonConfigurator(player, turret);
                    system.clearRun(confSonicCannon);
                });
            }

            //Storm Weaver Configurator
            if (turret?.typeId === 'rza:storm_weaver') {
                let confStormWeaver = system.run(() => {
                    stormWeaverConfigurator(player, turret);
                    system.clearRun(confStormWeaver);
                });
            }

            //Pulsar System Configurator
            if (turret?.typeId === 'rza:pulsar_system') {
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
}, { eventTypes: ['rza:configure', 'rza:leap'] });

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

            if (worldAge == 30) {
                world.getDimension('overworld').runCommand(`title @a title Day §4${worldAge}§r`);
                world.getDimension('nether').runCommand(`title @a title Day §4${worldAge}§r`);
                world.getDimension('the_end').runCommand(`title @a title Day §4${worldAge}§r`);
                world.sendMessage('§cWarning! zombies will now  be able to mutate!§r');
                world.sendMessage(`Current Day: Day §4${worldAge}§r`);
                world.scoreboard.getObjective('mutated_zombies').setScore('main', 1);
            }

            if (worldAge >= 30) {
                world.scoreboard.getObjective('mutated_zombies').setScore('main', 1);
            }
        }

        //MAIN ENTITY FEATURES
        //Overworld
        world.getDimension('overworld').getEntities().forEach(entity => {
            mainEntityFeatures(entity);
        });
        world.getDimension('nether').getEntities().forEach(entity => {
            mainEntityFeatures(entity);
        });
        world.getDimension('the_end').getEntities().forEach(entity => {
            mainEntityFeatures(entity);
        });

        //MAIN BLOCK FEATURES
        //Placed active electron reactor core particle effects
        let runElectronReactorCore = system.run(() => {
            activeElectronReactorCore();
            system.clearRun(runElectronReactorCore);
        });
    });
}, 200);

function mainEntityFeatures(entity: Entity) {
    //Pyro Charger Fireball
    if (entity.typeId == 'rza:pyro_charger_fireball') {
        let run = system.run(() => {
            pyroChargerFireball(entity);
            system.clearRun(run);
        });
    }

    //Collector Drone
    if (entity.typeId == 'rza:collector_drone') {
        let run = system.run(() => {
            collectorDroneMechanics(entity);
            system.clearRun(run);
        });
    }

    //Pulsar System
    if (entity.typeId == 'rza:pulsar_system') {
        let run = system.run(() => {
            pulsarSystemMechanics(entity);
            system.clearRun(run);
        });
    }

    //Repair Array
    if (entity.typeId == 'rza:repair_array') {
        let run = system.run(() => {
            repairArrayMechanics(entity);
            system.clearRun(run);
        });
    }
}