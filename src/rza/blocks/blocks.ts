import { Block } from "@minecraft/server";

export function blockFeatures(core: Block, blockTypeId: string) {
    const location = core.center();
    if (blockTypeId === 'rza:active_electron_reactor_core') {
        core.dimension.spawnParticle('rza:active_electron_reactor_core', location);
    }
    return;
}