import { EntityComponentTypes, ItemStack, system } from "@minecraft/server";
export let pulsarSystems = {
    "rza:cooldown": new Map(),
    "rza:fire_time": new Map(),
    "rza:pulse_radius_offset": new Map()
};
export function pulsarSystemMechanics(pulsarSystem) {
    const active = pulsarSystem.getProperty('rza:active');
    const activeState = pulsarSystem.getProperty('rza:active_state');
    const convertItemsTo = pulsarSystem.getProperty('rza:convert_items_to');
    const pulsarSystemId = pulsarSystem.id;
    const cooldown = pulsarSystems["rza:cooldown"].get(pulsarSystemId);
    const fireTime = pulsarSystems["rza:fire_time"].get(pulsarSystemId);
    const pulseRadiusOffset = pulsarSystems["rza:pulse_radius_offset"].get(pulsarSystemId);
    if (cooldown > 0 && activeState) {
        pulsarSystems["rza:cooldown"].set(pulsarSystemId, cooldown - 1);
    }
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
            'minecraft:netherite_scrap', 'minecraft:netherite_ingot', 'minecraft:netherite_block', 'minecraft:netherite_axe',
            'minecraft:netherite_sword', 'minecraft:netherite_shovel', 'minecraft:netherite_pickaxe', 'minecraft:netherite_hoe',
            'minecraft:netherite_helmet', 'minecraft:netherite_chestplate', 'minecraft:netherite_leggings', 'minecraft:netherite_boots',
            'minecraft:totem_of_undying', 'minecraft:golden_apple', 'minecraft:golden_carrot', 'minecraft:enchanted_golden_apple',
            'minecraft:nether_star', 'minecraft:beacon'
        ]);
        entities.forEach(entity => {
            const typeId = entity.typeId;
            if (typeId === 'minecraft:item') {
                const itemName = entity.getComponent('minecraft:item').itemStack.type.id;
                if (itemName && !validItems.has(itemName)) {
                    if (convertItemsTo === 'Charcoal') {
                        entity.dimension.spawnParticle('rza:item_ignite', entity.location);
                        entity.dimension.playSound('mob.blaze.shoot', entity.location, { volume: 2 });
                        entity.dimension.spawnItem(new ItemStack('charcoal', 1), entity.location);
                    }
                    else if (convertItemsTo === 'XP') {
                        entity.dimension.spawnParticle('rza:xp_burst', entity.location);
                        entity.dimension.playSound('block.beehive.enter', entity.location, { volume: 2 });
                        entity.dimension.spawnEntity('xp_orb', entity.location);
                    }
                    entity.remove();
                }
            }
            if (entity.hasComponent(EntityComponentTypes.TypeFamily) && entity.getComponent(EntityComponentTypes.TypeFamily).hasTypeFamily('zombie')) {
                entity.addEffect('slowness', 100, { amplifier: 2 });
            }
            if (typeId === 'minecraft:player') {
                entity.addEffect('haste', 300, { amplifier: 2 });
                entity.addEffect('regeneration', 300, { amplifier: 2 });
                entity.addEffect('strength', 300, { amplifier: 1 });
            }
        });
    }
    if (active && activeState && cooldown === 0) {
        const location = pulsarSystem.location;
        pulsarSystem.dimension.spawnParticle('rza:pulsar_system_pulse', { x: location.x, y: location.y + 0.6, z: location.z });
        pulsarSystem.dimension.playSound('pulsar_system.fire', location, { volume: 9 });
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
