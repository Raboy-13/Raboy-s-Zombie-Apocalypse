import { BlockPermutation, ItemStack, system, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import "./player/playerSetup";

let worldAgeOffset = 0;

//Collector Drone data - Player owner pairing
let droneData = new Map();
let droneCollectionDelay = new Map();

//Placed active electron reactor core data
let electronReactorCoreData = {
    "location": new Map(),
    "timer": 40
}

world.afterEvents.worldInitialize.subscribe(() => {
    const maxDrones = world.scoreboard.getObjective('max_drones')
    if (maxDrones === undefined) world.scoreboard.addObjective('max_drones');
});

//Initiate active electron core reactor data on placement
world.afterEvents.playerPlaceBlock.subscribe((data) => {
    const block = data.block;

    if (block.permutation.matches('rza:active_electron_reactor_core')) {
        electronReactorCoreData.location.set(`${block.bottomCenter().x} ${block.bottomCenter().y} ${block.bottomCenter().z}`, block);
    }
}, { blockTypes: ['rza:active_electron_reactor_core'] });

//delete active electron core reactor data on break
world.afterEvents.playerBreakBlock.subscribe((data) => {
    const blockPermutation = data.brokenBlockPermutation;
    const block = data.block

    if (blockPermutation?.matches('rza:active_electron_reactor_core')) {
        electronReactorCoreData.location.delete(`${block.bottomCenter().x} ${block.bottomCenter().y} ${block.bottomCenter().z}`);
    }
}, { blockTypes: ['rza:active_electron_reactor_core'] });

//Player collector drone counter
world.afterEvents.itemUseOn.subscribe((data) => {
    const item = data.itemStack.typeId;
    const block = data.block;
    const player = data.source;

    if (item === 'rza:collector_drone_item' && !world.scoreboard.getObjective('max_drones').hasParticipant(player.id)) {
        system.run(() => world.scoreboard.getObjective('max_drones').setScore(player.id, 1));
    }
    else if (item === 'rza:collector_drone_item' && world.scoreboard.getObjective('max_drones').getScore(player.id) < 3) {
        system.run(() => world.scoreboard.getObjective('max_drones').setScore(player.id, world.scoreboard.getObjective('max_drones').getScore(player.id) + 1));
    }
    else if (item === 'rza:collector_drone_item' && world.scoreboard.getObjective('max_drones').getScore(player.id) == 3) {
        player.sendMessage('[RZA] There can only be a maximum of §23§r drones for each player.');
        player.dimension.getEntities({ type: 'rza:collector_drone', closest: 1, location: player.location })[0].kill()
        player.dimension.spawnItem(new ItemStack('rza:collector_drone_item', 1), player.location);
    }
});

//General player item use event listener
world.afterEvents.itemUse.subscribe((data) => {
    const item = data.itemStack;
    const player = data.source;

    if (item?.typeId === 'rza:drone_remote') {
        player.runCommand('execute anchored eyes positioned ^^^2 run playsound click_on.metal_pressure_plate @s ~~~');

        player.dimension.getEntities({ type: 'rza:collector_drone', location: player.location, tags: [`${player.id}_owned`] }).forEach(collectorDrone => {
            if (collectorDrone.getProperty('rza:follow_owner')) {
                collectorDrone.setProperty('rza:follow_owner', false);
                player.runCommand('title @s actionbar §2All Drones§r: Collect Items / XP');
            }
            if (!collectorDrone.getProperty('rza:follow_owner')) {
                collectorDrone.setProperty('rza:follow_owner', true);
                player.runCommand('title @s actionbar §2All Drones§r: Follow Owner');
            }
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
        if (!droneData.has(drone.id)) {
            droneData.set(drone.id, playerOwner);

            if (!playerOwner?.hasTag(`${drone.id}_owner`)) playerOwner.addTag(`${drone.id}_owner`);
            if (!drone?.hasTag(`${playerOwner.id}_owned`)) drone.addTag(`${playerOwner.id}_owned`);
        }
        droneCollectionDelay.set(drone.id, 0);
    }

    //Player and hopper pairing for drone delivery
    if (entity.typeId === 'minecraft:hopper_minecart') {
        const hopper = entity;
        const playerOwner = hopper.dimension.getPlayers({ closest: 1, location: hopper.location })[0];
        if (!droneData.has(hopper.id)) {
            droneData.set(hopper.id, hopper);

            if (!hopper?.hasTag(`${playerOwner.id}_owned`)) hopper.addTag(`${playerOwner.id}_owned`);
        }
    }

    //Electron core activator for storm weaver turret
    if (entity?.typeId === 'minecraft:lightning_bolt') {
        const blockHit = entity.dimension.getBlock(entity.location);

        if (blockHit.permutation?.matches('minecraft:lightning_rod')) {
            const blockHitBelow = blockHit.below(1);

            if (blockHitBelow.permutation.matches('rza:electron_reactor_core')) {
                blockHitBelow.setPermutation(BlockPermutation.resolve('rza:active_electron_reactor_core'));

                electronReactorCoreData.location.set(`${blockHitBelow.bottomCenter().x} ${blockHitBelow.bottomCenter().y} ${blockHitBelow.bottomCenter().z}`, blockHitBelow);
            }
        }
    }
});

//General entity Load listener

world.afterEvents.entityLoad.subscribe((data) => {
    const entity = data.entity;

    //Re-pair drone and owner on world reload
    if (entity.typeId === 'rza:collector_drone') {
        const drone = entity;

        droneCollectionDelay.set(drone.id, 0);
        let delayRun = system.runTimeout(() => {
            const playerOwner = drone.dimension.getPlayers({ location: drone.location, tags: [`${drone.id}_owner`] })[0];
            if (!droneData.has(drone.id)) {
                droneData.set(drone.id, playerOwner);
            }
            system.clearRun(delayRun);
        }, 100);
    }
});

//General entity unload listener
world.afterEvents.entityRemove.subscribe((data) => {
    const entityType = data.typeId;
    const entityId = data.removedEntityId;

    if (entityType === 'rza:collector_drone') {
        world.getDimension('overworld').getEntities({ type: 'minecraft:item' }).forEach(item => {
            item.removeTag(`${entityId}_target`);
            item.removeTag(`${entityId}_grabbed`);
            item.removeTag(`invalid`);
        });

        world.getDimension('nether').getEntities({ type: 'minecraft:item' }).forEach(item => {
            item.removeTag(`${entityId}_target`);
            item.removeTag(`${entityId}_grabbed`);
            item.removeTag(`invalid`);
        });

        world.getDimension('the_end').getEntities({ type: 'minecraft:item' }).forEach(item => {
            item.removeTag(`${entityId}_target`);
            item.removeTag(`${entityId}_grabbed`);
            item.removeTag(`invalid`);
        });

        world.getDimension('overworld').getEntities({ type: 'minecraft:xp_orb' }).forEach(xp => {
            xp.removeTag(`${entityId}_target`);
            xp.removeTag(`${entityId}_grabbed`);
            xp.removeTag(`invalid`);
        });

        world.getDimension('nether').getEntities({ type: 'minecraft:xp_orb' }).forEach(xp => {
            xp.removeTag(`${entityId}_target`);
            xp.removeTag(`${entityId}_grabbed`);
            xp.removeTag(`invalid`);
        });

        world.getDimension('the_end').getEntities({ type: 'minecraft:xp_orb' }).forEach(xp => {
            xp.removeTag(`${entityId}_target`);
            xp.removeTag(`${entityId}_grabbed`);
            xp.removeTag(`invalid`);
        });
    }
});

//General Entity Die Event Listener
world.afterEvents.entityDie.subscribe((data) => {
    const entity = data.deadEntity;

    //Remove turret configuration data when a turret is destroyed since that data is already unnecessary to prevent memory leaks
    if (entity?.matches({ families: ['turret'] })) {
        const turret = entity;
        turretPrioritizeMutated.delete(turret.id);
        turretTargetZombieType.delete(turret.id);
    }

    //Reduce the player's drone count when one of their drones get destroyed
    if (entity?.matches({ type: 'rza:collector_drone' })) {
        const drone = entity;
        const playerOwner = drone.dimension.getPlayers({ closest: 1, location: drone.location, tags: [`${drone.id}_owner`] })[0];

        if (droneData.has(drone.id)) {

            if (playerOwner?.hasTag(`${drone.id}_owner`)) playerOwner.removeTag(`${drone.id}_owner`);
            let droneCount = playerOwner?.dimension.getEntities({ type: 'rza:collector_drone', location: playerOwner.location });

            if (droneCount.length < 3 && world.scoreboard.getObjective('max_drones').getScore(playerOwner.id) > 0) {
                system.run(() => world.scoreboard.getObjective('max_drones').setScore(playerOwner.id, world.scoreboard.getObjective('max_drones').getScore(playerOwner.id) - 1));
            }
        }
    }
});

//Turret Mechanics
world.afterEvents.entityHurt.subscribe((data) => {
    const entity = data.hurtEntity;
    const source = data.damageSource.damagingEntity;

    if (source?.matches({ families: ['sonic_cannon'] })) {
        const cannonDir = source.getViewDirection();
        entity.applyImpulse(
            {
                x: cannonDir.x * 3,
                y: cannonDir.y * 8,
                z: cannonDir.z * 3
            }
        );
    }

    if (source?.matches({ families: ['sonic_cannon_attachment'] })) {
        const cannonDir = source.getViewDirection();
        entity.applyImpulse(
            {
                x: cannonDir.x * 3,
                y: cannonDir.y * 4,
                z: cannonDir.z * 3
            }
        );
    }

    if (source?.matches({ families: ['storm_weaver'] })) {
        let lastHitLocation = entity.location;

        let delayTick = system.runTimeout(() => {
            source.runCommand('scoreboard players set @s lightning_branch 48');
            source.runCommand(`execute positioned ${lastHitLocation.x} ${lastHitLocation.y} ${lastHitLocation.z} facing entity @e[family=zombie, rm=8, r=92, c=1, tag=!chainer] eyes run function world/turrets/storm_weaver/turret/branch`);
            system.clearRun(delayTick);
        }, 1);
    }
}, { entityTypes: ['rza:walker', 'rza:walker_variant', 'rza:miner', 'rza:feral'] });

//General entity event listener
world.afterEvents.dataDrivenEntityTrigger.subscribe((data) => {
    const event = data.eventId;
    const entity = data.entity;

    //Feral Leap/Headbutt
    if (event === 'rza:leap') {
        const feral = entity;
        const jumpPowerMin = 1;
        const jumpPowerMax = 2;
        const jumpPowerVal = Math.random() * (jumpPowerMax - jumpPowerMin) + jumpPowerMin;
        const jumpPower = Number(jumpPowerVal.toFixed(3));
        const direction = feral.getViewDirection();
        const targets = feral.dimension.getEntitiesFromRay(feral.getHeadLocation(), direction, { maxDistance: 2 });

        for (const entity of targets) {
            const target = entity.entity;
            if (target.matches({ excludeFamilies: ['zombie', 'turret'] })) {
                target.applyKnockback(direction.x, direction.z, 4, 1);
            }
        }

        feral.applyImpulse(
            {
                x: direction.x * jumpPower,
                y: direction.y * jumpPower,
                z: direction.z * jumpPower
            }
        );
    }

    //General configurator
    if (event === 'rza:configure') {
        //Turret Configurator
        if (entity.matches({ families: ['turret'] })) {
            let turret = entity;
            const configurator = turret.dimension.getPlayers({ closest: 1, location: turret.location });
            let player = configurator[0];

            if (turret?.typeId === 'rza:arrow_turret') system.run(() => arrowTurretConfigurator());
            //Arrow Turret Configurator
            function arrowTurretConfigurator() {
                //Get the last configuration on the entity properties and apply it into the selections
                let zombieSelection = ['All', 'Walkers', 'Miners', 'Ferals'];
                const selectedZombieType = turret.getProperty('rza:target_zombies');

                // Remove the selectedZombieType from the array
                zombieSelection = zombieSelection.filter(zombieType => zombieType !== selectedZombieType);

                // Add the selectedZombieType as the first element in the array
                zombieSelection.unshift(selectedZombieType);

                new ModalFormData()
                    .title("§2Arrow Turret§r")
                    .toggle('Prioritize Mutated Zombies', turret.getProperty('rza:prioritize_mutants'))
                    .dropdown('§cZombies to target', zombieSelection)
                    .show(player)
                    .then(({ formValues: [toggle, dropdown] }) => {
                        const selectedZombieType = zombieSelection[dropdown];

                        //All Zombies: Don't Prioritize Mutants
                        if (!toggle && selectedZombieType === 'All') {
                            player.sendMessage('[Arrow Turret] Targeting §cAll Zombies§r: Not Prioritizing Mutants');
                            turret.triggerEvent('rza:target_all_zombies');
                        }

                        //All Zombies: Prioritize Mutants
                        if (toggle && selectedZombieType === 'All') {
                            player.sendMessage('[Arrow Turret] Targeting §cAll Zombies§r: Prioritizing Mutants');
                            turret.triggerEvent('rza:target_all_zombies_prioritize_mutants');
                        }

                        //Walkers: Don't Prioritize Mutants
                        if (!toggle && selectedZombieType === 'Walkers') {
                            player.sendMessage('[Arrow Turret] Targeting §cWalkers§r: Not Prioritizing Mutants');
                            turret.triggerEvent('rza:target_walkers');
                        }

                        //Walkers: Prioritize Mutants
                        if (toggle && selectedZombieType === 'Walkers') {
                            player.sendMessage('[Arrow Turret] Targeting §cWalkers§r: Prioritizing Mutants');
                            turret.triggerEvent('rza:target_walkers_prioritize_mutants');
                        }

                        //Miners: Don't Prioritize Mutants
                        if (!toggle && selectedZombieType === 'Miners') {
                            player.sendMessage('[Arrow Turret] Targeting §cMiners§r: Not Prioritizing Mutants');
                            turret.triggerEvent('rza:target_miners');
                        }

                        //Miners: Prioritize Mutants
                        if (toggle && selectedZombieType === 'Miners') {
                            player.sendMessage('[Arrow Turret] Targeting §cMiners§r: Prioritizing Mutants');
                            turret.triggerEvent('rza:target_miners_prioritize_mutants');
                        }

                        //Ferals: Don't Prioritize Mutants
                        if (!toggle && selectedZombieType === 'Ferals') {
                            player.sendMessage('[Arrow Turret] Targeting §cFerals§r: Not Prioritizing Mutants');
                            turret.triggerEvent('rza:target_ferals');
                        }

                        //Ferals: Prioritize Mutants
                        if (toggle && selectedZombieType === 'Ferals') {
                            player.sendMessage('[Arrow Turret] Targeting §cFerals§r: Prioritizing Mutants');
                            turret.triggerEvent('rza:target_ferals_prioritize_mutants');
                        }


                        turret.setProperty('rza:prioritize_mutants', toggle);
                        turret.setProperty('rza:target_zombies', selectedZombieType);
                    }).catch((e) => {
                        console.error(e, e.stack)
                    });
            }
        }

        //Collector Configurator
        if (entity.matches({ type: 'rza:collector_drone' })) {
            let collectorDrone = entity;
            const configurator = collectorDrone.dimension.getPlayers({ closest: 1, location: collectorDrone.location });
            let player = configurator[0];
            let collections = ['Items', 'XP'];
            let deliveryLocations = ['Player', 'Hopper'];
            let selectedCollection = collectorDrone.getProperty('rza:collections');
            let selectedDeliveryLocation = collectorDrone.getProperty('rza:delivery_location');

            //if (collectorDrone.getProperty('rza:delivery_location') == 'Hopper') selectedDeliveryLocation = 'Hopper Minecart';

            // Remove the selectedCollection from the array
            collections = collections.filter(collection => collection !== selectedCollection);

            // Add the selectedCollection as the first element in the array
            collections.unshift(selectedCollection);

            // Remove the selectedDeliveryLocation from the array
            deliveryLocations = deliveryLocations.filter(location => location !== selectedDeliveryLocation);

            // Add the selectedDeliveryLocation as the first element in the array
            deliveryLocations.unshift(selectedDeliveryLocation);

            new ModalFormData()
                .title("Collector Drone")
                .toggle('Active', collectorDrone.getProperty('rza:active'))
                .toggle('Auto Collect', collectorDrone.getProperty('rza:auto_collect'))
                .dropdown('What to Collect:', collections)
                .dropdown('Where to Deliver (For items only):', deliveryLocations)
                .show(player)
                .then(({ formValues: [activeToggle, autoCollectToggle, collectionDropdown, locationDropdown] }) => {

                    const collect = collections[collectionDropdown];
                    const location = deliveryLocations[locationDropdown];

                    //Collect Items
                    if (collect === 'Items') {
                        player.sendMessage('[Collector Drone] Collecting §6Items§r');
                        collectorDrone.setProperty('rza:collections', 'Items');
                        collectorDrone.triggerEvent('rza:drone_hover');
                    }

                    //Collect XP
                    if (collect === 'XP') {
                        player.sendMessage('[Collector Drone] Collecting §6XP§r');
                        collectorDrone.setProperty('rza:collections', 'XP');
                        collectorDrone.triggerEvent('rza:drone_hover');
                    }

                    //Delivery Location: Player
                    if (location === 'Player') {
                        collectorDrone.setProperty('rza:delivery_location', 'Player');
                    }

                    //Delivery Location: Hopper Minecart
                    if (location === 'Hopper') {
                        collectorDrone.setProperty('rza:delivery_location', 'Hopper');
                    }

                    collectorDrone.setProperty('rza:active', activeToggle);
                    collectorDrone.setProperty('rza:auto_collect', autoCollectToggle);

                    if (activeToggle) collectorDrone.triggerEvent('rza:drone_hover');
                    if (!activeToggle) collectorDrone.triggerEvent('rza:drone_land');
                }).catch((e) => {
                    console.error(e, e.stack)
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
        if (electronReactorCoreData.timer > 0) electronReactorCoreData.timer--;
        else electronReactorCoreData.timer = 40;
        electronReactorCoreData.location.forEach(electronReactorCore => {
            if (electronReactorCoreData.timer == 0) {
                const currentBlock = electronReactorCore.dimension.getBlock(electronReactorCore.center());
                if (currentBlock.permutation.matches('rza:active_electron_reactor_core')) {
                    currentBlock.dimension.spawnParticle('rza:active_electron_reactor_core', electronReactorCore.center());
                }
            }
        });

        //Pyro Charger fireball
        world.getDimension('overworld').getEntities({ type: 'rza:pyro_charger_fireball' }).forEach(pyroFireball => {
            pyroFireball.dimension.getEntities({ families: ['zombie'], location: pyroFireball.location, maxDistance: 2 }).forEach(zombie => {
                zombie.setOnFire(20, true);
            });
        });

        world.getDimension('nether').getEntities({ type: 'rza:pyro_charger_fireball' }).forEach(pyroFireball => {
            pyroFireball.dimension.getEntities({ families: ['zombie'], location: pyroFireball.location, maxDistance: 2 }).forEach(zombie => {
                zombie.setOnFire(20, true);
            });
        });

        world.getDimension('the_end').getEntities({ type: 'rza:pyro_charger_fireball' }).forEach(pyroFireball => {
            pyroFireball.dimension.getEntities({ families: ['zombie'], location: pyroFireball.location, maxDistance: 2 }).forEach(zombie => {
                zombie.setOnFire(20, true);
            });
        });

        //Collector Drone
        world.getDimension('overworld').getEntities({ type: 'rza:collector_drone' }).forEach(collectorDrone => {
            const droneLocation = collectorDrone.location;
            collectorDrone.addEffect('slow_falling', 2, { showParticles: false, amplifier: 255 });

            if (collectorDrone.getProperty('rza:active')) {

                //Mode: Collect Items / XP
                if (!collectorDrone.getProperty('rza:follow_owner')) {

                    //Collect Items
                    if (collectorDrone.getProperty('rza:collections') === 'Items') {
                        const itemTarget = collectorDrone.dimension.getEntities({ type: 'minecraft:item', location: collectorDrone.location, closest: 1, maxDistance: 64, excludeTags: [`${collectorDrone.id}_target`, 'targeted', 'invalid'] });
                        const itemFound = collectorDrone.dimension.getEntities({ type: 'minecraft:item', location: collectorDrone.location, closest: 1, maxDistance: 64, tags: [`${collectorDrone.id}_target`], excludeTags: [`${collectorDrone.id}_grabbed`, 'invalid'] });
                        const grabbableItemFound = collectorDrone.dimension.getEntities({ type: 'minecraft:item', location: collectorDrone.location, closest: 1, maxDistance: 3, tags: [`${collectorDrone.id}_target`], excludeTags: [`${collectorDrone.id}_grabbed`, 'grabbed', 'invalid'] });
                        const invalidItemFound = collectorDrone.dimension.getEntities({ type: 'minecraft:item', location: collectorDrone.location, closest: 1, maxDistance: 64, tags: ['invalid'] });

                        //Check if targeted item is invalid
                        if (itemTarget.length > 0) {
                            itemTarget.forEach(item => {
                                if (item?.isValid) {
                                    const itemLocation = item.location;
                                    let blockColumn = [];
                                    for (let dy = 1; dy < 48; dy++) {
                                        const blockAbove = item.dimension.getBlock(
                                            {
                                                x: itemLocation.x,
                                                y: itemLocation.y + dy,
                                                z: itemLocation.z
                                            }
                                        );

                                        //If blockAbove is not air, assign false to the new index, otherwise assign true
                                        if (blockAbove?.isValid) blockColumn[dy] = blockAbove.permutation?.matches('minecraft:air');
                                    }
                                    //If one of the values of blockColumn is false meaning there's a solid block on top of the item, add 'invalid' tag to the item
                                    if (!blockColumn.every(value => value === true)) item.addTag('invalid');

                                    if (collectorDrone.getProperty('rza:target_capacity') < 16) {
                                        const targeted = item.getTags().some(tag => tag.endsWith('_target'));

                                        if (!targeted) {
                                            item.addTag(`${collectorDrone.id}_target`);
                                            item.addTag(`targeted`);
                                            collectorDrone.triggerEvent('rza:add_target_capacity');
                                        }
                                        /*else {
                                            world.sendMessage(`Item is already targeted by another drone.`);
                                        }*/
                                    }
                                }
                            });
                        }

                        //Collect valid items while capacity is not full
                        if (itemFound.length > 0 && (collectorDrone.getProperty('rza:capacity') < 16)) {
                            //Don't collect items immediately after delivering the collected xp orbs to the owner to prevent them from accidentally recollecting the collected xp orbs from the player
                            if (droneCollectionDelay.get(collectorDrone.id) > 0) droneCollectionDelay.set(collectorDrone.id, droneCollectionDelay.get(collectorDrone.id) - 1);
                            itemFound.forEach(item => {
                                if (item?.isValid) {
                                    const itemLocation = item.location;
                                    if (!item.hasTag('invalid')) {
                                        if (grabbableItemFound.length > 0) {
                                            const grabbed = grabbableItemFound[0].getTags().some(tag => tag.endsWith('_grabbed'));

                                            if (!grabbed) {
                                                // Only add the tag if the item is not already grabbed by any drone
                                                grabbableItemFound[0].addTag(`${collectorDrone.id}_grabbed`);
                                                grabbableItemFound[0].addTag(`grabbed`);
                                                collectorDrone.triggerEvent('rza:add_capacity');
                                            }
                                            /*else {
                                                world.sendMessage(`Item is already grabbed by another drone.`);
                                            }*/
                                        }

                                        //Face towards the target item
                                        const yRotToItem = ((Math.atan2(itemLocation.z - droneLocation.z, itemLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                                        collectorDrone.setRotation({
                                            x: collectorDrone.getRotation().x,
                                            y: yRotToItem
                                        });

                                        const direction = collectorDrone.getViewDirection();
                                        const blockInFront = collectorDrone.dimension.getBlock(
                                            {
                                                x: droneLocation.x + (direction.x * 1),
                                                y: droneLocation.y - 1,
                                                z: droneLocation.z + (direction.z * 1)
                                            }
                                        ).permutation?.matches('minecraft:air');

                                        //Check if the length of blocks in front does not have a solid block
                                        if (blockInFront) {
                                            collectorDrone.runCommand(`execute facing ${itemLocation.x} ${itemLocation.y + 1} ${itemLocation.z} if entity @e[type=item, tag=!${collectorDrone.id}_grabbed] run tp @s ^^^0.5`);
                                        }
                                        else {
                                            collectorDrone.runCommand(`tp @s ~~0.5~`);
                                        }

                                        if (droneCollectionDelay.get(collectorDrone.id) == 0) {
                                            collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                                            collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                                        }
                                    }
                                }
                            });

                            //Enable deliver incomplete property in case there are no items nearby anymore to collect while the capacity isn't yet full to deliver the collected items to the owner
                            //and to stop the drone from going static while still carrying collected items
                            if (!collectorDrone.getProperty('rza:deliver_incomplete')) collectorDrone.setProperty('rza:deliver_incomplete', true);
                        }
                        //Go back to the owner when capacity is full if the delivery location is set to the player owner
                        else if (collectorDrone.getProperty('rza:capacity') == 16 && collectorDrone.getProperty('rza:delivery_location') == 'Player') {
                            //world.sendMessage(`Capacity: ${collectorDrone.getProperty('rza:capacity')}`);

                            //Remove the tags of this drone from items that weren't collected for other collector drones to collect for efficiency
                            collectorDrone.dimension.getEntities({ type: 'minecraft:item', location: collectorDrone.location, minDistance: 4, maxDistance: 64, tags: [`${collectorDrone.id}_target`] }).forEach(item => {
                                if (item.hasTag(`${collectorDrone.id}_target`) || item.hasTag(`${collectorDrone.id}_grabbed`)) {
                                    item.removeTag(`${collectorDrone.id}_target`);
                                    item.removeTag(`${collectorDrone.id}_grabbed`);
                                    item.removeTag(`targeted`);
                                    item.removeTag(`grabbed`);
                                }
                            });

                            if (droneData.has(collectorDrone.id)) {

                                const playerOwner = droneData.get(collectorDrone.id);
                                const ownerLocation = playerOwner.location;
                                const ownerInRangeForDrop = collectorDrone.dimension.getPlayers({ location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${collectorDrone.id}_owner`] });

                                //Face towards the player owner
                                const yRotToOwner = ((Math.atan2(ownerLocation.z - droneLocation.z, ownerLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                                collectorDrone.setRotation({
                                    x: collectorDrone.getRotation().x,
                                    y: yRotToOwner
                                });

                                const direction = collectorDrone.getViewDirection();
                                const blockInFront = collectorDrone.dimension.getBlock(
                                    {
                                        x: droneLocation.x + (direction.x * 1),
                                        y: droneLocation.y - 1,
                                        z: droneLocation.z + (direction.z * 1)
                                    }
                                ).permutation?.matches('minecraft:air');

                                if (blockInFront) {
                                    collectorDrone.runCommand(`execute facing ${ownerLocation.x} ${ownerLocation.y + 3} ${ownerLocation.z} if entity @p[tag=${collectorDrone.id}_owner, rm=2] run tp @s ^^^0.5`);
                                }
                                else {
                                    collectorDrone.runCommand(`tp @s ~~0.5~`);
                                }

                                //Don't keep holding the collected items upon delivery
                                if (ownerInRangeForDrop == 0) {
                                    collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                                    collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                                }

                                //Check if auto collect toggle from the last player interaction is set to true. If yes, don't land, give collected items to the owner, and collect item again in the area
                                if (ownerInRangeForDrop.length > 0 && collectorDrone.getProperty('rza:auto_collect')) {
                                    collectorDrone.setProperty('rza:capacity', 0);
                                    collectorDrone.setProperty('rza:target_capacity', 0);
                                    collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                                    collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);

                                    //Don't collect items immediately after delivering the collected xp orbs to the owner to prevent them from accidentally recollecting the collected xp orbs from the player
                                    droneCollectionDelay.set(collectorDrone.id, 10);
                                }

                                //Check if auto collect toggle from the last player interaction is set to false. If yes, give collected items to the owner and land
                                if (ownerInRangeForDrop.length > 0 && !collectorDrone.getProperty('rza:auto_collect')) {
                                    collectorDrone.setProperty('rza:active', false);
                                    collectorDrone.setProperty('rza:capacity', 0);
                                    collectorDrone.setProperty('rza:target_capacity', 0);
                                    collectorDrone.triggerEvent('rza:drone_land');
                                    collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                                    collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);

                                    //Don't collect items immediately after delivering the collected xp orbs to the owner to prevent them from accidentally recollecting the collected xp orbs from the player
                                    droneCollectionDelay.set(collectorDrone.id, 10);
                                }
                            }

                        }

                        //Go back to the nearest player owner's hopper minecart when capacity is full if the delivery location is set to a player owner-owned hopper minecart
                        else if (collectorDrone.getProperty('rza:capacity') == 16 && collectorDrone.getProperty('rza:delivery_location') == 'Hopper') {
                            //world.sendMessage(`Capacity: ${collectorDrone.getProperty('rza:capacity')}`);

                            //Remove the tags of this drone from items that weren't collected for other collector drones to collect for efficiency
                            collectorDrone.dimension.getEntities({ type: 'minecraft:item', location: collectorDrone.location, minDistance: 4, maxDistance: 64, tags: [`${collectorDrone.id}_target`] }).forEach(item => {
                                if (item.hasTag(`${collectorDrone.id}_target`) || item.hasTag(`${collectorDrone.id}_grabbed`)) {
                                    item.removeTag(`${collectorDrone.id}_target`);
                                    item.removeTag(`${collectorDrone.id}_grabbed`);
                                    item.removeTag(`targeted`);
                                    item.removeTag(`grabbed`);
                                }
                            });

                            if (droneData.has(collectorDrone.id)) {

                                const playerOwner = droneData.get(collectorDrone.id);
                                const hopper = collectorDrone.dimension.getEntities({ type: 'minecraft:hopper_minecart', location: collectorDrone.location, closest: 1, maxDistance: 100, tags: [`${playerOwner.id}_owned`] })[0];
                                const ownerHopperInRangeForDrop = collectorDrone.dimension.getEntities({ type: 'minecraft:hopper_minecart', location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${playerOwner.id}_owned`] });

                                if (hopper?.isValid) {
                                    const hopperLocation = hopper.location;

                                    //Face towards the hoppper
                                    const yRotToHopper = ((Math.atan2(hopperLocation.z - droneLocation.z, hopperLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                                    collectorDrone.setRotation({
                                        x: collectorDrone.getRotation().x,
                                        y: yRotToHopper
                                    });

                                    const direction = collectorDrone.getViewDirection();
                                    const blockInFront = collectorDrone.dimension.getBlock(
                                        {
                                            x: droneLocation.x + (direction.x * 1),
                                            y: droneLocation.y - 1,
                                            z: droneLocation.z + (direction.z * 1)
                                        }
                                    ).permutation?.matches('minecraft:air');

                                    //Check if block in front is not a solid block
                                    if (blockInFront) {
                                        collectorDrone.runCommand(`execute facing ${hopperLocation.x} ${hopperLocation.y + 3} ${hopperLocation.z} if entity @e[tag=${playerOwner.id}_owned, c=1] run tp @s ^^^0.5`);
                                    }
                                    else {
                                        collectorDrone.runCommand(`tp @s ~~0.5~`);
                                    }

                                    //Don't keep holding the collected items upon delivery
                                    if (ownerHopperInRangeForDrop == 0) {
                                        collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                                        collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                                    }


                                    //Check if auto collect toggle from the last player interaction is set to true. If yes, don't land, give collected items to the owner, and collect item again in the area
                                    if (ownerHopperInRangeForDrop.length > 0 && collectorDrone.getProperty('rza:auto_collect')) {
                                        collectorDrone.setProperty('rza:capacity', 0);
                                        collectorDrone.setProperty('rza:target_capacity', 0);
                                        collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${hopperLocation.x} ${hopperLocation.y + 2} ${hopperLocation.z}`);
                                        collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${hopperLocation.x} ${hopperLocation.y + 2} ${hopperLocation.z}`);

                                        //Don't collect items immediately after delivering the collected xp orbs to the owner to prevent them from accidentally recollecting the collected xp orbs from the player
                                        droneCollectionDelay.set(collectorDrone.id, 20);
                                    }

                                    //Check if auto collect toggle from the last player interaction is set to false. If yes, give collected items to the owner and land
                                    if (ownerHopperInRangeForDrop.length > 0 && !collectorDrone.getProperty('rza:auto_collect')) {
                                        collectorDrone.setProperty('rza:active', false);
                                        collectorDrone.setProperty('rza:capacity', 0);
                                        collectorDrone.setProperty('rza:target_capacity', 0);
                                        collectorDrone.triggerEvent('rza:drone_land');
                                        collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${hopperLocation.x} ${hopperLocation.y + 2} ${hopperLocation.z}`);
                                        collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${hopperLocation.x} ${hopperLocation.y + 2} ${hopperLocation.z}`);

                                        //Don't collect items immediately after delivering the collected xp orbs to the owner to prevent them from accidentally recollecting the collected xp orbs from the player
                                        droneCollectionDelay.set(collectorDrone.id, 20);
                                    }
                                }
                            }
                        }

                        //Deliver the collected items to the owner even if capacity is not full when there are no items to collect nearby if the delivery location is set to the player owner
                        else if (itemFound.length == 0 && collectorDrone.getProperty('rza:delivery_location') == 'Player') {
                            const playerOwner = droneData.get(collectorDrone.id);
                            const ownerLocation = playerOwner.location;
                            const ownerInRangeForDrop = collectorDrone.dimension.getPlayers({ location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${collectorDrone.id}_owner`] });

                            //Face towards the player owner
                            const yRotToOwner = ((Math.atan2(ownerLocation.z - droneLocation.z, ownerLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                            collectorDrone.setRotation({
                                x: collectorDrone.getRotation().x,
                                y: yRotToOwner
                            });

                            const direction = collectorDrone.getViewDirection();
                            const blockInFront = collectorDrone.dimension.getBlock(
                                {
                                    x: droneLocation.x + (direction.x * 1),
                                    y: droneLocation.y - 1,
                                    z: droneLocation.z + (direction.z * 1)
                                }
                            ).permutation?.matches('minecraft:air');

                            if (blockInFront) {
                                //This will make the drone go to the owner with the collected items
                                if (collectorDrone.getProperty('rza:deliver_incomplete')) {
                                    collectorDrone.runCommand(`execute facing ${ownerLocation.x} ${ownerLocation.y + 3} ${ownerLocation.z} if entity @p[tag=${collectorDrone.id}_owner, rm=2] run tp @s ^^^0.5`);
                                }

                                //Check if owner is in range for dropping the collected items, then disable deliver incomplete property to stop drone from always following the owner
                                if (ownerInRangeForDrop.length > 0) {
                                    collectorDrone.setProperty('rza:deliver_incomplete', false);
                                    collectorDrone.setProperty('rza:capacity', 0);
                                    collectorDrone.setProperty('rza:target_capacity', 0);
                                    collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                                    collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);

                                    //Don't collect items immediately after delivering the collected xp orbs to the owner to prevent them from accidentally recollecting the collected xp orbs from the player
                                    droneCollectionDelay.set(collectorDrone.id, 10);
                                }
                            }
                            else {
                                collectorDrone.runCommand(`tp @s ~~0.5~`);
                            }

                            //Don't keep holding the collected items upon delivery
                            if (ownerInRangeForDrop == 0) {
                                collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                                collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                            }
                        }

                        //Deliver the collected items to the owner even if capacity is not full when there are no items to collect nearby if the delivery location is set to a player owner-owned hopper minecart
                        else if (itemFound.length == 0 && collectorDrone.getProperty('rza:delivery_location') == 'Hopper') {
                            const playerOwner = droneData.get(collectorDrone.id);
                            const hopper = collectorDrone.dimension.getEntities({ type: 'minecraft:hopper_minecart', location: collectorDrone.location, closest: 1, maxDistance: 100, tags: [`${playerOwner.id}_owned`] })[0];
                            const ownerHopperInRangeForDrop = collectorDrone.dimension.getEntities({ type: 'minecraft:hopper_minecart', location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${playerOwner.id}_owned`] });

                            if (hopper?.isValid) {
                                const hopperLocation = hopper.location;

                                //Face towards the hopper
                                const yRotToHopper = ((Math.atan2(hopperLocation.z - droneLocation.z, hopperLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                                collectorDrone.setRotation({
                                    x: collectorDrone.getRotation().x,
                                    y: yRotToHopper
                                });

                                const direction = collectorDrone.getViewDirection();
                                const blockInFront = collectorDrone.dimension.getBlock(
                                    {
                                        x: droneLocation.x + (direction.x * 1),
                                        y: droneLocation.y - 1,
                                        z: droneLocation.z + (direction.z * 1)
                                    }
                                ).permutation?.matches('minecraft:air');

                                //Check if block in front is not a solid block
                                if (blockInFront) {
                                    //This will make the drone go to the owner-owned minecart with the collected items
                                    if (collectorDrone.getProperty('rza:deliver_incomplete')) {
                                        collectorDrone.runCommand(`execute facing ${hopperLocation.x} ${hopperLocation.y + 3} ${hopperLocation.z} if entity @e[tag=${playerOwner.id}_owned, c=1] run tp @s ^^^0.5`);
                                    }

                                    //Check if owner-owned hoppper minecart is in range for dropping the collected items, then disable deliver incomplete property to stop drone from always following the owner
                                    if (ownerHopperInRangeForDrop.length > 0) {
                                        collectorDrone.setProperty('rza:deliver_incomplete', false);
                                        collectorDrone.setProperty('rza:capacity', 0);
                                        collectorDrone.setProperty('rza:target_capacity', 0);
                                        collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${hopperLocation.x} ${hopperLocation.y + 2} ${hopperLocation.z}`);
                                        collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${hopperLocation.x} ${hopperLocation.y + 2} ${hopperLocation.z}`);

                                        //Don't collect items immediately after delivering the collected xp orbs to the owner to prevent them from accidentally recollecting the collected xp orbs from the player
                                        droneCollectionDelay.set(collectorDrone.id, 20);
                                    }
                                }
                                else {
                                    collectorDrone.runCommand(`tp @s ~~0.5~`);
                                }

                                //Don't keep holding the collected items upon delivery
                                if (ownerHopperInRangeForDrop == 0) {
                                    collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                                    collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                                }
                            }
                        }

                        //Invalid items handler - update each item if that item is now valid
                        if (invalidItemFound.length > 0) {
                            invalidItemFound.forEach(invalidItem => {
                                if (invalidItem?.isValid) {
                                    const itemLocation = invalidItem.location;
                                    let blockColumn = [];
                                    for (let dy = 1; dy < 48; dy++) {
                                        const blockAbove = invalidItem.dimension.getBlock(
                                            {
                                                x: itemLocation.x,
                                                y: itemLocation.y + dy,
                                                z: itemLocation.z
                                            }
                                        );

                                        //If blockAbove is not air, assign false to the new index, otherwise assign true
                                        if (blockAbove?.isValid) blockColumn[dy] = blockAbove.permutation?.matches('minecraft:air');
                                    }

                                    //Remove the 'invalid' tag if all blocks in a 32 block offset above the item is all air blocks, meaning this item is not currently underground
                                    if (blockColumn.every(value => value === true)) invalidItem.removeTag('invalid');
                                }
                            });
                        }

                        //Decrement the target capacity counter by 1 while the item/xp capacity counter isn't
                        if (collectorDrone.getProperty('rza:target_capacity') == 16 && collectorDrone.getProperty('rza:capacity') < 16) collectorDrone.setProperty('rza:target_capacity', 15);
                    }

                    //Collect XPs
                    if (collectorDrone.getProperty('rza:collections') === 'XP') {
                        const xpTarget = collectorDrone.dimension.getEntities({ type: 'minecraft:xp_orb', location: collectorDrone.location, closest: 1, maxDistance: 64, excludeTags: [`${collectorDrone.id}_target`, 'targeted', 'invalid'] });
                        const xpFound = collectorDrone.dimension.getEntities({ type: 'minecraft:xp_orb', location: collectorDrone.location, closest: 1, maxDistance: 64, tags: [`${collectorDrone.id}_target`], excludeTags: [`${collectorDrone.id}_grabbed`, 'invalid'] });
                        const grabbableXpOrbFound = collectorDrone.dimension.getEntities({ type: 'minecraft:xp_orb', location: collectorDrone.location, closest: 1, maxDistance: 3, tags: [`${collectorDrone.id}_target`], excludeTags: [`${collectorDrone.id}_grabbed`, 'grabbed', 'invalid'] });
                        const invalidXpFound = collectorDrone.dimension.getEntities({ type: 'minecraft:xp_orb', location: collectorDrone.location, closest: 1, maxDistance: 64, tags: ['invalid'] });

                        //Check if targeted xp orb is invalid
                        if (xpTarget.length > 0) {
                            xpTarget.forEach(xp => {
                                if (xp?.isValid) {
                                    const xpLocation = xp.location;
                                    let blockColumn = [];
                                    for (let dy = 1; dy < 48; dy++) {
                                        const blockAbove = xp.dimension.getBlock(
                                            {
                                                x: xpLocation.x,
                                                y: xpLocation.y + dy,
                                                z: xpLocation.z
                                            }
                                        );

                                        //If blockAbove is not air, assign false to the new index, otherwise assign true
                                        if (blockAbove?.isValid) blockColumn[dy] = blockAbove.permutation?.matches('minecraft:air');
                                    }
                                    //If one of the values of blockColumn is false meaning there's a solid block on top of the xp orb, add 'invalid' tag to the xp orb
                                    if (!blockColumn.every(value => value === true)) xp.addTag('invalid');

                                    if (collectorDrone.getProperty('rza:target_capacity') < 16) {
                                        const targeted = xp.getTags().some(tag => tag.endsWith('_target'));

                                        if (!targeted) {
                                            xp.addTag(`${collectorDrone.id}_target`);
                                            xp.addTag(`targeted`);
                                            collectorDrone.triggerEvent('rza:add_target_capacity');
                                        }
                                        /*else {
                                            world.sendMessage(`Orb is already targeted by another drone.`);
                                        }*/
                                    }
                                }
                            });
                        }

                        //Collect valid xp orbs while capacity is not full
                        if (xpFound.length > 0 && (collectorDrone.getProperty('rza:capacity') < 16)) {
                            //Don't collect xp orbs immediately after delivering the collected xp orbs to the owner to prevent them from accidentally recollecting the collected xp orbs from the player
                            if (droneCollectionDelay.get(collectorDrone.id) > 0) droneCollectionDelay.set(collectorDrone.id, droneCollectionDelay.get(collectorDrone.id) - 1);
                            xpFound.forEach(xp => {
                                if (xp?.isValid) {
                                    const xpLocation = xp.location;
                                    if (!xp.hasTag('invalid')) {
                                        if (grabbableXpOrbFound.length > 0) {
                                            const grabbed = grabbableXpOrbFound[0].getTags().some(tag => tag.endsWith('_grabbed'));

                                            if (!grabbed) {
                                                // Only add the tag if the orb is not already grabbed by any drone
                                                grabbableXpOrbFound[0].addTag(`${collectorDrone.id}_grabbed`);
                                                grabbableXpOrbFound[0].addTag(`grabbed`);
                                                collectorDrone.triggerEvent('rza:add_capacity');
                                            }
                                            /*else {
                                                world.sendMessage(`Orb is already grabbed by another drone.`);
                                            }*/
                                        }

                                        //Face towards the target xp orb
                                        const yRotToXp = ((Math.atan2(xpLocation.z - droneLocation.z, xpLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                                        collectorDrone.setRotation({
                                            x: collectorDrone.getRotation().x,
                                            y: yRotToXp
                                        });

                                        const direction = collectorDrone.getViewDirection();
                                        const blockInFront = collectorDrone.dimension.getBlock(
                                            {
                                                x: droneLocation.x + (direction.x * 1),
                                                y: droneLocation.y - 1,
                                                z: droneLocation.z + (direction.z * 1)
                                            }
                                        ).permutation?.matches('minecraft:air');

                                        if (blockInFront) {
                                            collectorDrone.runCommand(`execute facing ${xpLocation.x} ${xpLocation.y + 1} ${xpLocation.z} if entity @e[type=xp_orb, tag=!${collectorDrone.id}_grabbed] run tp @s ^^^0.5`);
                                        }
                                        else {
                                            collectorDrone.runCommand(`tp @s ~~0.5~`);
                                        }

                                        if (droneCollectionDelay.get(collectorDrone.id) == 0) {
                                            collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.7} ${droneLocation.z} run tp @s ^^^0.7`);
                                            collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.7} ${droneLocation.z} run tp @s ^^^0.7`);
                                        }
                                    }
                                }
                            });

                            //Enable deliver incomplete property in case there are no xp orbs nearby anymore to collect while the capacity isn't yet full to deliver the collected xp orbs to the owner
                            //and to stop the drone from going static while still carrying collected items
                            if (!collectorDrone.getProperty('rza:deliver_incomplete')) collectorDrone.setProperty('rza:deliver_incomplete', true);
                        }
                        //Go back to the owner when capacity is full
                        else if (collectorDrone.getProperty('rza:capacity') == 16) {
                            //world.sendMessage(`Capacity: ${collectorDrone.getProperty('rza:capacity')}`);

                            //Remove the tags of this drone from xp orbs that weren't collected for other collector drones to collect for efficiency
                            collectorDrone.dimension.getEntities({ type: 'minecraft:xp_orb', location: collectorDrone.location, minDistance: 4, maxDistance: 64, tags: [`${collectorDrone.id}_target`] }).forEach(xp => {
                                if (xp.hasTag(`${collectorDrone.id}_target`)) {
                                    xp.removeTag(`${collectorDrone.id}_target`);
                                    xp.removeTag(`${collectorDrone.id}_grabbed`);
                                    xp.removeTag(`targeted`);
                                    xp.removeTag(`grabbed`);
                                }
                            });

                            if (droneData.has(collectorDrone.id)) {

                                const playerOwner = droneData.get(collectorDrone.id);
                                const ownerLocation = playerOwner.location;

                                //Face towards the player owner
                                const yRotToOwner = ((Math.atan2(ownerLocation.z - droneLocation.z, ownerLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                                collectorDrone.setRotation({
                                    x: collectorDrone.getRotation().x,
                                    y: yRotToOwner
                                });

                                const direction = collectorDrone.getViewDirection();
                                const blockInFront = collectorDrone.dimension.getBlock(
                                    {
                                        x: droneLocation.x + (direction.x * 1),
                                        y: droneLocation.y - 1,
                                        z: droneLocation.z + (direction.z * 1)
                                    }
                                ).permutation?.matches('minecraft:air');

                                if (blockInFront) {
                                    collectorDrone.runCommand(`execute facing ${ownerLocation.x} ${ownerLocation.y + 3} ${ownerLocation.z} if entity @p[tag=${collectorDrone.id}_owner, rm=2] run tp @s ^^^0.5`);
                                }
                                else {
                                    collectorDrone.runCommand(`tp @s ~~0.5~`);
                                }
                                collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.7} ${droneLocation.z} run tp @s ^^^0.7`);
                                collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.7} ${droneLocation.z} run tp @s ^^^0.7`);

                                const ownerInRangeForDrop = collectorDrone.dimension.getPlayers({ location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${collectorDrone.id}_owner`] });

                                //Check if auto collect toggle from the last player interaction is set to true. If yes, don't land, give collected xp orbs to the owner, and collect xps again in the area
                                if (ownerInRangeForDrop.length > 0 && collectorDrone.getProperty('rza:auto_collect')) {
                                    collectorDrone.setProperty('rza:capacity', 0);
                                    collectorDrone.setProperty('rza:target_capacity', 0);
                                    collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                                    collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);

                                    //Don't collect xp orbs immediately after delivering the collected xp orbs to the owner to prevent them from accidentally recollecting the collected xp orbs from the player
                                    droneCollectionDelay.set(collectorDrone.id, 10);
                                }

                                //Check if auto collect toggle from the last player interaction is set to false. If yes, give collected xp orbs to the owner and land
                                if (ownerInRangeForDrop.length > 0 && !collectorDrone.getProperty('rza:auto_collect')) {
                                    collectorDrone.setProperty('rza:active', false);
                                    collectorDrone.setProperty('rza:capacity', 0);
                                    collectorDrone.setProperty('rza:target_capacity', 0);
                                    collectorDrone.triggerEvent('rza:drone_land');
                                    collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                                    collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);

                                    //Don't collect xp orbs immediately after delivering the collected xp orbs to the owner to prevent them from accidentally recollecting the collected xp orbs from the player
                                    droneCollectionDelay.set(collectorDrone.id, 10);
                                }
                            }

                        }
                        //Deliver the collected xp orbs to the owner even if capacity is not full when there are no xp orbs to collect nearby
                        else {
                            const playerOwner = droneData.get(collectorDrone.id);
                            const ownerLocation = playerOwner.location;
                            const ownerInRangeForDrop = collectorDrone.dimension.getPlayers({ location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${collectorDrone.id}_owner`] });

                            //Face towards the player owner
                            const yRotToOwner = ((Math.atan2(ownerLocation.z - droneLocation.z, ownerLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                            collectorDrone.setRotation({
                                x: collectorDrone.getRotation().x,
                                y: yRotToOwner
                            });

                            const direction = collectorDrone.getViewDirection();
                            const blockInFront = collectorDrone.dimension.getBlock(
                                {
                                    x: droneLocation.x + (direction.x * 1),
                                    y: droneLocation.y - 1,
                                    z: droneLocation.z + (direction.z * 1)
                                }
                            ).permutation?.matches('minecraft:air');

                            if (blockInFront) {
                                //This will make the drone go to the owner with the collected items
                                if (collectorDrone.getProperty('rza:deliver_incomplete')) {
                                    collectorDrone.runCommand(`execute facing ${ownerLocation.x} ${ownerLocation.y + 3} ${ownerLocation.z} if entity @p[tag=${collectorDrone.id}_owner, rm=2] run tp @s ^^^0.5`);
                                }

                                //Check if owner is in range for dropping the collected xp orbs, then disable deliver incomplete property to stop drone from always following the owner
                                if (ownerInRangeForDrop.length > 0) {
                                    collectorDrone.setProperty('rza:deliver_incomplete', false);
                                    collectorDrone.setProperty('rza:capacity', 0);
                                    collectorDrone.setProperty('rza:target_capacity', 0);
                                    collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                                    collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);

                                    //Don't collect xp orbs immediately after delivering the collected xp orbs to the owner to prevent them from accidentally recollecting the collected xp orbs from the player
                                    droneCollectionDelay.set(collectorDrone.id, 10);
                                }
                            }
                            else {
                                collectorDrone.runCommand(`tp @s ~~0.5~`);
                            }
                            collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.7} ${droneLocation.z} run tp @s ^^^0.7`);
                            collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.7} ${droneLocation.z} run tp @s ^^^0.7`);
                        }

                        //Invalid xp orbs handler - update each xp orb if that xp orb is now valid
                        if (invalidXpFound.length > 0) {
                            invalidXpFound.forEach(invalidXp => {
                                if (invalidXp?.isValid) {
                                    const xpLocation = invalidXp.location;
                                    let blockColumn = [];
                                    for (let dy = 1; dy < 48; dy++) {
                                        const blockAbove = invalidXp.dimension.getBlock(
                                            {
                                                x: xpLocation.x,
                                                y: xpLocation.y + dy,
                                                z: xpLocation.z
                                            }
                                        );

                                        //If blockAbove is not air, assign false to the new index, otherwise assign true
                                        if (blockAbove?.isValid) blockColumn[dy] = blockAbove.permutation?.matches('minecraft:air');
                                    }

                                    //Remove the 'invalid' tag if all blocks in a 32 block offset above the xp is all air blocks, meaning this xp is not currently underground
                                    if (blockColumn.every(value => value === true)) invalidXp.removeTag('invalid');
                                }
                            });
                        }

                        //Decrement the target capacity counter by 1 while the item/xp capacity counter isn't
                        if (collectorDrone.getProperty('rza:target_capacity') == 16 && collectorDrone.getProperty('rza:capacity') < 16) collectorDrone.setProperty('rza:target_capacity', 15);
                    }
                }
                //Mode: Follow Owner
                else {
                    const ownerInRangeForDrop = collectorDrone.dimension.getPlayers({ location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${collectorDrone.id}_owner`] });
                    const playerOwner = droneData.get(collectorDrone.id);
                    const ownerLocation = playerOwner.location;

                    //Remove the tags of this drone from items that weren't collected for other collector drones to collect for efficiency
                    collectorDrone.dimension.getEntities({ type: 'minecraft:item', location: collectorDrone.location, minDistance: 4, maxDistance: 64, tags: [`${collectorDrone.id}_target`] }).forEach(item => {
                        if (item.hasTag(`${collectorDrone.id}_target`)) {
                            item.removeTag(`${collectorDrone.id}_target`);
                            item.removeTag(`${collectorDrone.id}_grabbed`);
                            item.removeTag(`targeted`);
                            item.removeTag(`grabbed`);
                        }
                    });

                    //Remove the tags of this drone from xp orbs that weren't collected for other collector drones to collect for efficiency
                    collectorDrone.dimension.getEntities({ type: 'minecraft:xp_orb', location: collectorDrone.location, minDistance: 4, maxDistance: 64, tags: [`${collectorDrone.id}_target`] }).forEach(xp => {
                        if (xp.hasTag(`${collectorDrone.id}_target`)) {
                            xp.removeTag(`${collectorDrone.id}_target`);
                            xp.removeTag(`${collectorDrone.id}_grabbed`);
                            xp.removeTag(`targeted`);
                            xp.removeTag(`grabbed`);
                        }
                    });

                    //Face towards the player owner
                    const yRotToOwner = ((Math.atan2(ownerLocation.z - droneLocation.z, ownerLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                    collectorDrone.setRotation({
                        x: collectorDrone.getRotation().x,
                        y: yRotToOwner
                    });

                    const direction = collectorDrone.getViewDirection();
                    const blockInFront = collectorDrone.dimension.getBlock(
                        {
                            x: droneLocation.x + (direction.x * 1),
                            y: droneLocation.y - 1,
                            z: droneLocation.z + (direction.z * 1)
                        }
                    ).permutation?.matches('minecraft:air');

                    if (blockInFront) {
                        collectorDrone.runCommand(`execute facing ${ownerLocation.x} ${ownerLocation.y + 3} ${ownerLocation.z} if entity @p[tag=${collectorDrone.id}_owner, rm=2] run tp @s ^^^0.5`);
                    }
                    else {
                        collectorDrone.runCommand(`tp @s ~~0.5~`);
                    }
                    collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 1} ${droneLocation.z} run tp @s ^^^0.7`);
                    collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 1} ${droneLocation.z} run tp @s ^^^0.7`);

                    if (ownerInRangeForDrop.length > 0) {
                        collectorDrone.setProperty('rza:capacity', 0);
                        collectorDrone.setProperty('rza:target_capacity', 0);
                        collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                        collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);

                        //Don't collect xp orbs immediately after delivering the collected xp orbs to the owner to prevent them from accidentally recollecting the collected xp orbs from the player
                        droneCollectionDelay.set(collectorDrone.id, 10);
                    }
                }
            }
        });
    });
}, 120);
