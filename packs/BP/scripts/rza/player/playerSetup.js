import { system, world } from "@minecraft/server";
import { meleeWeaponCooldown } from "rza/weapons/melee";
function playerSetup() {
    const onSpawn = world.afterEvents.playerSpawn.subscribe((spawn) => {
        const player = spawn.player;
        let title = system.runTimeout(() => {
            player.runCommand("title @s title §6RABOY'S §2ZOMBIE §4APOCALYPSE§r");
            system.clearRun(title);
        }, 300);
        let sysmes = system.runTimeout(() => {
            player.sendMessage(`[SYSTEM] Welcome to §6Raboy's §2Zombie §4Apocalypse§r!\nGood luck and have fun!`);
            system.clearRun(sysmes);
        }, 400);
        meleeWeaponCooldown.set(player.id, 0);
        world.afterEvents.playerSpawn.unsubscribe(onSpawn);
        playerSetup();
        return;
    });
}
playerSetup();
