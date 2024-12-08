import { Entity, EntityComponentTypes, EntityEquippableComponent, EntityHealthComponent, EntityInventoryComponent, EntityTypeFamilyComponent, EquipmentSlot, ItemComponentTypes, ItemDurabilityComponent, Player, system, world } from "@minecraft/server";
import { calculateDistance, fixedPosRaycast } from "./raycast";

/**
 * Global Map to track cooldown timers for repair array entities
 * @type {Map<string, number>} Map of entity IDs to their cooldown values
 */
export const repairArrayCooldown: Map<string, number> = new Map();

/**
 * Handles the repair mechanics for a repair array entity
 * Repairs both equipment and entities within range
 * 
 * Features:
 * - Repairs up to 5 entities simultaneously
 * - Prioritizes players over other entities
 * - Repairs both equipped items and inventory items
 * - Visual and audio feedback through particles and sounds
 * - Uses raycast for visual beam effects
 * 
 * Repair Behavior:
 * - Equipment: Reduces damage by 2 points per tick
 * - Entities: Heals 4 health points per tick
 * - Cooldown: 40 ticks between repair cycles
 * - Range: 1-32 blocks from repair array
 * 
 * Entity Requirements:
 * - Must have Health component
 * - Must be either:
 *   - A player with damaged equipment/inventory
 *   - An entity with 'turret' or 'utility' type family
 * 
 * @param {Entity} repairArray - The repair array entity performing repairs
 * @returns {void}
 */
export function repairArrayMechanics(repairArray: Entity): void {
    // Get current cooldown or default to 0 if not set
    const cooldown = repairArrayCooldown.get(repairArray.id) || 0;

    // Only proceed if repair array is active and not on cooldown
    if (cooldown === 0 && repairArray.getProperty('rza:active') === true) {
        // Initialize new repair cycle with 40 tick cooldown
        repairArrayCooldown.set(repairArray.id, 40);
        const repairArrayLocation = repairArray.location;

        // Query for potential repair targets within operational range
        const repairables = repairArray.dimension.getEntities({
            location: repairArrayLocation,
            minDistance: 1, // Minimum range to prevent self-targeting
            maxDistance: 32 // Maximum operational range
        });

        // Initialize collections for processing repair targets
        const repairableEntities = new Set<Entity>();
        // Define equipment slots that can be repaired
        const equipmentSlots = [
            EquipmentSlot.Head,
            EquipmentSlot.Chest,
            EquipmentSlot.Legs,
            EquipmentSlot.Feet,
            EquipmentSlot.Mainhand,
            EquipmentSlot.Offhand
        ];

        // Process each potential repair target
        repairables.forEach(repairable => {
            // Skip entities without health component
            if (!repairable.hasComponent(EntityComponentTypes.Health)) return;
            const healthComponent = repairable.getComponent(EntityComponentTypes.Health) as EntityHealthComponent;
            const currentHealth = healthComponent.currentValue;
            const maxHealth = healthComponent.defaultValue;

            // Special handling for players - check both equipment and inventory
            if (repairable.typeId === 'minecraft:player') {
                const player = repairable as Player;
                const inventory = (player.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent).container!;
                let isAnyEquipmentRepairableInInventory = false;

                // Check inventory for damaged items
                for (let i = 0; i < inventory.size; i++) {
                    const item = inventory.getItem(i);
                    const damaged = item?.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent;
                    if (damaged?.damage > 0) {
                        isAnyEquipmentRepairableInInventory = true;
                        break; // Exit early if any repairable item is found
                    }
                }

                // Check equipped items for damage
                const isAnyEquipmentRepairable = equipmentSlots.some(slot => {
                    const equipment = (player?.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent)?.getEquipment(slot);
                    const durabilityComponent = equipment?.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent;
                    return durabilityComponent?.damage > 0;
                });

                // Add player to repair queue if they have any damaged items
                if (isAnyEquipmentRepairable || isAnyEquipmentRepairableInInventory) {
                    repairableEntities.add(repairable);
                }
            } else {
                // For non-player entities, check if they're valid repair targets
                if (currentHealth < maxHealth &&
                    !repairable.hasTag(`${repairArray.id}_target`) && // Prevent double-targeting
                    ((repairable.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('turret') ||
                        (repairable.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('utility'))) {
                    repairableEntities.add(repairable);
                }
            }
        });

        // Prioritize targets: players first, then lowest health entities, limit to 5 targets
        const maxRepairables = Array.from(repairableEntities).sort((a, b) => {
            // Players always take priority
            if (a.typeId === 'minecraft:player' && b.typeId !== 'minecraft:player') return -1;
            if (a.typeId !== 'minecraft:player' && b.typeId === 'minecraft:player') return 1;
            // For same entity types, sort by health
            const healthA = (a.getComponent(EntityComponentTypes.Health) as EntityHealthComponent).currentValue;
            const healthB = (b.getComponent(EntityComponentTypes.Health) as EntityHealthComponent).currentValue;
            return healthA - healthB;
        }).slice(0, 5);

        // Trigger repair array activation effects if targets exist
        if (maxRepairables.length > 0) {
            repairArray.setProperty('rza:fire', true);
            repairArray.dimension.playSound('turret.repair_array.beam', repairArrayLocation);
            // Reset firing state after 10 ticks
            const delayRemoveFire = system.runTimeout(() => {
                repairArray.setProperty('rza:fire', false);
                system.clearRun(delayRemoveFire);
            }, 10);
        }

        // Process repairs for each selected target
        maxRepairables.forEach(repairable => {
            const dimension = repairable.dimension;
            const repairableLocation = repairable.location;

            // Tag the entity to mark it as being repaired
            repairable.addTag(`${repairArray.id}_target`);
            
            const repairDistanceObjective = world.scoreboard.getObjective('repair_distance') ?? world.scoreboard.addObjective('repair_distance', 'Repair Distance');
            
            if (repairable.typeId === 'minecraft:player') {
                const player = repairable as Player;
                const playerLocation = player.location;
                const inventory = (player.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent).container!;

                equipmentSlots.forEach(slot => {
                    const equipment = (player?.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent)?.getEquipment(slot)!;
                    const durabilityComponent = equipment?.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent;
                    if (durabilityComponent && durabilityComponent.damage > 0) {
                        durabilityComponent.damage = Math.max(durabilityComponent.damage - 2, 0);
                        (player?.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent).setEquipment(slot, equipment);
                    }
                });

                for (let i = 0; i < inventory.size; i++) {
                    const item = inventory.getItem(i);
                    const damaged = item?.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent;
                    if (damaged?.damage > 0) {
                        damaged.damage = Math.max(damaged.damage - 2, 0);
                        inventory.getSlot(i).setItem(item);
                    }
                }

                const distance = calculateDistance(repairArrayLocation, playerLocation);
                repairDistanceObjective.setScore(repairArray, distance);
                fixedPosRaycast(repairArray, dimension, { x: repairArrayLocation.x, y: repairArrayLocation.y + 1.5, z: repairArrayLocation.z }, { x: playerLocation.x, y: playerLocation.y + 0.3, z: playerLocation.z }, distance, 'rza:repair_array_beam');

                player.dimension.spawnParticle('rza:repair_array_repair', playerLocation);
                player.dimension.playSound('turret.repair_array.repair', playerLocation);
            } else {
                const healthComponent = repairable.getComponent(EntityComponentTypes.Health) as EntityHealthComponent;
                const health = healthComponent.currentValue;
                const maxHealth = healthComponent.defaultValue;

                const distance = calculateDistance(repairArrayLocation, repairableLocation);
                repairDistanceObjective.setScore(repairArray, distance);
                fixedPosRaycast(repairArray, dimension, { x: repairArrayLocation.x, y: repairArrayLocation.y + 1.5, z: repairArrayLocation.z }, { x: repairableLocation.x, y: repairableLocation.y + 0.3, z: repairableLocation.z }, distance, 'rza:repair_array_beam');

                healthComponent.setCurrentValue(Math.max(health + 4, maxHealth));

                repairable.dimension.spawnParticle('rza:repair_array_repair', repairableLocation);
                repairable.dimension.playSound('turret.repair_array.repair', repairableLocation);
            }

            // Remove the repair tag from the entity
            repairable.removeTag(`${repairArray.id}_target`);
        });
    } else if (cooldown > 0) {
        // Tick down cooldown timer
        repairArrayCooldown.set(repairArray.id, cooldown - 1);
    }
}