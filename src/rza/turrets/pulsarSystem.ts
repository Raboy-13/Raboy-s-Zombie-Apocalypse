import { Entity, EntityComponentTypes, EntityItemComponent, EntityTypeFamilyComponent, ItemStack, system } from "@minecraft/server";

/**
 * Global state storage for Pulsar System entities
 * @property {Map<string,number>} rza:cooldown - Stores cooldown timers for each pulsar system
 * @property {Map<string,number>} rza:fire_time - Stores active firing duration for each pulsar system
 * @property {Map<string,number>} rza:pulse_radius_offset - Stores expanding pulse radius for visual effects
 */
export let pulsarSystems = {
    "rza:cooldown": new Map(),
    "rza:fire_time": new Map(), 
    "rza:pulse_radius_offset": new Map()
};

/**
 * Handles the core mechanics of a Pulsar System turret
 * The Pulsar System is a defense mechanism that:
 * - Converts invalid items to charcoal or XP
 * - Applies slowness to zombies
 * - Buffs nearby players with positive effects
 * - Creates expanding pulse effects
 * 
 * @param {Entity} pulsarSystem - The Pulsar System turret to update
 * 
 * Properties used:
 * - rza:active - Whether the system is active
 * - rza:active_state - Current operational state
 * - rza:convert_items_to - Conversion mode ("Charcoal" or "XP")
 * - rza:fire - Visual firing state
 * 
 * Timing:
 * - Cooldown: 600 ticks (30 seconds)
 * - Fire duration: 200 ticks (10 seconds)
 * - Pulse expansion: 0.25 blocks per tick
 * 
 * Effects:
 * - Players: Haste II, Regeneration II, Strength I (15 seconds)
 * - Zombies: Slowness II (5 seconds)
 * 
 * @returns {void}
 */
export function pulsarSystemMechanics(pulsarSystem: Entity): void {
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
            'minecraft:netherite_scrap', 'minecraft:netherite_ingot', 'minecraft:netherite_block', 'minecraft:netherite_axe',
            'minecraft:netherite_sword', 'minecraft:netherite_shovel', 'minecraft:netherite_pickaxe', 'minecraft:netherite_hoe',
            'minecraft:netherite_helmet', 'minecraft:netherite_chestplate', 'minecraft:netherite_leggings', 'minecraft:netherite_boots',
            'minecraft:totem_of_undying', 'minecraft:golden_apple', 'minecraft:golden_carrot', 'minecraft:enchanted_golden_apple',
            'minecraft:nether_star', 'minecraft:beacon'
        ]);

        //Effects for every item, player, and zombie within the pulse
        entities.forEach(entity => {
            const typeId = entity.typeId;

            // Items
            if (typeId === 'minecraft:item') {
                const itemName = (entity.getComponent('minecraft:item') as EntityItemComponent).itemStack.type.id;

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
                    entity.remove();
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
