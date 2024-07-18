import { ItemStack, system, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
let droneData = new Map();
let droneCollectionDelay = new Map();
export function ownerCollectorDroneCounter(player) {
    if (!world.scoreboard.getObjective('max_drones').hasParticipant(player.id)) {
        let run = system.run(() => {
            world.scoreboard.getObjective('max_drones').setScore(player.id, 1);
            system.clearRun(run);
        });
    }
    else if (world.scoreboard.getObjective('max_drones').getScore(player.id) < 3) {
        let run = system.run(() => {
            world.scoreboard.getObjective('max_drones').setScore(player.id, world.scoreboard.getObjective('max_drones').getScore(player.id) + 1);
            system.clearRun(run);
        });
    }
    else if (world.scoreboard.getObjective('max_drones').getScore(player.id) == 3) {
        player.sendMessage('[RZA] There can only be a maximum of §23§r drones for each player.');
        player.dimension.getEntities({ type: 'rza:collector_drone', closest: 1, location: player.location })[0].kill();
        player.dimension.spawnItem(new ItemStack('rza:collector_drone_item', 1), player.location);
    }
}
export function collectorDroneOwnerPairing(drone, playerOwner) {
    if (!droneData.has(drone.id)) {
        droneData.set(drone.id, playerOwner);
        if (!playerOwner?.hasTag(`${drone.id}_owner`))
            playerOwner.addTag(`${drone.id}_owner`);
        if (!drone?.hasTag(`${playerOwner.id}_owned`))
            drone.addTag(`${playerOwner.id}_owned`);
    }
    droneCollectionDelay.set(drone.id, 0);
    return;
}
export function collectorDroneHopperPairing(hopper, playerOwner) {
    if (!droneData.has(hopper.id)) {
        droneData.set(hopper.id, hopper);
        if (!hopper?.hasTag(`${playerOwner.id}_owned`))
            hopper.addTag(`${playerOwner.id}_owned`);
    }
    return;
}
export function collectorDroneOwnerRepair(drone) {
    droneCollectionDelay.set(drone.id, 0);
    let delayRun = system.runTimeout(() => {
        const playerOwner = drone.dimension.getPlayers({ location: drone.location, tags: [`${drone.id}_owner`] })[0];
        if (!droneData.has(drone.id)) {
            droneData.set(drone.id, playerOwner);
        }
        system.clearRun(delayRun);
        return;
    }, 200);
}
export function collectorDroneConfigurator(entity) {
    let collectorDrone = entity;
    const configurator = collectorDrone.dimension.getPlayers({ closest: 1, location: collectorDrone.location });
    let player = configurator[0];
    let collections = ['Items', 'XP'];
    let deliveryLocations = ['Player', 'Hopper'];
    let selectedCollection = collectorDrone.getProperty('rza:collections');
    let selectedDeliveryLocation = collectorDrone.getProperty('rza:delivery_location');
    collections = collections.filter(collection => collection !== selectedCollection);
    collections.unshift(selectedCollection);
    deliveryLocations = deliveryLocations.filter(location => location !== selectedDeliveryLocation);
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
        if (collect === 'Items') {
            player.sendMessage('[Collector Drone] Collecting §6Items§r');
            collectorDrone.setProperty('rza:collections', 'Items');
            collectorDrone.triggerEvent('rza:drone_hover');
        }
        if (collect === 'XP') {
            player.sendMessage('[Collector Drone] Collecting §6XP§r');
            collectorDrone.setProperty('rza:collections', 'XP');
            collectorDrone.triggerEvent('rza:drone_hover');
        }
        if (location === 'Player') {
            collectorDrone.setProperty('rza:delivery_location', 'Player');
        }
        if (location === 'Hopper') {
            collectorDrone.setProperty('rza:delivery_location', 'Hopper');
        }
        collectorDrone.setProperty('rza:active', activeToggle);
        collectorDrone.setProperty('rza:auto_collect', autoCollectToggle);
        if (activeToggle)
            collectorDrone.triggerEvent('rza:drone_hover');
        if (!activeToggle)
            collectorDrone.triggerEvent('rza:drone_land');
    }).catch((e) => {
        console.error(e, e.stack);
    });
}
export function collectorDroneUnload(droneId) {
    world.getPlayers({ tags: [`${droneId}_owner`] }).forEach(owner => {
        const ownerLocation = owner.location;
        owner.dimension.getEntities({ type: 'minecraft:item', location: ownerLocation }).forEach(item => {
            item.removeTag(`${droneId}_target`);
            item.removeTag(`${droneId}_grabbed`);
            item.removeTag(`invalid`);
            owner.removeTag(`${droneId}_owner`);
        });
        owner.dimension.getEntities({ type: 'minecraft:xp_orb', location: ownerLocation }).forEach(xp => {
            xp.removeTag(`${droneId}_target`);
            xp.removeTag(`${droneId}_grabbed`);
            xp.removeTag(`invalid`);
            owner.removeTag(`${droneId}_owner`);
        });
    });
    return;
}
export function collectorDroneDie(drone, playerOwner) {
    if (droneData.has(drone.id)) {
        if (playerOwner?.hasTag(`${drone.id}_owner`))
            playerOwner.removeTag(`${drone.id}_owner`);
        let droneCount = playerOwner?.dimension.getEntities({ type: 'rza:collector_drone', location: playerOwner.location });
        if (droneCount.length < 3 && world.scoreboard.getObjective('max_drones').getScore(playerOwner.id) > 0) {
            system.run(() => world.scoreboard.getObjective('max_drones').setScore(playerOwner.id, world.scoreboard.getObjective('max_drones').getScore(playerOwner.id) - 1));
        }
    }
    return;
}
export function collectorDroneMechanics(collectorDrone) {
    const droneLocation = collectorDrone.location;
    collectorDrone.addEffect('slow_falling', 2, { showParticles: false, amplifier: 255 });
    if (collectorDrone.getProperty('rza:active')) {
        if (!collectorDrone.getProperty('rza:follow_owner')) {
            if (collectorDrone.getProperty('rza:collections') === 'Items') {
                const itemTarget = collectorDrone.dimension.getEntities({ type: 'minecraft:item', location: collectorDrone.location, closest: 1, maxDistance: 64, excludeTags: [`${collectorDrone.id}_target`, 'targeted', 'invalid'] });
                const itemFound = collectorDrone.dimension.getEntities({ type: 'minecraft:item', location: collectorDrone.location, closest: 1, maxDistance: 64, tags: [`${collectorDrone.id}_target`], excludeTags: [`${collectorDrone.id}_grabbed`, 'invalid'] });
                const grabbableItemFound = collectorDrone.dimension.getEntities({ type: 'minecraft:item', location: collectorDrone.location, closest: 1, maxDistance: 3, tags: [`${collectorDrone.id}_target`], excludeTags: [`${collectorDrone.id}_grabbed`, 'grabbed', 'invalid'] });
                const invalidItemFound = collectorDrone.dimension.getEntities({ type: 'minecraft:item', location: collectorDrone.location, closest: 1, maxDistance: 64, tags: ['invalid'] });
                if (itemTarget.length > 0) {
                    itemTarget.forEach(item => {
                        if (item?.isValid) {
                            const itemLocation = item.location;
                            let blockColumn = [];
                            for (let dy = 1; dy < 48; dy++) {
                                const blockAbove = item.dimension.getBlock({
                                    x: itemLocation.x,
                                    y: itemLocation.y + dy,
                                    z: itemLocation.z
                                });
                                if (blockAbove?.isValid)
                                    blockColumn[dy] = blockAbove.permutation?.matches('minecraft:air');
                            }
                            if (!blockColumn.every(value => value === true))
                                item.addTag('invalid');
                            if (collectorDrone.getProperty('rza:target_capacity') < 16) {
                                const targeted = item.getTags().some(tag => tag.endsWith('_target'));
                                if (!targeted) {
                                    item.addTag(`${collectorDrone.id}_target`);
                                    item.addTag(`targeted`);
                                    collectorDrone.triggerEvent('rza:add_target_capacity');
                                }
                            }
                        }
                    });
                }
                if (itemFound.length > 0 && (collectorDrone.getProperty('rza:capacity') < 16)) {
                    if (droneCollectionDelay.get(collectorDrone.id) > 0)
                        droneCollectionDelay.set(collectorDrone.id, droneCollectionDelay.get(collectorDrone.id) - 1);
                    itemFound.forEach(item => {
                        if (item?.isValid) {
                            const itemLocation = item.location;
                            if (!item.hasTag('invalid')) {
                                if (grabbableItemFound.length > 0) {
                                    const grabbed = grabbableItemFound[0].getTags().some(tag => tag.endsWith('_grabbed'));
                                    if (!grabbed) {
                                        grabbableItemFound[0].addTag(`${collectorDrone.id}_grabbed`);
                                        grabbableItemFound[0].addTag(`grabbed`);
                                        collectorDrone.triggerEvent('rza:add_capacity');
                                    }
                                }
                                const yRotToItem = ((Math.atan2(itemLocation.z - droneLocation.z, itemLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                                collectorDrone.setRotation({
                                    x: collectorDrone.getRotation().x,
                                    y: yRotToItem
                                });
                                const direction = collectorDrone.getViewDirection();
                                const blockInFront = collectorDrone.dimension.getBlock({
                                    x: droneLocation.x + (direction.x * 1),
                                    y: droneLocation.y - 1,
                                    z: droneLocation.z + (direction.z * 1)
                                }).permutation?.matches('minecraft:air');
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
                    if (!collectorDrone.getProperty('rza:deliver_incomplete'))
                        collectorDrone.setProperty('rza:deliver_incomplete', true);
                }
                else if (collectorDrone.getProperty('rza:capacity') == 16 && collectorDrone.getProperty('rza:delivery_location') == 'Player') {
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
                        const ownerInRangeForDrop = collectorDrone.dimension.getPlayers({ location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${collectorDrone.id}_owner`] })[0];
                        const yRotToOwner = ((Math.atan2(ownerLocation.z - droneLocation.z, ownerLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                        collectorDrone.setRotation({
                            x: collectorDrone.getRotation().x,
                            y: yRotToOwner
                        });
                        const direction = collectorDrone.getViewDirection();
                        const blockInFront = collectorDrone.dimension.getBlock({
                            x: droneLocation.x + (direction.x * 1),
                            y: droneLocation.y - 1,
                            z: droneLocation.z + (direction.z * 1)
                        }).permutation?.matches('minecraft:air');
                        if (blockInFront) {
                            collectorDrone.runCommand(`execute facing ${ownerLocation.x} ${ownerLocation.y + 3} ${ownerLocation.z} if entity @p[tag=${collectorDrone.id}_owner, rm=2] run tp @s ^^^0.5`);
                        }
                        else {
                            collectorDrone.runCommand(`tp @s ~~0.5~`);
                        }
                        if (ownerInRangeForDrop == undefined) {
                            collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                            collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                        }
                        if (ownerInRangeForDrop && collectorDrone.getProperty('rza:auto_collect')) {
                            collectorDrone.setProperty('rza:capacity', 0);
                            collectorDrone.setProperty('rza:target_capacity', 0);
                            collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                            collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                            droneCollectionDelay.set(collectorDrone.id, 10);
                        }
                        if (ownerInRangeForDrop && !collectorDrone.getProperty('rza:auto_collect')) {
                            collectorDrone.setProperty('rza:active', false);
                            collectorDrone.setProperty('rza:capacity', 0);
                            collectorDrone.setProperty('rza:target_capacity', 0);
                            collectorDrone.triggerEvent('rza:drone_land');
                            collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                            collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                            droneCollectionDelay.set(collectorDrone.id, 10);
                        }
                    }
                }
                else if (collectorDrone.getProperty('rza:capacity') == 16 && collectorDrone.getProperty('rza:delivery_location') == 'Hopper') {
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
                        const ownerHopperInRangeForDrop = collectorDrone.dimension.getEntities({ type: 'minecraft:hopper_minecart', location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${playerOwner.id}_owned`] })[0];
                        if (hopper?.isValid) {
                            const hopperLocation = hopper.location;
                            const yRotToHopper = ((Math.atan2(hopperLocation.z - droneLocation.z, hopperLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                            collectorDrone.setRotation({
                                x: collectorDrone.getRotation().x,
                                y: yRotToHopper
                            });
                            const direction = collectorDrone.getViewDirection();
                            const blockInFront = collectorDrone.dimension.getBlock({
                                x: droneLocation.x + (direction.x * 1),
                                y: droneLocation.y - 1,
                                z: droneLocation.z + (direction.z * 1)
                            }).permutation?.matches('minecraft:air');
                            if (blockInFront) {
                                collectorDrone.runCommand(`execute facing ${hopperLocation.x} ${hopperLocation.y + 3} ${hopperLocation.z} if entity @e[tag=${playerOwner.id}_owned, c=1] run tp @s ^^^0.5`);
                            }
                            else {
                                collectorDrone.runCommand(`tp @s ~~0.5~`);
                            }
                            if (ownerHopperInRangeForDrop == undefined) {
                                collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                                collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                            }
                            if (ownerHopperInRangeForDrop && collectorDrone.getProperty('rza:auto_collect')) {
                                collectorDrone.setProperty('rza:capacity', 0);
                                collectorDrone.setProperty('rza:target_capacity', 0);
                                collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${hopperLocation.x} ${hopperLocation.y + 2} ${hopperLocation.z}`);
                                collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${hopperLocation.x} ${hopperLocation.y + 2} ${hopperLocation.z}`);
                                droneCollectionDelay.set(collectorDrone.id, 20);
                            }
                            if (ownerHopperInRangeForDrop && !collectorDrone.getProperty('rza:auto_collect')) {
                                collectorDrone.setProperty('rza:active', false);
                                collectorDrone.setProperty('rza:capacity', 0);
                                collectorDrone.setProperty('rza:target_capacity', 0);
                                collectorDrone.triggerEvent('rza:drone_land');
                                collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${hopperLocation.x} ${hopperLocation.y + 2} ${hopperLocation.z}`);
                                collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${hopperLocation.x} ${hopperLocation.y + 2} ${hopperLocation.z}`);
                                droneCollectionDelay.set(collectorDrone.id, 20);
                            }
                        }
                    }
                }
                else if (itemFound.length == 0 && collectorDrone.getProperty('rza:delivery_location') == 'Player') {
                    const playerOwner = droneData.get(collectorDrone.id);
                    const ownerLocation = playerOwner.location;
                    const ownerInRangeForDrop = collectorDrone.dimension.getPlayers({ location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${collectorDrone.id}_owner`] })[0];
                    const yRotToOwner = ((Math.atan2(ownerLocation.z - droneLocation.z, ownerLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                    collectorDrone.setRotation({
                        x: collectorDrone.getRotation().x,
                        y: yRotToOwner
                    });
                    const direction = collectorDrone.getViewDirection();
                    const blockInFront = collectorDrone.dimension.getBlock({
                        x: droneLocation.x + (direction.x * 1),
                        y: droneLocation.y - 1,
                        z: droneLocation.z + (direction.z * 1)
                    }).permutation?.matches('minecraft:air');
                    if (blockInFront) {
                        if (collectorDrone.getProperty('rza:deliver_incomplete')) {
                            collectorDrone.runCommand(`execute facing ${ownerLocation.x} ${ownerLocation.y + 3} ${ownerLocation.z} if entity @p[tag=${collectorDrone.id}_owner, rm=2] run tp @s ^^^0.5`);
                        }
                        if (ownerInRangeForDrop) {
                            collectorDrone.setProperty('rza:deliver_incomplete', false);
                            collectorDrone.setProperty('rza:capacity', 0);
                            collectorDrone.setProperty('rza:target_capacity', 0);
                            collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                            collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                            droneCollectionDelay.set(collectorDrone.id, 10);
                        }
                    }
                    else {
                        collectorDrone.runCommand(`tp @s ~~0.5~`);
                    }
                    if (ownerInRangeForDrop == undefined) {
                        collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                        collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                    }
                }
                else if (itemFound.length == 0 && collectorDrone.getProperty('rza:delivery_location') == 'Hopper') {
                    const playerOwner = droneData.get(collectorDrone.id);
                    const hopper = collectorDrone.dimension.getEntities({ type: 'minecraft:hopper_minecart', location: collectorDrone.location, closest: 1, maxDistance: 100, tags: [`${playerOwner?.id}_owned`] })[0];
                    const ownerHopperInRangeForDrop = collectorDrone.dimension.getEntities({ type: 'minecraft:hopper_minecart', location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${playerOwner.id}_owned`] })[0];
                    if (hopper?.isValid) {
                        const hopperLocation = hopper.location;
                        const yRotToHopper = ((Math.atan2(hopperLocation.z - droneLocation.z, hopperLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                        collectorDrone.setRotation({
                            x: collectorDrone.getRotation().x,
                            y: yRotToHopper
                        });
                        const direction = collectorDrone.getViewDirection();
                        const blockInFront = collectorDrone.dimension.getBlock({
                            x: droneLocation.x + (direction.x * 1),
                            y: droneLocation.y - 1,
                            z: droneLocation.z + (direction.z * 1)
                        }).permutation?.matches('minecraft:air');
                        if (blockInFront) {
                            if (collectorDrone.getProperty('rza:deliver_incomplete')) {
                                collectorDrone.runCommand(`execute facing ${hopperLocation.x} ${hopperLocation.y + 3} ${hopperLocation.z} if entity @e[tag=${playerOwner.id}_owned, c=1] run tp @s ^^^0.5`);
                            }
                            if (ownerHopperInRangeForDrop) {
                                collectorDrone.setProperty('rza:deliver_incomplete', false);
                                collectorDrone.setProperty('rza:capacity', 0);
                                collectorDrone.setProperty('rza:target_capacity', 0);
                                collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${hopperLocation.x} ${hopperLocation.y + 2} ${hopperLocation.z}`);
                                collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${hopperLocation.x} ${hopperLocation.y + 2} ${hopperLocation.z}`);
                                droneCollectionDelay.set(collectorDrone.id, 20);
                            }
                        }
                        else {
                            collectorDrone.runCommand(`tp @s ~~0.5~`);
                        }
                        if (ownerHopperInRangeForDrop == undefined) {
                            collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                            collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.5} ${droneLocation.z} run tp @s ^^^0.7`);
                        }
                    }
                }
                if (invalidItemFound.length > 0) {
                    invalidItemFound.forEach(invalidItem => {
                        if (invalidItem?.isValid) {
                            const itemLocation = invalidItem.location;
                            let blockColumn = [];
                            for (let dy = 1; dy < 48; dy++) {
                                const blockAbove = invalidItem.dimension.getBlock({
                                    x: itemLocation.x,
                                    y: itemLocation.y + dy,
                                    z: itemLocation.z
                                });
                                if (blockAbove?.isValid)
                                    blockColumn[dy] = blockAbove.permutation?.matches('minecraft:air');
                            }
                            if (blockColumn.every(value => value === true))
                                invalidItem.removeTag('invalid');
                        }
                    });
                }
                if (collectorDrone.getProperty('rza:target_capacity') == 16 && collectorDrone.getProperty('rza:capacity') < 16)
                    collectorDrone.setProperty('rza:target_capacity', 15);
            }
            if (collectorDrone.getProperty('rza:collections') === 'XP') {
                const xpTarget = collectorDrone.dimension.getEntities({ type: 'minecraft:xp_orb', location: collectorDrone.location, closest: 1, maxDistance: 64, excludeTags: [`${collectorDrone.id}_target`, 'targeted', 'invalid'] });
                const xpFound = collectorDrone.dimension.getEntities({ type: 'minecraft:xp_orb', location: collectorDrone.location, closest: 1, maxDistance: 64, tags: [`${collectorDrone.id}_target`], excludeTags: [`${collectorDrone.id}_grabbed`, 'invalid'] });
                const grabbableXpOrbFound = collectorDrone.dimension.getEntities({ type: 'minecraft:xp_orb', location: collectorDrone.location, closest: 1, maxDistance: 3, tags: [`${collectorDrone.id}_target`], excludeTags: [`${collectorDrone.id}_grabbed`, 'grabbed', 'invalid'] });
                const invalidXpFound = collectorDrone.dimension.getEntities({ type: 'minecraft:xp_orb', location: collectorDrone.location, closest: 1, maxDistance: 64, tags: ['invalid'] });
                if (xpTarget.length > 0) {
                    xpTarget.forEach(xp => {
                        if (xp?.isValid) {
                            const xpLocation = xp.location;
                            let blockColumn = [];
                            for (let dy = 1; dy < 48; dy++) {
                                const blockAbove = xp.dimension.getBlock({
                                    x: xpLocation.x,
                                    y: xpLocation.y + dy,
                                    z: xpLocation.z
                                });
                                if (blockAbove?.isValid)
                                    blockColumn[dy] = blockAbove.permutation?.matches('minecraft:air');
                            }
                            if (!blockColumn.every(value => value === true))
                                xp.addTag('invalid');
                            if (collectorDrone.getProperty('rza:target_capacity') < 16) {
                                const targeted = xp.getTags().some(tag => tag.endsWith('_target'));
                                if (!targeted) {
                                    xp.addTag(`${collectorDrone.id}_target`);
                                    xp.addTag(`targeted`);
                                    collectorDrone.triggerEvent('rza:add_target_capacity');
                                }
                            }
                        }
                    });
                }
                if (xpFound.length > 0 && (collectorDrone.getProperty('rza:capacity') < 16)) {
                    if (droneCollectionDelay.get(collectorDrone.id) > 0)
                        droneCollectionDelay.set(collectorDrone.id, droneCollectionDelay.get(collectorDrone.id) - 1);
                    xpFound.forEach(xp => {
                        if (xp?.isValid) {
                            const xpLocation = xp.location;
                            if (!xp.hasTag('invalid')) {
                                if (grabbableXpOrbFound.length > 0) {
                                    const grabbed = grabbableXpOrbFound[0].getTags().some(tag => tag.endsWith('_grabbed'));
                                    if (!grabbed) {
                                        grabbableXpOrbFound[0].addTag(`${collectorDrone.id}_grabbed`);
                                        grabbableXpOrbFound[0].addTag(`grabbed`);
                                        collectorDrone.triggerEvent('rza:add_capacity');
                                    }
                                }
                                const yRotToXp = ((Math.atan2(xpLocation.z - droneLocation.z, xpLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                                collectorDrone.setRotation({
                                    x: collectorDrone.getRotation().x,
                                    y: yRotToXp
                                });
                                const direction = collectorDrone.getViewDirection();
                                const blockInFront = collectorDrone.dimension.getBlock({
                                    x: droneLocation.x + (direction.x * 1),
                                    y: droneLocation.y - 1,
                                    z: droneLocation.z + (direction.z * 1)
                                }).permutation?.matches('minecraft:air');
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
                    if (!collectorDrone.getProperty('rza:deliver_incomplete'))
                        collectorDrone.setProperty('rza:deliver_incomplete', true);
                }
                else if (collectorDrone.getProperty('rza:capacity') == 16) {
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
                        const ownerInRangeForDrop = collectorDrone.dimension.getPlayers({ location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${collectorDrone.id}_owner`] });
                        const yRotToOwner = ((Math.atan2(ownerLocation.z - droneLocation.z, ownerLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                        collectorDrone.setRotation({
                            x: collectorDrone.getRotation().x,
                            y: yRotToOwner
                        });
                        const direction = collectorDrone.getViewDirection();
                        const blockInFront = collectorDrone.dimension.getBlock({
                            x: droneLocation.x + (direction.x * 1),
                            y: droneLocation.y - 1,
                            z: droneLocation.z + (direction.z * 1)
                        }).permutation?.matches('minecraft:air');
                        if (blockInFront) {
                            collectorDrone.runCommand(`execute facing ${ownerLocation.x} ${ownerLocation.y + 3} ${ownerLocation.z} if entity @p[tag=${collectorDrone.id}_owner, rm=2] run tp @s ^^^0.5`);
                        }
                        else {
                            collectorDrone.runCommand(`tp @s ~~0.5~`);
                        }
                        collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.7} ${droneLocation.z} run tp @s ^^^0.7`);
                        collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.7} ${droneLocation.z} run tp @s ^^^0.7`);
                        if (ownerInRangeForDrop.length > 0 && collectorDrone.getProperty('rza:auto_collect')) {
                            collectorDrone.setProperty('rza:capacity', 0);
                            collectorDrone.setProperty('rza:target_capacity', 0);
                            collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                            collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                            droneCollectionDelay.set(collectorDrone.id, 10);
                        }
                        if (ownerInRangeForDrop.length > 0 && !collectorDrone.getProperty('rza:auto_collect')) {
                            collectorDrone.setProperty('rza:active', false);
                            collectorDrone.setProperty('rza:capacity', 0);
                            collectorDrone.setProperty('rza:target_capacity', 0);
                            collectorDrone.triggerEvent('rza:drone_land');
                            collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                            collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                            droneCollectionDelay.set(collectorDrone.id, 10);
                        }
                    }
                }
                else {
                    const playerOwner = droneData.get(collectorDrone.id);
                    const ownerLocation = playerOwner.location;
                    const ownerInRangeForDrop = collectorDrone.dimension.getPlayers({ location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${collectorDrone.id}_owner`] });
                    const yRotToOwner = ((Math.atan2(ownerLocation.z - droneLocation.z, ownerLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
                    collectorDrone.setRotation({
                        x: collectorDrone.getRotation().x,
                        y: yRotToOwner
                    });
                    const direction = collectorDrone.getViewDirection();
                    const blockInFront = collectorDrone.dimension.getBlock({
                        x: droneLocation.x + (direction.x * 1),
                        y: droneLocation.y - 1,
                        z: droneLocation.z + (direction.z * 1)
                    }).permutation?.matches('minecraft:air');
                    if (blockInFront) {
                        if (collectorDrone.getProperty('rza:deliver_incomplete')) {
                            collectorDrone.runCommand(`execute facing ${ownerLocation.x} ${ownerLocation.y + 3} ${ownerLocation.z} if entity @p[tag=${collectorDrone.id}_owner, rm=2] run tp @s ^^^0.5`);
                        }
                        if (ownerInRangeForDrop.length > 0) {
                            collectorDrone.setProperty('rza:deliver_incomplete', false);
                            collectorDrone.setProperty('rza:capacity', 0);
                            collectorDrone.setProperty('rza:target_capacity', 0);
                            collectorDrone.runCommand(`tp @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                            collectorDrone.runCommand(`tp @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`);
                            droneCollectionDelay.set(collectorDrone.id, 10);
                        }
                    }
                    else {
                        collectorDrone.runCommand(`tp @s ~~0.5~`);
                    }
                    collectorDrone.runCommand(`execute at @s as @e[type=xp_orb, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.7} ${droneLocation.z} run tp @s ^^^0.7`);
                    collectorDrone.runCommand(`execute at @s as @e[type=item, tag=${collectorDrone.id}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 0.7} ${droneLocation.z} run tp @s ^^^0.7`);
                }
                if (invalidXpFound.length > 0) {
                    invalidXpFound.forEach(invalidXp => {
                        if (invalidXp?.isValid) {
                            const xpLocation = invalidXp.location;
                            let blockColumn = [];
                            for (let dy = 1; dy < 48; dy++) {
                                const blockAbove = invalidXp.dimension.getBlock({
                                    x: xpLocation.x,
                                    y: xpLocation.y + dy,
                                    z: xpLocation.z
                                });
                                if (blockAbove?.isValid)
                                    blockColumn[dy] = blockAbove.permutation?.matches('minecraft:air');
                            }
                            if (blockColumn.every(value => value === true))
                                invalidXp.removeTag('invalid');
                        }
                    });
                }
                if (collectorDrone.getProperty('rza:target_capacity') == 16 && collectorDrone.getProperty('rza:capacity') < 16)
                    collectorDrone.setProperty('rza:target_capacity', 15);
            }
        }
        else {
            const ownerInRangeForDrop = collectorDrone.dimension.getPlayers({ location: collectorDrone.location, closest: 1, maxDistance: 4, tags: [`${collectorDrone.id}_owner`] });
            const playerOwner = droneData.get(collectorDrone.id);
            const ownerLocation = playerOwner.location;
            collectorDrone.dimension.getEntities({ type: 'minecraft:item', location: collectorDrone.location, minDistance: 4, maxDistance: 64, tags: [`${collectorDrone.id}_target`] }).forEach(item => {
                if (item.hasTag(`${collectorDrone.id}_target`)) {
                    item.removeTag(`${collectorDrone.id}_target`);
                    item.removeTag(`${collectorDrone.id}_grabbed`);
                    item.removeTag(`targeted`);
                    item.removeTag(`grabbed`);
                }
            });
            collectorDrone.dimension.getEntities({ type: 'minecraft:xp_orb', location: collectorDrone.location, minDistance: 4, maxDistance: 64, tags: [`${collectorDrone.id}_target`] }).forEach(xp => {
                if (xp.hasTag(`${collectorDrone.id}_target`)) {
                    xp.removeTag(`${collectorDrone.id}_target`);
                    xp.removeTag(`${collectorDrone.id}_grabbed`);
                    xp.removeTag(`targeted`);
                    xp.removeTag(`grabbed`);
                }
            });
            const yRotToOwner = ((Math.atan2(ownerLocation.z - droneLocation.z, ownerLocation.x - droneLocation.x)) * (180 / Math.PI)) - 90;
            collectorDrone.setRotation({
                x: collectorDrone.getRotation().x,
                y: yRotToOwner
            });
            const direction = collectorDrone.getViewDirection();
            const blockInFront = collectorDrone.dimension.getBlock({
                x: droneLocation.x + (direction.x * 1),
                y: droneLocation.y - 1,
                z: droneLocation.z + (direction.z * 1)
            }).permutation?.matches('minecraft:air');
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
                droneCollectionDelay.set(collectorDrone.id, 10);
            }
        }
    }
    return;
}
