import { Entity, EntityComponentTypes, EntityTypeFamilyComponent, ItemStack, system, world } from "@minecraft/server";

export let pulsarSystems = {
    "rza:cooldown": new Map(),
    "rza:fire_time": new Map(),
    "rza:pulse_radius_offset": new Map()
}
export function pulsarSystemMechanics() {
    //Overworld
    world.getDimension('overworld').getEntities({ type: 'rza:pulsar_system' }).forEach(pulsarSystem => {
        let run = system.run(() => {
            pulsarSystemHandler(pulsarSystem);
            system.clearRun(run);
        });
    });

    //Nether
    world.getDimension('nether').getEntities({ type: 'rza:pulsar_system' }).forEach(pulsarSystem => {
        let run = system.run(() => {
            pulsarSystemHandler(pulsarSystem);
            system.clearRun(run);
        });
    });

    //Overworld
    world.getDimension('the_end').getEntities({ type: 'rza:pulsar_system' }).forEach(pulsarSystem => {
        let run = system.run(() => {
            pulsarSystemHandler(pulsarSystem);
            system.clearRun(run);
        });
    });
    return;
}

function pulsarSystemHandler(pulsarSystem: Entity) {
    const active = pulsarSystem.getProperty('rza:active');
    const activeState = pulsarSystem.getProperty('rza:active_state');
    const convertItemsTo = pulsarSystem.getProperty('rza:convert_items_to');

    //Decrement cooldown every tick
    if (pulsarSystems["rza:cooldown"].get(pulsarSystem.id) > 0 && activeState) pulsarSystems["rza:cooldown"].set(pulsarSystem.id, pulsarSystems["rza:cooldown"].get(pulsarSystem.id) - 1);

    //Firing Mechanics
    if (pulsarSystems["rza:fire_time"].get(pulsarSystem.id) > 0) {
        pulsarSystems["rza:fire_time"].set(pulsarSystem.id, pulsarSystems["rza:fire_time"].get(pulsarSystem.id) - 1);
        pulsarSystems["rza:pulse_radius_offset"].set(pulsarSystem.id, pulsarSystems["rza:pulse_radius_offset"].get(pulsarSystem.id) + 0.25);
        pulsarSystem.dimension.getEntities({ location: pulsarSystem.location, minDistance: pulsarSystems["rza:pulse_radius_offset"].get(pulsarSystem.id) - 0.25, maxDistance: pulsarSystems["rza:pulse_radius_offset"].get(pulsarSystem.id) }).forEach(entity => {
            if (entity.typeId == 'minecraft:item') {
                const netheriteScrap = entity.matches({ name: 'Netherite Scrap' });
                const netheriteIngot = entity.matches({ name: 'Netherite Ingot' });
                const netheriteBlock = entity.matches({ name: 'Block of Netherite' });
                const netheriteAxe = entity.matches({ name: 'Netherite Axe' });
                const netheriteSword = entity.matches({ name: 'Netherite Sword' });
                const netheriteShovel = entity.matches({ name: 'Netherite Shovel' });
                const netheritePickaxe = entity.matches({ name: 'Netherite Pickaxe' });
                const netheriteHoe = entity.matches({ name: 'Netherite Hoe' });
                const netheriteHelmet = entity.matches({ name: 'Netherite Helmet' });
                const netheriteChestplate = entity.matches({ name: 'Netherite Chestplate' });
                const netheriteLeggings = entity.matches({ name: 'Netherite Leggings' });
                const netheriteBoots = entity.matches({ name: 'Netherite Boots' });
                const totem = entity.matches({ name: 'Totem of Undying' });
                const goldenApple = entity.matches({ name: 'Golden Apple' });
                const goldenCarrot = entity.matches({ name: 'Golden Carrot' });
                const enchantedApple = entity.matches({ name: 'Enchanted Apple' });
                const netherStar = entity.matches({ name: 'Nether Star' });
                const beacon = entity.matches({ name: 'Beacon' });

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
                ) {
                    if (convertItemsTo == 'Charcoal') {
                        entity.dimension.spawnParticle('rza:item_ignite', entity.location);
                        entity.dimension.playSound('mob.blaze.shoot', entity.location, { volume: 2 });
                        entity.dimension.spawnItem(new ItemStack('charcoal', 1), entity.location);
                    }

                    if (convertItemsTo == 'XP') {
                        entity.dimension.spawnParticle('rza:xp_burst', entity.location);
                        entity.dimension.playSound('block.beehive.enter', entity.location, { volume: 2 });
                        entity.dimension.spawnEntity('xp_orb', entity.location);
                    }
                    entity.kill();
                }
            }

            //Zombies
            const isZombie = entity.hasComponent(EntityComponentTypes.TypeFamily) && (entity.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('zombie');
            if (isZombie) {
                entity.addEffect('slowness', 100, { amplifier: 2 });
            }

            //Players
            if (entity.typeId == 'minecraft:player') {
                entity.addEffect('haste', 300, { amplifier: 2 });
                entity.addEffect('regeneration', 300, { amplifier: 2 });
                entity.addEffect('strength', 300, { amplifier: 1 });
            }
        });
    }

    //Execute firing sequence once cooldown reaches 0
    if (active && activeState && pulsarSystems["rza:cooldown"].get(pulsarSystem.id) == 0) {
        pulsarSystems["rza:fire_time"].set(pulsarSystem.id, 200);
        pulsarSystems["rza:pulse_radius_offset"].set(pulsarSystem.id, 0);
        pulsarSystem.setProperty('rza:fire', true);
        let stopFireDelay = system.runTimeout(() => {
            pulsarSystem.setProperty('rza:fire', false);
            system.clearRun(stopFireDelay);
        }, 5)
    }
    
    //Reset the cooldown
    if (pulsarSystems["rza:cooldown"].get(pulsarSystem.id) == 0) pulsarSystems["rza:cooldown"].set(pulsarSystem.id, 600);
    return;
}