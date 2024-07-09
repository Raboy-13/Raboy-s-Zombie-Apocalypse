import { BlockPermutation } from "@minecraft/server";

//Placed active electron reactor core data
let electronReactorCoreData = {
    "location": new Map(),
    "timer": 40
}

export function placeActiveElectronReactorCore(block) {
    electronReactorCoreData.location.set(`${block.bottomCenter().x} ${block.bottomCenter().y} ${block.bottomCenter().z}`, block);
    return;
}

export function destroyActiveElectronReactorCore(block) {
    electronReactorCoreData.location.delete(`${block.bottomCenter().x} ${block.bottomCenter().y} ${block.bottomCenter().z}`);
    return;
}

export function activateInactiveElectronReactorCore(blockHit) {
    const blockHitBelow = blockHit.below(1);

    if (blockHitBelow.permutation.matches('rza:electron_reactor_core')) {
        blockHitBelow.setPermutation(BlockPermutation.resolve('rza:active_electron_reactor_core'));

        electronReactorCoreData.location.set(`${blockHitBelow.bottomCenter().x} ${blockHitBelow.bottomCenter().y} ${blockHitBelow.bottomCenter().z}`, blockHitBelow);
    }
    return;
}

export function activeElectronReactorCore() {
    if (electronReactorCoreData.timer > 0) electronReactorCoreData.timer--;
    else electronReactorCoreData.timer = 40;
    electronReactorCoreData.location.forEach(electronReactorCore => {
        if (electronReactorCoreData.timer == 0) {
            const currentBlock = electronReactorCore.dimension.getBlock(electronReactorCore.center());
            if (currentBlock.permutation.matches('rza:active_electron_reactor_core')) {
                currentBlock.dimension.spawnParticle('rza:active_electron_reactor_core', electronReactorCore.center());
            }
        }
    });
}