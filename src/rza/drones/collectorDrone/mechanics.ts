import { Dimension, Entity, ItemStack, Player, system, Vector3, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { pathfind } from "rza/pathfinder";

//Collector Drone data - Player owner and player owner hopper pairing
let droneData = new Map();
let droneCollectionDelay = new Map();

// Add these global maps to track item targeting across drones
const droneTargets = new Map<string, Set<string>>(); // Maps drone IDs to sets of targeted item IDs
const itemTargets = new Map<string, string>(); // Maps item IDs to drone IDs targeting them
const pathfindCooldowns = new Map<string, number>(); // Tracks pathfinding cooldowns per drone

// Add pathfinding state tracking
const pathfindingInProgress = new Map<string, boolean>();

// Add path failure counter
const pathFailureCounter = new Map<string, number>();

// Add these constants at the top of the file
const TURN_SMOOTHING = 0.45; // Lower = smoother turns
const MAX_TURN_RATE = 25; // Maximum degrees per tick

// Add this tracking map at the top with other maps
const lastRotations = new Map<string, number>();

export function ownerCollectorDroneCounter(player: Player) {
    const maxDrones = world.scoreboard.getObjective('max_drones') ?? world.scoreboard.addObjective('max_drones', 'Max Drones');
    if (!maxDrones.hasParticipant(player.id)) {
        let run = system.run(() => {
            maxDrones.setScore(player.id, 1);
            system.clearRun(run);
        });
    }
    else if ((maxDrones.getScore(player.id) ?? 0) < 3) {
        let run = system.run(() => {
            const currentScore = maxDrones.getScore(player.id) ?? 0;
            maxDrones.setScore(player.id, currentScore + 1);
            system.clearRun(run);
        });
    }
    else if (maxDrones.getScore(player.id) == 3) {
        player.sendMessage('[SYSTEM] There can only be a maximum of §23§r drones for each player.');
        const droneToKill = player.dimension.getEntities({ type: 'rza:collector_drone', closest: 1, location: player.location })[0];
        if (droneToKill) droneToKill.kill();
        player.dimension.spawnItem(new ItemStack('rza:collector_drone_item', 1), player.location);
    }
}

export function collectorDroneOwnerPairing(drone: Entity, playerOwner: Player) {
    if (!droneData.has(drone.id)) {
        droneData.set(drone.id, playerOwner);

        if (!playerOwner?.hasTag(`${drone.id}_owner`)) playerOwner.addTag(`${drone.id}_owner`);
        if (!drone?.hasTag(`${playerOwner.id}_owned`)) drone.addTag(`${playerOwner.id}_owned`);
    }
    // Initialize pathfinding cooldown
    pathfindCooldowns.set(drone.id, 0);
    droneCollectionDelay.set(drone.id, 0);
    return;
}

export function collectorDroneHopperPairing(hopper: Entity, playerOwner: Player) {
    if (!droneData.has(hopper.id)) {
        droneData.set(hopper.id, hopper);

        if (!hopper?.hasTag(`${playerOwner.id}_owned`)) hopper.addTag(`${playerOwner.id}_owned`);
    }
    return;
}

export function collectorDroneOwnerRepair(drone: Entity) {
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

export function collectorDroneConfigurator(entity: Entity) {
    let collectorDrone = entity;
    const configurator = collectorDrone.dimension.getPlayers({ closest: 1, location: collectorDrone.location });
    let player = configurator[0];
    if (!player) return;
    let collections = ['Items', 'XP'];
    let deliveryLocations = ['Player', 'Hopper'];
    let selectedCollection = collectorDrone.getProperty('rza:collections') as string;
    let selectedDeliveryLocation = collectorDrone.getProperty('rza:delivery_location') as string;

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
        .toggle('Active', collectorDrone.getProperty('rza:active') as boolean)
        .toggle('Auto Collect', collectorDrone.getProperty('rza:auto_collect') as boolean)
        .dropdown('What to Collect:', collections)
        .dropdown('Where to Deliver (For items only):', deliveryLocations)
        .show(player)
        .then((result) => {
            if (!result || !result.formValues) return;
            const formValues = result.formValues as [boolean, boolean, number, number];
            const [activeToggle, autoCollectToggle, collectionDropdown, locationDropdown] = formValues;

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

            if (activeToggle) {
                collectorDrone.triggerEvent('rza:drone_hover');
                // Initialize pathfinding cooldown when activated
                pathfindCooldowns.set(collectorDrone.id, 0);
            }
            if (!activeToggle) collectorDrone.triggerEvent('rza:drone_land');
        }).catch((e) => {
            console.error(e, e.stack)
        });
}

//Remove drone-tagged items/xp orbs upon drone destruction/unload
export function collectorDroneUnload(droneId: string) {
    world.getPlayers({ tags: [`${droneId}_owner`] }).forEach(owner => {
        const ownerLocation = owner.location;

        //Items
        owner.dimension.getEntities({ type: 'minecraft:item', location: ownerLocation }).forEach(item => {
            item.removeTag(`${droneId}_target`);
            item.removeTag(`${droneId}_grabbed`);
            item.removeTag(`invalid`);
            owner.removeTag(`${droneId}_owner`);
        });

        //XP Orbs
        owner.dimension.getEntities({ type: 'minecraft:xp_orb', location: ownerLocation }).forEach(xp => {
            xp.removeTag(`${droneId}_target`);
            xp.removeTag(`${droneId}_grabbed`);
            xp.removeTag(`invalid`);
            owner.removeTag(`${droneId}_owner`);
        });
    });

    // Clean up targeting maps
    if (droneTargets.has(droneId)) {
        const targetItems = droneTargets.get(droneId);
        if (targetItems instanceof Set) {
            for (const itemId of targetItems) {
                itemTargets.delete(itemId);
            }
        }
    }
    droneTargets.delete(droneId);
    pathfindCooldowns.delete(droneId);
    pathfindingInProgress.delete(droneId);
    pathFailureCounter.delete(droneId);
    return;
}

export function collectorDroneDie(drone: Entity, playerOwner: Player) {
    const maxDrones = world.scoreboard.getObjective('max_drones') ?? world.scoreboard.addObjective('max_drones', 'Max Drones');
    if (droneData.has(drone.id)) {
        if (playerOwner?.hasTag(`${drone.id}_owner`)) playerOwner.removeTag(`${drone.id}_owner`);
        let droneCount = playerOwner?.dimension.getEntities({ type: 'rza:collector_drone', location: playerOwner.location });

        if (droneCount.length < 3 && playerOwner && (maxDrones.getScore(playerOwner.id) ?? 0) > 0) {
            system.run(() => {
                const currentScore = maxDrones.getScore(playerOwner.id) ?? 0;
                if (currentScore > 0) maxDrones.setScore(playerOwner.id, currentScore - 1);
            });
        }
    }
    return;
}

export function collectorDroneMechanics(collectorDrone: Entity) {
    const droneLocation = collectorDrone.location;
    collectorDrone.addEffect('slow_falling', 2, { showParticles: false, amplifier: 255 });

    if (collectorDrone.getProperty('rza:active')) {
        try {
            //Mode: Collect Items / XP
            if (!collectorDrone.getProperty('rza:follow_owner')) {
                // Collection mode
                const collection = collectorDrone.getProperty('rza:collections') as string;
                const targetType = collection === 'Items' ? 'minecraft:item' : 'minecraft:xp_orb';
                collectionActive(collectorDrone, droneLocation, targetType);
            } else {
                // Follow owner mode
                const droneId = collectorDrone.id;
                const playerOwner = droneData.get(droneId) as Player;
                const ownerLocation = playerOwner.location;

                // Clear tags from uncollected items/xp
                ['minecraft:item', 'minecraft:xp_orb'].forEach(type => {
                    collectorDrone.dimension.getEntities({
                        type,
                        location: droneLocation,
                        minDistance: 4,
                        maxDistance: 64,
                        tags: [`${droneId}_target`]
                    }).forEach(entity => {
                        ['_target', '_grabbed'].forEach(tag =>
                            entity.removeTag(`${droneId}${tag}`));
                    });
                });

                // Face and move towards owner
                const yRotToOwner = Math.atan2(ownerLocation.z - droneLocation.z, ownerLocation.x - droneLocation.x) * (180 / Math.PI) - 90;
                collectorDrone.setRotation({ x: collectorDrone.getRotation().x, y: yRotToOwner });

                const blockInFront = collectorDrone.dimension.getBlock({
                    x: droneLocation.x + (collectorDrone.getViewDirection().x * 1),
                    y: droneLocation.y - 1,
                    z: droneLocation.z + (collectorDrone.getViewDirection().z * 1)
                });

                const isAirBlock = blockInFront?.permutation?.matches('minecraft:air') ?? false;

                collectorDrone.runCommand(isAirBlock ?
                    `execute facing ${ownerLocation.x} ${ownerLocation.y + 3} ${ownerLocation.z} if entity @p[tag=${droneId}_owner, rm=2] run tp @s ^^^0.5` :
                    `tp @s ~~0.5~`
                );

                // Update grabbed entities position
                ['xp_orb', 'item'].forEach(type =>
                    collectorDrone.runCommand(`execute at @s as @e[type=${type}, tag=${droneId}_grabbed, r=3] at @s facing ${droneLocation.x} ${droneLocation.y + 1} ${droneLocation.z} run tp @s ^^^0.7`)
                );

                // Handle delivery when in range
                const ownerInRange = collectorDrone.dimension.getPlayers({
                    location: droneLocation,
                    closest: 1,
                    maxDistance: 4,
                    tags: [`${droneId}_owner`]
                }).length > 0;

                if (ownerInRange) {
                    collectorDrone.setProperty('rza:capacity', 0);
                    collectorDrone.setProperty('rza:target_capacity', 0);
                    ['item', 'xp_orb'].forEach(type =>
                        collectorDrone.runCommand(`tp @e[type=${type}, tag=${droneId}_grabbed, r=3] ${ownerLocation.x} ${ownerLocation.y + 1} ${ownerLocation.z}`)
                    );
                    droneCollectionDelay.set(droneId, 10);
                }
            }
        } catch (e) { }

    }
    return;
}

// Modify the collectionActive function to ensure cooldown is initialized
function collectionActive(collectorDrone: Entity, droneLocation: Vector3, targetCollection: string) {
    const droneId = collectorDrone.id;

    // Ensure cooldown is initialized
    if (!pathfindCooldowns.has(droneId)) {
        pathfindCooldowns.set(droneId, 0);
    }

    // Initialize pathfinding state if needed
    if (!pathfindingInProgress.has(droneId)) {
        pathfindingInProgress.set(droneId, false);
    }

    // Initialize failure counter if needed
    if (!pathFailureCounter.has(droneId)) {
        pathFailureCounter.set(droneId, 0);
    }

    const capacity = collectorDrone.getProperty('rza:capacity') as number;
    const deliveryIncomplete = collectorDrone.getProperty('rza:deliver_incomplete') as boolean;
    const searchRange = 32;

    // Initialize drone's target set if not exists
    if (!droneTargets.has(droneId)) {
        droneTargets.set(droneId, new Set());
    }

    // Update pathfind cooldown
    const currentCooldown = pathfindCooldowns.get(droneId) || 0;
    if (currentCooldown > 0) {
        pathfindCooldowns.set(droneId, currentCooldown - 1);
    }

    // Handle item collection while capacity not full and no pending delivery
    if (capacity < 16 && !deliveryIncomplete) {
        if (droneCollectionDelay.get(droneId) > 0) {
            droneCollectionDelay.set(droneId, droneCollectionDelay.get(droneId) - 1);
            return;
        }

        const targetItem = findBestTarget(collectorDrone, droneId, droneLocation, searchRange, targetCollection);

        if (targetItem) {
            const targetLoc = targetItem.location;
            const currentRotation = collectorDrone.getRotation().y;

            // Calculate target rotation
            const targetRotation = Math.atan2(
                targetLoc.z - droneLocation.z,
                targetLoc.x - droneLocation.x
            ) * (180 / Math.PI) - 90;

            // Get or initialize last rotation
            const lastRotation = lastRotations.get(droneId) ?? currentRotation;

            // Calculate shortest turn direction
            let rotationDiff = targetRotation - lastRotation;
            if (rotationDiff > 180) rotationDiff -= 360;
            if (rotationDiff < -180) rotationDiff += 360;

            // Apply smoothing and limit turn rate
            const smoothedRotation = lastRotation + Math.min(
                Math.max(rotationDiff * TURN_SMOOTHING, -MAX_TURN_RATE),
                MAX_TURN_RATE
            );

            // Update rotation
            collectorDrone.setRotation({
                x: collectorDrone.getRotation().x,
                y: smoothedRotation
            });

            // Store rotation for next tick
            lastRotations.set(droneId, smoothedRotation);

            // Only attempt pathfinding if not on cooldown and not already pathfinding
            if (pathfindCooldowns.get(droneId) === 0 && !pathfindingInProgress.get(droneId)) {
                pathfindingInProgress.set(droneId, true);

                // world.sendMessage(`§eTarget found - Type: ${targetItem.typeId}`);
                pathfind(collectorDrone, droneLocation, targetLoc).then((success) => {
                    pathfindingInProgress.set(droneId, false);

                    // world.sendMessage(`§bPathfinding result: ${success ? "§aSuccess" : "§cFailed"}`);

                    if (!success) {
                        // Increment failure counter
                        pathFailureCounter.set(droneId, (pathFailureCounter.get(droneId) || 0) + 1);

                        // Set a shorter cooldown on failure
                        pathfindCooldowns.set(droneId, 10);
                    } else {
                        // Reset failure counter on success
                        pathFailureCounter.set(droneId, 0);
                        // Set normal cooldown on success
                        pathfindCooldowns.set(droneId, 20);
                    }
                });
            }
        }

        // Handle item pickup when in range
        const nearbyTargets = collectorDrone.dimension.getEntities({
            type: targetCollection,
            location: droneLocation,
            maxDistance: 3,
            tags: [`${droneId}_target`]
        });

        for (const item of nearbyTargets) {
            if (!item.hasTag(`${droneId}_grabbed`) && !item.hasTag('grabbed')) {
                item.addTag(`${droneId}_grabbed`);
                item.addTag('grabbed');
                collectorDrone.triggerEvent('rza:add_capacity');

                // Reset pathfinding cooldown on successful pickup
                pathfindCooldowns.set(droneId, 0);

                // Clean up targeting maps
                cleanupItemTarget(item.id);
                break;
            }
        }

        // Keep grabbed items following drone
        if (droneCollectionDelay.get(droneId) === 0) {
            collectorDrone.runCommand(
                `execute as @e[type=${targetCollection}, tag=${droneId}_grabbed] at @s facing ${droneLocation.x} ${droneLocation.y + 0.7} ${droneLocation.z} run tp @s ^^^1.7`
            );
        }

        // Check if should deliver current items
        if (capacity > 0 && !targetItem) {
            collectorDrone.setProperty('rza:deliver_incomplete', true);
        }
    }

    // Handle delivery when delivering
    if (deliveryIncomplete || capacity === 16) {
        const playerOwner = droneData.get(droneId) as Player;
        const deliverToHopper = collectorDrone.getProperty('rza:delivery_location') === 'Hopper' && targetCollection !== 'minecraft:xp_orb';

        const validItem = findBestTarget(collectorDrone, droneId, droneLocation, searchRange, targetCollection);

        // Go back to collecting items/xp if there is a valid collectible found
        if (validItem && capacity < 16) { collectorDrone.setProperty('rza:deliver_incomplete', false); return; }

        const target = deliverToHopper ?
            collectorDrone.dimension.getEntities({
                type: 'minecraft:hopper_minecart',
                tags: [`${playerOwner.id}_owned`],
                closest: 1,
                location: droneLocation,
                maxDistance: 100
            })[0] :
            playerOwner;

        if (!target) return;

        const targetLoc = target.location;
        const inRange = collectorDrone.dimension.getEntities({
            location: droneLocation,
            maxDistance: 4,
            closest: 1,
            type: deliverToHopper && targetCollection === 'minecraft:item' ? 'minecraft:hopper_minecart' : 'minecraft:player',
            tags: deliverToHopper && targetCollection === 'minecraft:item' ? [`${playerOwner.id}_owned`] : [`${droneId}_owner`]
        }).length > 0;

        // Move to target
        collectorDrone.setRotation({
            x: collectorDrone.getRotation().x,
            y: Math.atan2(targetLoc.z - droneLocation.z, targetLoc.x - droneLocation.x) * (180 / Math.PI) - 90
        });

        if (!inRange) {
            if (pathfindCooldowns.get(droneId) === 0 && !pathfindingInProgress.get(droneId)) {
                pathfindingInProgress.set(droneId, true);
                pathfind(collectorDrone, droneLocation, targetLoc).then((success) => {
                    pathfindingInProgress.set(droneId, false);

                    // world.sendMessage(`§bPathfinding result: ${success ? "§aSuccess" : "§cFailed"}`);

                    if (!success) {
                        // Increment failure counter for delivery attempts
                        pathFailureCounter.set(droneId, (pathFailureCounter.get(droneId) || 0) + 1);

                        // Check if failures exceed threshold
                        if ((pathFailureCounter.get(droneId) ?? 0) >= 10) {
                            // Reset counter
                            pathFailureCounter.set(droneId, 0);

                            // Teleport drone above target with slight offset to avoid getting stuck
                            const teleportPos = {
                                x: targetLoc.x,
                                y: targetLoc.y + 2,
                                z: targetLoc.z
                            };
                            collectorDrone.teleport(teleportPos);
                            // world.sendMessage("§eDrone teleported near delivery target after multiple pathfinding failures");
                        }
                    } else {
                        // Reset failure counter on success
                        pathFailureCounter.set(droneId, 0);
                    }

                    // Set cooldown based on delivery type
                    if (success && deliverToHopper) {
                        pathfindCooldowns.set(droneId, 60);
                    } else {
                        pathfindCooldowns.set(droneId, success ? 20 : 1);
                    }
                });
            }
            // Keep grabbed items following
            collectorDrone.runCommand(
                `execute as @e[type=${targetCollection}, tag=${droneId}_grabbed, r=5] at @s facing ${droneLocation.x} ${droneLocation.y + 0.7} ${droneLocation.z} run tp @s ^^^1.7`
            );
        } else {
            // Deliver items
            collectorDrone.runCommand(`tp @e[type=${targetCollection}, tag=${droneId}_grabbed] ${targetLoc.x} ${targetLoc.y + (deliverToHopper && targetCollection === 'minecraft:item' ? 2 : 1)} ${targetLoc.z}`);

            collectorDrone.setProperty('rza:capacity', 0);
            collectorDrone.setProperty('rza:target_capacity', 0);
            collectorDrone.setProperty('rza:deliver_incomplete', false);

            if (!collectorDrone.getProperty('rza:auto_collect')) {
                collectorDrone.setProperty('rza:active', false);
                collectorDrone.triggerEvent('rza:drone_land');
            }

            droneCollectionDelay.set(droneId, deliverToHopper ? 20 : 10);

            // Clear targeting from remaining items
            collectorDrone.dimension.getEntities({
                type: 'minecraft:item',
                location: droneLocation,
                minDistance: 4,
                maxDistance: searchRange,
                tags: [`${droneId}_target`]
            }).forEach(item => {
                item.removeTag(`${droneId}_target`);
                item.removeTag('targeted');
            });
        }
    }

    // Clean up the failure counter when drone is deactivated or removed
    if (!collectorDrone.isValid()) {
        pathFailureCounter.delete(droneId);
    }
    return;
}

function findBestTarget(drone: Entity, droneId: string, droneLocation: Vector3, searchRange: number, targetCollection: string): Entity | undefined {
    const currentCapacity = drone.getProperty('rza:capacity') as number;
    // const targetCapacity = drone.getProperty('rza:target_capacity') as number;

    // Display capacity information on actionbar
    // const playerOwner = droneData.get(droneId) as Player;
    // if (playerOwner?.isValid()) {
    //     playerOwner.onScreenDisplay.setActionBar(`§eDrone Capacity: ${currentCapacity}/16 (Targeted: ${targetCapacity}/16)`);
    // }

    const nearbyItems = drone.dimension.getEntities({
        type: targetCollection,
        location: droneLocation,
        maxDistance: searchRange,
        closest: 8,
        excludeTags: ['invalid', 'grabbed']
    }).filter(item => {
        if (!item.isValid() || item.hasTag(`${droneId}_grabbed`)) return false;

        // Get all tags that end with '_target'
        const targetTags = item.getTags().filter(tag => tag.endsWith('_target'));

        // If no target tags, include the item
        if (targetTags.length === 0) return true;

        // If has target tags, only include if targeted by this drone
        return targetTags.some(tag => tag === `${droneId}_target`);
    });

    // Update target capacity based on available items
    const availableSpace = 16 - currentCapacity;
    const potentialTargets = Math.min(availableSpace, nearbyItems.length);
    drone.setProperty('rza:target_capacity', currentCapacity + potentialTargets);

    // Don't proceed if we can't target more items
    if (potentialTargets <= 0) return undefined;

    let bestTarget: Entity | undefined;
    let bestScore = Infinity;

    for (const item of nearbyItems) {
        const accessibilityScore = calculateAccessibilityScore(item, drone.dimension);
        if (accessibilityScore === -1) {
            item.addTag('invalid');
            continue;
        }

        const distance = calculateDistance(droneLocation, item.location);
        const score = distance * (1 + accessibilityScore);

        if (score < bestScore) {
            bestScore = score;
            bestTarget = item;
        }
    }

    if (bestTarget) {
        if (!droneTargets.has(droneId)) {
            droneTargets.set(droneId, new Set());
        }

        droneTargets.get(droneId)?.add(bestTarget.id);
        itemTargets.set(bestTarget.id, droneId);

        bestTarget.addTag(`${droneId}_target`);
        bestTarget.addTag('targeted');
    }

    return bestTarget;
}

function calculateAccessibilityScore(item: Entity, dimension: Dimension): number {
    let blockedCount = 0;
    const maxHeight = 24; // Check up to 24 blocks above

    for (let dy = 1; dy <= maxHeight; dy++) {
        const blockAbove = dimension.getBlock({
            x: item.location.x,
            y: item.location.y + dy,
            z: item.location.z
        });

        if (!blockAbove?.isValid) continue;
        if (!blockAbove.permutation?.matches('minecraft:air')) {
            blockedCount++;
            if (blockedCount > 2) return -1; // Too obstructed
        }
    }

    return blockedCount / maxHeight;
}

function calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function cleanupItemTarget(itemId: string) {
    const droneId = itemTargets.get(itemId);
    if (droneId) {
        droneTargets.get(droneId)?.delete(itemId);
        itemTargets.delete(itemId);
    }
}