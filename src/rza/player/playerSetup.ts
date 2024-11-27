import { system, world } from "@minecraft/server";
import { meleeWeaponCooldown } from "rza/weapons/melee";

function playerSetup() {
    const onSpawn = world.afterEvents.playerSpawn.subscribe((spawn) => {
        const player = spawn.player;
        const initialSpawn = spawn.initialSpawn;

        if (initialSpawn) {
            let title = system.runTimeout(() => {
                player.onScreenDisplay.setTitle('title') // Image title in JSON UI
                let sysmes = system.runTimeout(() => {
                    player.sendMessage(`[SYSTEM] Welcome to §6Raboy's §2Zombie §4Apocalypse§r!`);
                    let sysmes2 = system.runTimeout(() => {
                        player.sendMessage(`[SYSTEM] Good luck and have fun!`);
                        system.clearRun(sysmes2);
                        system.clearRun(sysmes);
                        system.clearRun(title);
                    }, 60);
                }, 140);
            }, 300);

            meleeWeaponCooldown.set(player.id, 0);
            world.afterEvents.playerSpawn.unsubscribe(onSpawn);
            playerSetup();
            return;
        }
        return;
    });


}
playerSetup();