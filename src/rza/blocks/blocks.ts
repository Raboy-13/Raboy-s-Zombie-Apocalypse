import { Block } from "@minecraft/server";

/**
 * This function runs whenever a block is placed or updated.
 *
 * @param {Block} core - The block that was placed or updated.
 * @param {string} blockTypeId - The ID of the block.
 */
export function blockFeatures(core: Block, blockTypeId: string) {
    // Get the location of the block
    const location = core.center();
    
    // If the block is an active electron reactor core, spawn a particle
    if (blockTypeId === 'rza:active_electron_reactor_core') {
        core.dimension.spawnParticle('rza:active_electron_reactor_core', location);
    }
    
    // Return so that the function ends
    return;
}
