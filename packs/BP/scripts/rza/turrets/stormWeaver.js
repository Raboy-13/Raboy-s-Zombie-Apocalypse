import { EntityDamageCause, system } from "@minecraft/server";
import { calculateDistance, fixedPosRaycast } from "./raycast";
export let stormWeavers = {
    "rza:chain_length": new Map(),
    "rza:chained_zombies": new Map(),
    "rza:destroyed_weavers": new Set()
};
export function stormWeaverLightning(chainer, stormWeaver) {
    const stormWeaverId = stormWeaver.id;
    if (!stormWeavers["rza:chained_zombies"].has(stormWeaverId)) {
        stormWeavers["rza:chained_zombies"].set(stormWeaverId, []);
    }
    const chainedZombies = stormWeavers["rza:chained_zombies"].get(stormWeaverId);
    const chainLength = stormWeavers["rza:chain_length"].get(stormWeaverId);
    if (chainLength && chainLength > 0) {
        try {
            if (chainer.isValid()) {
                chainer.applyDamage(4, { cause: EntityDamageCause.entityAttack, damagingEntity: stormWeaver });
                chainer.setOnFire(5, true);
                chainer.addTag('chainer');
                chainedZombies.push(chainer);
            }
        }
        catch (error) { }
        stormWeavers["rza:chain_length"].set(stormWeaverId, Math.max(chainLength - 1, 0));
        const nextChainer = findNextChainer(chainer, stormWeaverId);
        if (nextChainer) {
            try {
                if (nextChainer.isValid()) {
                    nextChainer.applyDamage(4, { cause: EntityDamageCause.entityAttack, damagingEntity: stormWeaver });
                    nextChainer.setOnFire(5, true);
                    nextChainer.addTag('chainer');
                    chainedZombies.push(nextChainer);
                }
            }
            catch (error) { }
            const chainedZombieIds = chainedZombies.map(zombie => zombie.id).join(',');
            stormWeaver.setDynamicProperty(`storm_weaver${stormWeaverId}chained_zombies_data`, chainedZombieIds);
            visualizeLightningEffect(chainer, nextChainer, stormWeaver);
        }
        else {
            for (const zombie of chainedZombies) {
                try {
                    if (zombie.isValid()) {
                        zombie.removeTag('chainer');
                    }
                }
                catch (error) { }
            }
            chainedZombies.length = 0;
        }
    }
    return;
}
function findNextChainer(chainer, stormWeaverId) {
    scheduleChainerTagRemoval(chainer, stormWeaverId);
    try {
        return chainer.dimension.getEntities({
            location: chainer.location,
            families: ['zombie'],
            excludeTags: ['chainer'],
            minDistance: 3,
            maxDistance: 24,
            closest: 1
        })[0];
    }
    catch (error) {
        return undefined;
    }
}
function visualizeLightningEffect(chainer, nextChainer, stormWeaver) {
    const chainerLocation = { ...chainer.location, y: chainer.location.y + 0.5 };
    const nextChainerLocation = { ...nextChainer.location, y: nextChainer.location.y + 0.5 };
    const distance = calculateDistance(chainer.location, nextChainer.location);
    fixedPosRaycast(stormWeaver, chainer.dimension, chainerLocation, nextChainerLocation, distance, 'rza:lightning');
    return;
}
export function restoreChainedZombies(stormWeaver) {
    try {
        const stormWeaverId = stormWeaver.id;
        const dataKey = `storm_weaver${stormWeaverId}chained_zombies_data`;
        const chainedZombieIds = stormWeaver.getDynamicProperty(dataKey);
        if (typeof chainedZombieIds === 'string' && chainedZombieIds.length > 0) {
            const storedZombieIds = chainedZombieIds.split(',');
            const nearbyTaggedZombies = stormWeaver.dimension.getEntities({
                location: stormWeaver.location,
                maxDistance: 256,
                families: ['zombie'],
                tags: ['chainer']
            });
            for (const zombie of nearbyTaggedZombies) {
                try {
                    if (zombie.isValid() && storedZombieIds.includes(zombie.id)) {
                        zombie.removeTag('chainer');
                    }
                }
                catch (error) { }
            }
            if (!stormWeavers["rza:chained_zombies"].has(stormWeaver.id)) {
                stormWeavers["rza:chained_zombies"].set(stormWeaver.id, []);
            }
            const chainedZombies = stormWeavers["rza:chained_zombies"].get(stormWeaver.id);
            try {
                stormWeaver.clearDynamicProperties();
            }
            catch (error) { }
            chainedZombies.length = 0;
        }
    }
    catch (error) { }
    return;
}
function scheduleChainerTagRemoval(chainer, stormWeaverId) {
    const chainLength = stormWeavers["rza:chain_length"].get(stormWeaverId) || 0;
    if (chainLength <= 0) {
        const chainedZombies = stormWeavers["rza:chained_zombies"].get(stormWeaverId) || [];
        let removeTagDelay = system.runTimeout(() => {
            for (const zombie of chainedZombies) {
                try {
                    if (zombie.isValid()) {
                        zombie.removeTag('chainer');
                    }
                }
                catch (error) { }
            }
            chainedZombies.length = 0;
            system.clearRun(removeTagDelay);
        }, 10);
    }
    else {
        let removeTagDelay = system.runTimeout(() => {
            try {
                if (chainer.isValid()) {
                    chainer.removeTag('chainer');
                }
            }
            catch (error) { }
            system.clearRun(removeTagDelay);
        }, 10);
    }
    return;
}
export function cleanupStormWeaver(stormWeaver, willBeUnloaded) {
    try {
        const stormWeaverId = stormWeaver.id;
        const chainedZombies = stormWeavers["rza:chained_zombies"].get(stormWeaverId) || [];
        for (const zombie of chainedZombies) {
            try {
                if (zombie.isValid()) {
                    zombie.removeTag('chainer');
                }
            }
            catch (error) { }
        }
        chainedZombies.length = 0;
        stormWeavers["rza:chained_zombies"].delete(stormWeaverId);
        stormWeavers["rza:chain_length"].delete(stormWeaverId);
        if (!willBeUnloaded) {
            try {
                stormWeaver.clearDynamicProperties();
            }
            catch (error) { }
        }
    }
    catch (error) { }
    return;
}
