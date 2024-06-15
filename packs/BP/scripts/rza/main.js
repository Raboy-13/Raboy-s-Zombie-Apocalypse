import { system, world } from "@minecraft/server";
import "./player/playerSetup";
import { arrowTurretConfigurator, pyroChargerConfigurator, sonicCannonConfigurator, stormWeaverConfigurator } from "./turrets/targetConfig";
import { collectorDroneConfigurator, collectorDroneDie, collectorDroneHopperPairing, collectorDroneMechanics, collectorDroneOwnerPairing, collectorDroneOwnerRepair, collectorDroneUnload, ownerCollectorDroneCounter } from "./drones/collectorDrone/mechanics";
import { collectorDroneRemote } from "./drones/collectorDrone/remote";
import { sonicCannonAttachmentHit, sonicCannonHit } from "./turrets/sonicCannon";
import { stormWeaverhit } from "./turrets/stormWeaver";
import { pyroChargerFireball } from "./turrets/pyroCharger";
import { activateInactiveElectronReactorCore, activeElectronReactorCore, destroyActiveElectronReactorCore, placeActiveElectronReactorCore } from "./blocks/electronReactorCore";
import { ferralLeap } from "./zombies/feral";

let worldAgeOffset = 0;

world.afterEvents.worldInitialize.subscribe(() => {
    const maxDrones = world.scoreboard.getObjective('max_drones')
    if (maxDrones === undefined) world.scoreboard.addObjective('max_drones');
});

world.afterEvents.playerPlaceBlock.subscribe((data) => {
    const block = data.block;

    //Initiate active electron core reactor data on placement
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

    //delete active electron core reactor data on break
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
    if (item?.typeId === 'rza:drone_remote') {
        let run = system.run(() => {
            collectorDroneRemote(player);
            system.clearRun(run);
        });
    }
})

//General entity spawn event listener
world.afterEvents.entitySpawn.subscribe((data) => {
    const entity = data.entity;
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
            collectorDroneHopperPairing(drone, playerOwner);
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
});

//General entity Load listener
world.afterEvents.entityLoad.subscribe((data) => {
    const entity = data.entity;

    //Re-pair drone and owner on world reload
    if (entity?.typeId === 'rza:collector_drone') {
        const drone = entity;
        let run = system.run(() => {
            collectorDroneOwnerRepair(drone);
            system.clearRun(run);
        });
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

//Turret Mechanics
world.afterEvents.entityHurt.subscribe((data) => {
    const entity = data.hurtEntity;
    const source = data.damageSource.damagingEntity;

    if (source?.matches({ families: ['sonic_cannon'] })) {
        let run = system.run(() => {
            sonicCannonHit(entity, source);
            system.clearRun(run);
        });
    }

    if (source?.matches({ families: ['sonic_cannon_attachment'] })) {
        let run = system.run(() => {
            sonicCannonAttachmentHit(entity, source);
            system.clearRun(run);
        });
    }

    if (source?.matches({ families: ['storm_weaver'] })) {
        let run = system.run(() => {
            stormWeaverhit(entity, source);
            system.clearRun(run);
        });
    }
}, { entityTypes: ['rza:walker', 'rza:walker_variant', 'rza:miner', 'rza:feral'] });

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
        world.sendMessage('config');
        //Turret Configurator
        if (entity.matches({ families: ['turret'] })) {
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
                world.sendMessage('§cWarning! zombies will now  be able to mutate!§');
                world.sendMessage(`Current Day: Day §4${worldAge}§r`);
                world.scoreboard.getObjective('mutated_zombies').setScore('main', 1);
            }

            if (worldAge >= 30) {
                world.scoreboard.getObjective('mutated_zombies').setScore('main', 1);
            }
        }

        //Placed active electron reactor core particle effects
        let runElectronReactorCore = system.run(() => {
            activeElectronReactorCore();
            system.clearRun(runElectronReactorCore);
        });

        //Pyro Charger fireball
        let runPyroFireball = system.run(() => {
            pyroChargerFireball();
            system.clearRun(runPyroFireball);
        });

        //Collector Drone
        let runCollectorDrone = system.run(() => {
            collectorDroneMechanics();
            system.clearRun(runCollectorDrone);
        });
    });
}, 120);
