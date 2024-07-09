import { Player } from "@minecraft/server";

export function collectorDroneRemote(player: Player) {
    player.runCommand('execute anchored eyes positioned ^^^2 run playsound click_on.metal_pressure_plate @s ~~~');

    player.dimension.getEntities({ type: 'rza:collector_drone', location: player.location, tags: [`${player.id}_owned`] }).forEach(collectorDrone => {
        if (collectorDrone.getProperty('rza:follow_owner')) {
            collectorDrone.setProperty('rza:follow_owner', false);
            player.runCommand('title @s actionbar §2Collector Drones§r: Collect Items / XP');
        }
        if (!collectorDrone.getProperty('rza:follow_owner')) {
            collectorDrone.setProperty('rza:follow_owner', true);
            player.runCommand('title @s actionbar §2Collector Drones§r: Follow Owner');
        }
    });
    return;
}