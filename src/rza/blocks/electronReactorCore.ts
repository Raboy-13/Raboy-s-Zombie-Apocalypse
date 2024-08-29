import { Block, BlockPermutation } from "@minecraft/server";

export function activateInactiveElectronReactorCore(blockHit: Block) {
    const blockHitBelow = blockHit.below(1);

    if (blockHitBelow.permutation.matches('rza:electron_reactor_core')) {
        blockHitBelow.setPermutation(BlockPermutation.resolve('rza:active_electron_reactor_core'));
    }
    return;
}