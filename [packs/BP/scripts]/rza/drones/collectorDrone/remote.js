export function collectorDroneRemote(player) {
    const playerLocation = player.location;
    const playerOwnedTag = `${player.id}_owned`;
    const collectorDrones = player.dimension.getEntities({ type: 'rza:collector_drone', location: playerLocation, tags: [playerOwnedTag] });
    player.runCommand('execute anchored eyes positioned ^^^2 run playsound click_on.metal_pressure_plate @s ~~~');
    collectorDrones.forEach(collectorDrone => {
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
    const nearbyCollectibles = player.dimension.getEntities({ tags: ['targeted'], location: playerLocation, maxDistance: 128 });
    nearbyCollectibles.forEach(collectible => {
        collectible.removeTag('targeted');
    });
    return;
}
