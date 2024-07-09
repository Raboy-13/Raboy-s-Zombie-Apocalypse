import { Entity, system } from "@minecraft/server";

export function stormWeaverhit(entity: Entity, source: Entity) {
    let lastHitLocation = entity.location;

    let delayTick = system.runTimeout(() => {
        source.runCommand('scoreboard players set @s lightning_branch 48');
        source.runCommand(`execute positioned ${lastHitLocation.x} ${lastHitLocation.y} ${lastHitLocation.z} facing entity @e[family=zombie, rm=8, r=92, c=1, tag=!chainer] eyes run function world/turrets/storm_weaver/turret/branch`);
        system.clearRun(delayTick);
    }, 1);
    return;
}