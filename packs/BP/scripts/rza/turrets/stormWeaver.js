import { EntityDamageCause, system } from "@minecraft/server";
import { calculateDistance, fixedPosRaycast } from "./raycast";
export let stormWeavers = {
    "rza:chain_length": new Map()
};
export function stormWeaverLightning(chainer, stormWeaver) {
    const stormWeaverId = stormWeaver.id;
    const chainLength = stormWeavers["rza:chain_length"].get(stormWeaverId);
    if (chainLength && chainLength > 0) {
        chainer?.applyDamage(4, { cause: EntityDamageCause.entityAttack, damagingEntity: stormWeaver });
        chainer.addTag('chainer');
        stormWeavers["rza:chain_length"].set(stormWeaverId, Math.max(chainLength - 1, 0));
        const nextChainer = findNextChainer(chainer);
        if (nextChainer) {
            nextChainer.applyDamage(4, { cause: EntityDamageCause.entityAttack, damagingEntity: stormWeaver });
            nextChainer.addTag('chainer');
            visualizeLightningEffect(chainer, nextChainer, stormWeaver);
            scheduleChainerTagRemoval(stormWeaver);
        }
    }
}
function findNextChainer(chainer) {
    return chainer.dimension.getEntities({
        location: chainer.location,
        families: ['zombie'],
        excludeTags: ['chainer'],
        minDistance: 3,
        maxDistance: 10,
        closest: 1
    })[0];
}
function visualizeLightningEffect(chainer, nextChainer, stormWeaver) {
    const chainerLocation = { ...chainer.location, y: chainer.location.y + 0.5 };
    const nextChainerLocation = { ...nextChainer.location, y: nextChainer.location.y + 0.5 };
    const distance = calculateDistance(chainer.location, nextChainer.location);
    fixedPosRaycast(stormWeaver, chainer.dimension, chainerLocation, nextChainerLocation, distance, 'rza:lightning');
    return;
}
function scheduleChainerTagRemoval(stormWeaver) {
    let removeTagDelay = system.runTimeout(() => {
        const taggedZombies = stormWeaver.dimension.getEntities({
            location: stormWeaver.location,
            families: ['zombie'],
            tags: ['chainer']
        });
        taggedZombies.forEach(zombie => zombie.removeTag('chainer'));
        system.clearRun(removeTagDelay);
    }, 40);
}
