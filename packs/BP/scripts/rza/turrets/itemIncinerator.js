import { system, world } from "@minecraft/server";

export let itemIncinerators = {
    "rza:cooldown": new Map(),
    "rza:fire_time": new Map(),
    "rza:pulse_radius_offset": new Map()
}
export function itemIncineratorMechanics() {
    //Overworld
    world.getDimension('overworld').getEntities({ type: 'rza:item_incinerator' }).forEach(itemIncinerator => {
        let run = system.run(() => {
            itemIncineratorHandler(itemIncinerator);
            system.clearRun(run);
        });
    });

    //Nether
    world.getDimension('nether').getEntities({ type: 'rza:item_incinerator' }).forEach(itemIncinerator => {
        let run = system.run(() => {
            itemIncineratorHandler(itemIncinerator);
            system.clearRun(run);
        });
    });

    //Overworld
    world.getDimension('the_end').getEntities({ type: 'rza:item_incinerator' }).forEach(itemIncinerator => {
        let run = system.run(() => {
            itemIncineratorHandler(itemIncinerator);
            system.clearRun(run);
        });
    });
    return;
}

function itemIncineratorHandler(itemIncinerator) {
    const active = itemIncinerator.getProperty('rza:active');
    const state = itemIncinerator.getProperty('rza:state');

    //Decrement cooldown every tick
    if (itemIncinerators["rza:cooldown"].get(itemIncinerator.id) > 0 && state == 'on') itemIncinerators["rza:cooldown"].set(itemIncinerator.id, itemIncinerators["rza:cooldown"].get(itemIncinerator.id) - 1);

    //Firing Mechanics
    if (itemIncinerators["rza:fire_time"].get(itemIncinerator.id) > 0) {
        itemIncinerators["rza:fire_time"].set(itemIncinerator.id, itemIncinerators["rza:fire_time"].get(itemIncinerator.id) - 1);
        itemIncinerators["rza:pulse_radius_offset"].set(itemIncinerator.id, itemIncinerators["rza:pulse_radius_offset"].get(itemIncinerator.id) + 0.25);
        itemIncinerator.dimension.getEntities({ type: 'item', location: itemIncinerator.location, minDistance: itemIncinerators["rza:pulse_radius_offset"].get(itemIncinerator.id) - 0.25, maxDistance: itemIncinerators["rza:pulse_radius_offset"].get(itemIncinerator.id) }).forEach(item => {
            const netheriteScrap = item.matches({ name: 'Netherite Scrap' });
            const netheriteIngot = item.matches({ name: 'Netherite Ingot' });
            const netheriteBlock = item.matches({ name: 'Block of Netherite' });
            const netheriteAxe = item.matches({ name: 'Netherite Axe' });
            const netheriteSword = item.matches({ name: 'Netherite Sword' });
            const netheriteShovel = item.matches({ name: 'Netherite Shovel' });
            const netheritePickaxe = item.matches({ name: 'Netherite Pickaxe' });
            const netheriteHoe = item.matches({ name: 'Netherite Hoe' });
            const netheriteHelmet = item.matches({ name: 'Netherite Helmet' });
            const netheriteChestplate = item.matches({ name: 'Netherite Chestplate' });
            const netheriteLeggings = item.matches({ name: 'Netherite Leggings' });
            const netheriteBoots = item.matches({ name: 'Netherite Boots' });
            const totem = item.matches({ name: 'Totem of Undying' });
            const goldenApple = item.matches({ name: 'Golden Apple' });
            const goldenCarrot = item.matches({ name: 'Golden Carrot' });
            const enchantedApple = item.matches({ name: 'Enchanted Apple' });
            const netherStar = item.matches({ name: 'Nether Star' });
            const beacon = item.matches({ name: 'Beacon' });


            item.dimension.spawnParticle('rza:item_ignite', item.location);
            item.dimension.playSound('mob.blaze.shoot', item.location, { volume: 2 });
            if (
                !(
                    netheriteScrap ||
                    netheriteIngot ||
                    netheriteBlock ||
                    netheriteAxe ||
                    netheriteSword ||
                    netheriteShovel ||
                    netheritePickaxe ||
                    netheriteHoe ||
                    netheriteHelmet ||
                    netheriteChestplate ||
                    netheriteLeggings ||
                    netheriteBoots ||
                    totem ||
                    goldenApple ||
                    goldenCarrot ||
                    enchantedApple ||
                    netherStar ||
                    beacon
                )
            ) item.kill();
        });
    }

    //Execute firing sequence once cooldown reaches 0
    if (active && state == 'on' && itemIncinerators["rza:cooldown"].get(itemIncinerator.id) == 0) {
        itemIncinerators["rza:fire_time"].set(itemIncinerator.id, 200);
        itemIncinerators["rza:pulse_radius_offset"].set(itemIncinerator.id, 0);
        itemIncinerator.setProperty('rza:fire', true);
        let stopFireDelay = system.runTimeout(() => {
            itemIncinerator.setProperty('rza:fire', false);
            system.clearRun(stopFireDelay);
        }, 5)
    }
    //Reset the cooldown
    if (itemIncinerators["rza:cooldown"].get(itemIncinerator.id) == 0) itemIncinerators["rza:cooldown"].set(itemIncinerator.id, 600);
    return;
}