export function collectorDroneRemote(player) {
    const playerLocation = player.location;
    const playerOwnedTag = `${player.id}_owned`;
    const collectorDrones = player.dimension.getEntities({
        type: 'rza:collector_drone',
        location: playerLocation,
        tags: [playerOwnedTag]
    });
    player.runCommand('execute anchored eyes positioned ^^^2 run playsound click_on.metal_pressure_plate @s ~~~');
    if (player.isSneaking) {
        const firstDrone = collectorDrones[0];
        if (!firstDrone)
            return;
        const isActive = firstDrone.getProperty('rza:active');
        collectorDrones.forEach(collectorDrone => {
            collectorDrone.setProperty('rza:active', !isActive);
            if (isActive) {
                collectorDrone.setProperty('rza:follow_owner', false);
                collectorDrone.triggerEvent('rza:drone_land');
                player.runCommand('title @s actionbar §4Collector Drones§r: Deactivated');
            }
            else {
                player.runCommand('title @s actionbar §2Collector Drones§r: Activated');
                collectorDrone.triggerEvent('rza:drone_hover');
            }
        });
        return;
    }
    if (!collectorDrones[0]?.getProperty('rza:active')) {
        player.runCommand('title @s actionbar §4Collector Drones§r: Must activate drones first');
        return;
    }
    collectorDrones.forEach(collectorDrone => {
        collectorDrone.setProperty('rza:active', true);
        const followOwner = collectorDrone.getProperty('rza:follow_owner');
        if (followOwner) {
            collectorDrone.setProperty('rza:follow_owner', false);
            player.runCommand('title @s actionbar §2Collector Drones§r: Collect Items / XP');
        }
        else {
            collectorDrone.setProperty('rza:follow_owner', true);
            player.runCommand('title @s actionbar §2Collector Drones§r: Follow Owner');
        }
    });
    const nearbyCollectibles = player.dimension.getEntities({
        tags: ['targeted'],
        location: playerLocation,
        maxDistance: 128
    });
    nearbyCollectibles.forEach(collectible => {
        collectible.removeTag('targeted');
    });
    return;
}
