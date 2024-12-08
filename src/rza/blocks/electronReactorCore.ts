import { Block, BlockPermutation } from "@minecraft/server";

/**
 * Activates an inactive Electron Reactor Core block by changing its state
 * when the block above it is interacted with.
 * 
 * @param blockHit - The Block instance that was interacted with, which should be
 *                   directly above an inactive electron reactor core
 * @returns void
 * 
 * @remarks
 * - Only works if the block below the hit block is an inactive electron reactor core
 * - Changes the inactive core to its active state using BlockPermutation
 * - Does nothing if the block below is not an electron reactor core
 */
export function activateInactiveElectronReactorCore(blockHit: Block) {
    const blockHitBelow = blockHit.below(1);

    if (blockHitBelow && blockHitBelow.permutation.matches('rza:electron_reactor_core')) {
        blockHitBelow.setPermutation(BlockPermutation.resolve('rza:active_electron_reactor_core'));
    }
    return;
}