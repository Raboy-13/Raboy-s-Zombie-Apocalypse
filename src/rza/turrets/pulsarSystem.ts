import { Entity, EntityComponentTypes, EntityItemComponent, EntityTypeFamilyComponent, ItemStack, system } from "@minecraft/server";

export let pulsarSystems = {
    "rza:cooldown": new Map(),
    "rza:fire_time": new Map(),
    "rza:pulse_radius_offset": new Map()
};

export function pulsarSystemMechanics(pulsarSystem: Entity) {
    const active = pulsarSystem.getProperty('rza:active');
    const activeState = pulsarSystem.getProperty('rza:active_state');
    const convertItemsTo = pulsarSystem.getProperty('rza:convert_items_to');
    const pulsarSystemId = pulsarSystem.id;
    const cooldown = pulsarSystems["rza:cooldown"].get(pulsarSystemId);
    const fireTime = pulsarSystems["rza:fire_time"].get(pulsarSystemId);
    const pulseRadiusOffset = pulsarSystems["rza:pulse_radius_offset"].get(pulsarSystemId);

    // Decrement cooldown every tick
    if (cooldown > 0 && activeState) {
        pulsarSystems["rza:cooldown"].set(pulsarSystemId, cooldown - 1);
    }

    // Firing Mechanics
    if (fireTime > 0) {
        pulsarSystems["rza:fire_time"].set(pulsarSystemId, fireTime - 1);
        const newRadiusOffset = pulseRadiusOffset + 0.25;
        pulsarSystems["rza:pulse_radius_offset"].set(pulsarSystemId, newRadiusOffset);

        const entities = pulsarSystem.dimension.getEntities({
            location: pulsarSystem.location,
            minDistance: newRadiusOffset - 0.25,
            maxDistance: newRadiusOffset
        });

        const validItems = new Set([
            'Netherite Scrap', 'Netherite Ingot', 'Block of Netherite', 'Netherite Axe',
            'Netherite Sword', 'Netherite Shovel', 'Netherite Pickaxe', 'Netherite Hoe',
            'Netherite Helmet', 'Netherite Chestplate', 'Netherite Leggings', 'Netherite Boots',
            'Totem of Undying', 'Golden Apple', 'Golden Carrot', 'Enchanted Apple',
            'Nether Star', 'Beacon'
        ]);

        //Effects for every item, player, and zombie within the pulse
        entities.forEach(entity => {
            const typeId = entity.typeId;

            // Items
            if (typeId === 'minecraft:item') {
                const itemName = (entity.getComponent('minecraft:item') as EntityItemComponent).itemStack.nameTag;

                if (itemName && !validItems.has(itemName)) {
                    if (convertItemsTo === 'Charcoal') {
                        entity.dimension.spawnParticle('rza:item_ignite', entity.location);
                        entity.dimension.playSound('mob.blaze.shoot', entity.location, { volume: 2 });
                        entity.dimension.spawnItem(new ItemStack('charcoal', 1), entity.location);
                    } else if (convertItemsTo === 'XP') {
                        entity.dimension.spawnParticle('rza:xp_burst', entity.location);
                        entity.dimension.playSound('block.beehive.enter', entity.location, { volume: 2 });
                        entity.dimension.spawnEntity('xp_orb', entity.location);
                    }
                    entity.kill();
                }
            }

            // Zombies
            if (entity.hasComponent(EntityComponentTypes.TypeFamily) && (entity.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('zombie')) {
                entity.addEffect('slowness', 100, { amplifier: 2 });
            }

            // Players
            if (typeId === 'minecraft:player') {
                entity.addEffect('haste', 300, { amplifier: 2 });
                entity.addEffect('regeneration', 300, { amplifier: 2 });
                entity.addEffect('strength', 300, { amplifier: 1 });
            }
        });
    }

    // Execute firing sequence once cooldown reaches 0
    if (active && activeState && cooldown === 0) {
        const location = pulsarSystem.location;
        pulsarSystem.dimension.spawnParticle('rza:pulsar_system_pulse', { x: location.x, y: location.y + 0.6, z: location.z });
        pulsarSystem.dimension.playSound('pulsar_system.fire', location, {volume: 9});
        pulsarSystems["rza:cooldown"].set(pulsarSystemId, 600);
        pulsarSystems["rza:fire_time"].set(pulsarSystemId, 200);
        pulsarSystems["rza:pulse_radius_offset"].set(pulsarSystemId, 0);
        pulsarSystem.setProperty('rza:fire', true);
        const stopFireDelay = system.runTimeout(() => {
            pulsarSystem.setProperty('rza:fire', false);
            system.clearRun(stopFireDelay);
        }, 5);
    }

    return;
}
