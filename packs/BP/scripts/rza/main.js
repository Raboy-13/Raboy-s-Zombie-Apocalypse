import { EntityComponentTypes, EquipmentSlot, system, world } from "@minecraft/server";
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
    if (mutatedZombies == undefined)
        world.scoreboard.addObjective('mutated_zombies').addScore('main', 0);
    if (maxDrones === undefined)
        world.scoreboard.addObjective('max_drones');
    if (sonicRange == undefined)
        world.scoreboard.addObjective('sonic_range');
    if (lightningChain == undefined)
        world.scoreboard.addObjective('lightning_chain');
    if (lightningBranch == undefined)
        world.scoreboard.addObjective('lightning_branch');
    if (lightningChainLength == undefined)
        world.scoreboard.addObjective('lightning_chain_length');
    if (lightningBranchLength == undefined)
        world.scoreboard.addObjective('lightning_branch_length');
    if (removeChainerTagDelay == undefined)
        world.scoreboard.addObjective('remove_chainer_tag_delay');
    if (repairDistance == undefined)
        world.scoreboard.addObjective('repair_distance');
    if (!commandBlocksEnabled)
        world.getDimension('overworld').runCommand('gamerule commandblocksenabled true');
    if (!commandBlockOutput)
        world.getDimension('overworld').runCommand('gamerule commandblockoutput false');
});
world.afterEvents.playerPlaceBlock.subscribe((data) => {
    const block = data.block;
    if (block.permutation.matches('rza:active_electron_reactor_core')) {
        let run = system.run(() => {
            placeActiveElectronReactorCore(block);
            system.clearRun(run);
        });
    }
}, { blockTypes: ['rza:active_electron_reactor_core'] });
world.afterEvents.playerBreakBlock.subscribe((data) => {
    const blockPermutation = data.brokenBlockPermutation;
    const block = data.block;
    if (blockPermutation?.matches('rza:active_electron_reactor_core')) {
        let run = system.run(() => {
            destroyActiveElectronReactorCore(block);
            system.clearRun(run);
        });
    }
}, { blockTypes: ['rza:active_electron_reactor_core'] });
world.afterEvents.itemUseOn.subscribe((data) => {
    const item = data.itemStack.typeId;
    const player = data.source;
    if (item === 'rza:collector_drone_item') {
        let run = system.run(() => {
            ownerCollectorDroneCounter(player);
            system.clearRun(run);
        });
    }
});
world.afterEvents.itemUse.subscribe((data) => {
    const item = data.itemStack;
    const player = data.source;
    if (item?.typeId === 'rza:collector_drone_remote') {
        let run = system.run(() => {
            collectorDroneRemote(player);
            system.clearRun(run);
        });
    }
});
world.afterEvents.entitySpawn.subscribe((data) => {
    const entity = data.entity;
    const entityId = entity.typeId;
    if (entity.typeId === 'rza:collector_drone') {
        const drone = entity;
        const playerOwner = drone.dimension.getPlayers({ closest: 1, location: drone.location })[0];
        let run = system.run(() => {
            collectorDroneOwnerPairing(drone, playerOwner);
            system.clearRun(run);
        });
    }
    if (entity.typeId === 'minecraft:hopper_minecart') {
        const hopper = entity;
        const playerOwner = hopper.dimension.getPlayers({ closest: 1, location: hopper.location })[0];
        let run = system.run(() => {
            collectorDroneHopperPairing(hopper, playerOwner);
            system.clearRun(run);
        });
    }
    if (entity?.typeId === 'minecraft:lightning_bolt') {
        const blockHit = entity.dimension.getBlock(entity.location);
        if (blockHit.permutation?.matches('minecraft:lightning_rod')) {
            let run = system.run(() => {
                activateInactiveElectronReactorCore(blockHit);
                system.clearRun(run);
            });
        }
    }
    if (entity?.typeId === 'rza:pulsar_system') {
        pulsarSystems["rza:cooldown"].set(entity.id, 600);
        pulsarSystems["rza:fire_time"].set(entity.id, 0);
        pulsarSystems["rza:pulse_radius_offset"].set(entity.id, 0);
    }
    if (entity?.typeId === 'rza:repair_array') {
        repairArrays["rza:cooldown"].set(entity.id, Math.floor(Math.random() * (40 - 0 + 1)) + 0);
    }
    if (entityId == 'minecraft:pillager' || entityId == 'minecraft:vindicator') {
        if (!meleeWeaponCooldown.has(entity.id))
            meleeWeaponCooldown.set(entity.id, 0);
    }
});
world.afterEvents.entityLoad.subscribe((data) => {
    const entity = data.entity;
    const entityId = entity.typeId;
    if (entity?.typeId === 'rza:collector_drone') {
        const drone = entity;
        let run = system.runTimeout(() => {
            collectorDroneOwnerRepair(drone);
            system.clearRun(run);
        }, 60);
    }
    if (entity?.typeId === 'rza:pulsar_system') {
        pulsarSystems["rza:cooldown"].set(entity.id, Math.floor(Math.random() * (600 - 100 + 1)) + 100);
        pulsarSystems["rza:fire_time"].set(entity.id, 0);
        pulsarSystems["rza:pulse_radius_offset"].set(entity.id, 0);
    }
    if (entity?.typeId === 'rza:repair_array') {
        repairArrays["rza:cooldown"].set(entity.id, Math.floor(Math.random() * (40 - 0 + 1)) + 0);
    }
    if (entityId == 'minecraft:pillager' || entityId == 'minecraft:vindicator') {
        if (!meleeWeaponCooldown.has(entity.id))
            meleeWeaponCooldown.set(entity.id, 0);
    }
});
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
world.afterEvents.entityDie.subscribe((data) => {
    const entity = data.deadEntity;
    if (entity?.matches({ type: 'rza:collector_drone' })) {
        const drone = entity;
        const playerOwner = drone.dimension.getPlayers({ closest: 1, location: drone.location, tags: [`${drone.id}_owner`] })[0];
        let run = system.run(() => {
            collectorDroneDie(drone, playerOwner);
            system.clearRun(run);
        });
    }
}, { entityTypes: ['rza:collector_drone'] });
world.afterEvents.entityHurt.subscribe((data) => {
    const entity = data.hurtEntity;
    const source = data.damageSource.damagingEntity;
    const isZombie = entity.hasComponent(EntityComponentTypes.TypeFamily) && entity.getComponent(EntityComponentTypes.TypeFamily).hasTypeFamily('zombie');
    if (source?.typeId === 'rza:sonic_cannon' && isZombie) {
        let run = system.run(() => {
            sonicCannonHit(entity, source);
            system.clearRun(run);
        });
    }
    if (source?.typeId === 'rza:sonic_cannon_attachment' && isZombie) {
        let run = system.run(() => {
            sonicCannonAttachmentHit(entity, source);
            system.clearRun(run);
        });
    }
    if (source?.typeId === 'rza:storm_weaver' && isZombie) {
        let run = system.run(() => {
            stormWeaverhit(entity, source);
            system.clearRun(run);
        });
    }
});
world.afterEvents.entityHitEntity.subscribe((data) => {
    const entity = data.hitEntity;
    const source = data.damagingEntity;
    const sourceId = source.typeId;
    const isZombie = source.hasComponent(EntityComponentTypes.TypeFamily) && source.getComponent(EntityComponentTypes.TypeFamily).hasTypeFamily('zombie');
    if (!isZombie) {
        const cooldown = meleeWeaponCooldown.get(source.id);
        const isPlayer = sourceId == 'minecraft:player';
        const isNonPlayer = sourceId == 'minecraft:pillager' || sourceId == 'minecraft:vindicator';
        if (isPlayer && cooldown == 0) {
            const weapon = source.getComponent(EntityComponentTypes.Equippable).getEquipment(EquipmentSlot.Mainhand);
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
});
world.afterEvents.dataDrivenEntityTrigger.subscribe((data) => {
    const event = data.eventId;
    const entity = data.entity;
    if (event === 'rza:leap') {
        let run = system.run(() => {
            ferralLeap(entity);
            system.clearRun(run);
        });
    }
    if (event === 'rza:configure') {
        const isTurret = entity.hasComponent(EntityComponentTypes.TypeFamily) && entity.getComponent(EntityComponentTypes.TypeFamily).hasTypeFamily('turret');
        if (isTurret) {
            let turret = entity;
            const configurator = turret.dimension.getPlayers({ closest: 1, location: turret.location });
            let player = configurator[0];
            if (turret?.typeId === 'rza:arrow_turret') {
                let confArrowTurret = system.run(() => {
                    arrowTurretConfigurator(player, turret);
                    system.clearRun(confArrowTurret);
                });
            }
            if (turret?.typeId === 'rza:pyro_charger') {
                let confPyroCharger = system.run(() => {
                    pyroChargerConfigurator(player, turret);
                    system.clearRun(confPyroCharger);
                });
            }
            if (turret?.typeId === 'rza:sonic_cannon') {
                let confSonicCannon = system.run(() => {
                    sonicCannonConfigurator(player, turret);
                    system.clearRun(confSonicCannon);
                });
            }
            if (turret?.typeId === 'rza:storm_weaver') {
                let confStormWeaver = system.run(() => {
                    stormWeaverConfigurator(player, turret);
                    system.clearRun(confStormWeaver);
                });
            }
            if (turret?.typeId === 'rza:pulsar_system') {
                let confPulsarSystem = system.run(() => {
                    pulsarSystemConfigurator(player, turret);
                    system.clearRun(confPulsarSystem);
                });
            }
        }
        if (entity.matches({ type: 'rza:collector_drone' })) {
            let run = system.run(() => {
                collectorDroneConfigurator(entity);
                system.clearRun(run);
            });
        }
    }
}, { eventTypes: ['rza:configure', 'rza:leap'] });
system.runTimeout(() => {
    system.runInterval(() => {
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
        world.getDimension('overworld').getEntities().forEach(entity => {
            mainEntityFeatures(entity);
        });
        world.getDimension('nether').getEntities().forEach(entity => {
            mainEntityFeatures(entity);
        });
        world.getDimension('the_end').getEntities().forEach(entity => {
            mainEntityFeatures(entity);
        });
        let runElectronReactorCore = system.run(() => {
            activeElectronReactorCore();
            system.clearRun(runElectronReactorCore);
        });
    });
}, 200);
function mainEntityFeatures(entity) {
    if (entity.typeId == 'rza:pyro_charger_fireball') {
        let run = system.run(() => {
            pyroChargerFireball(entity);
            system.clearRun(run);
        });
    }
    if (entity.typeId == 'rza:collector_drone') {
        let run = system.run(() => {
            collectorDroneMechanics(entity);
            system.clearRun(run);
        });
    }
    if (entity.typeId == 'rza:pulsar_system') {
        let run = system.run(() => {
            pulsarSystemMechanics(entity);
            system.clearRun(run);
        });
    }
    if (entity.typeId == 'rza:repair_array') {
        let run = system.run(() => {
            repairArrayMechanics(entity);
            system.clearRun(run);
        });
    }
}
