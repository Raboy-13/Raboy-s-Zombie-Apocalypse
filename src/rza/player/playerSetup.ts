import { world } from "@minecraft/server";

function playerSetup() {
    const onSpawn = world.afterEvents.playerSpawn.subscribe((spawn) => {
        const player = spawn.player;

        if (!player?.hasTag('start')) {
            player.addTag('start');

            player.runCommand("title @s title §6RABOY'S §2ZOMBIE §4APOCALYPSE");
        }
        
        world.afterEvents.playerSpawn.unsubscribe(onSpawn);
        playerSetup();
        return;
    });


}
playerSetup();