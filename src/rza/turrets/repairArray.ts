import { Entity, EntityComponentTypes, EntityEquippableComponent, EntityHealthComponent, EntityInventoryComponent, EntityTypeFamilyComponent, EquipmentSlot, ItemComponentTypes, ItemDurabilityComponent, Player, system, world } from "@minecraft/server";
import { calculateDistance, fixedPosRaycast } from "./raycast";

// Import necessary components and types from the Minecraft server module

// Global object to store cooldown information for repair arrays
export const repairArrayCooldown = new Map();

// Main function to handle repair mechanics for a given repair array entity
export function repairArrayMechanics(repairArray: Entity) {
    // Check if the repair array is active and its cooldown is 0
    const cooldown = repairArrayCooldown.get(repairArray.id) || 0;
    if (cooldown === 0 && repairArray.getProperty('rza:active') === true) {
        // Set the cooldown to 40 ticks (or other time unit)
        repairArrayCooldown.set(repairArray.id, 40);
        const repairArrayLocation = repairArray.location;

        // Get entities within a radius of 1 to 32 units, excluding other repair arrays
        const repairables = repairArray.dimension.getEntities({
            location: repairArrayLocation,
            minDistance: 1,
            maxDistance: 32
        });

        // Filter entities that need repair and are of the correct type
        const repairableEntities = new Set<Entity>();
        const equipmentSlots = [
            EquipmentSlot.Head,
            EquipmentSlot.Chest,
            EquipmentSlot.Legs,
            EquipmentSlot.Feet,
            EquipmentSlot.Mainhand,
            EquipmentSlot.Offhand
        ];

        repairables.forEach(repairable => {
            if (!repairable.hasComponent(EntityComponentTypes.Health)) return;
            const healthComponent = repairable.getComponent(EntityComponentTypes.Health) as EntityHealthComponent;
            const currentHealth = healthComponent.currentValue;
            const maxHealth = healthComponent.defaultValue;

            if (repairable.typeId === 'minecraft:player') {
                const player = repairable as Player;
                const inventory = (player.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent).container;
                let isAnyEquipmentRepairableInInventory = false;

                for (let i = 0; i < inventory.size; i++) {
                    const item = inventory.getItem(i);
                    const damaged = item?.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent;
                    if (damaged?.damage > 0) {
                        isAnyEquipmentRepairableInInventory = true;
                        break;
                    }
                }

                const isAnyEquipmentRepairable = equipmentSlots.some(slot => {
                    const equipment = (player?.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent)?.getEquipment(slot);
                    const durabilityComponent = equipment?.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent;
                    return durabilityComponent?.damage > 0;
                });

                if (isAnyEquipmentRepairable || isAnyEquipmentRepairableInInventory) {
                    repairableEntities.add(repairable);
                }
            } else {
                if (currentHealth < maxHealth &&
                    !repairable.hasTag(`${repairArray.id}_target`) &&
                    ((repairable.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('turret') ||
                        (repairable.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('utility'))) {
                    repairableEntities.add(repairable);
                }
            }
        });

        // Use a priority queue to select the top 3 entities with the lowest health
        const maxRepairables = Array.from(repairableEntities).sort((a, b) => {
            if (a.typeId === 'minecraft:player' && b.typeId !== 'minecraft:player') return -1;
            if (a.typeId !== 'minecraft:player' && b.typeId === 'minecraft:player') return 1;
            const healthA = (a.getComponent(EntityComponentTypes.Health) as EntityHealthComponent).currentValue;
            const healthB = (b.getComponent(EntityComponentTypes.Health) as EntityHealthComponent).currentValue;
            return healthA - healthB;
        }).slice(0, 5);

        //This is only for the firing animation and sound to play
        if (maxRepairables.length > 0) {
            repairArray.setProperty('rza:fire', true);
            repairArray.dimension.playSound('turret.repair_array.beam', repairArrayLocation);
            const delayRemoveFire = system.runTimeout(() => {
                repairArray.setProperty('rza:fire', false);
                system.clearRun(delayRemoveFire);
            }, 10);
        }

        // Repair the selected entities
        maxRepairables.forEach(repairable => {
            const dimension = repairable.dimension;
            const repairableLocation = repairable.location;

            // Tag the entity to mark it as being repaired
            repairable.addTag(`${repairArray.id}_target`);

            if (repairable.typeId === 'minecraft:player') {
                const player = repairable as Player;
                const playerLocation = player.location;
                const inventory = (player.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent).container;

                equipmentSlots.forEach(slot => {
                    const equipment = (player?.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent)?.getEquipment(slot);
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
                world.scoreboard.getObjective('repair_distance').setScore(repairArray, distance);
                fixedPosRaycast(repairArray, dimension, { x: repairArrayLocation.x, y: repairArrayLocation.y + 1.5, z: repairArrayLocation.z }, { x: playerLocation.x, y: playerLocation.y + 0.3, z: playerLocation.z }, distance, 'rza:repair_array_beam');

                player.dimension.spawnParticle('rza:repair_array_repair', playerLocation);
                player.dimension.playSound('turret.repair_array.repair', playerLocation);
            } else {
                const healthComponent = repairable.getComponent(EntityComponentTypes.Health) as EntityHealthComponent;
                const health = healthComponent.currentValue;
                const maxHealth = healthComponent.defaultValue;

                const distance = calculateDistance(repairArrayLocation, repairableLocation);
                world.scoreboard.getObjective('repair_distance').setScore(repairArray, distance);
                fixedPosRaycast(repairArray, dimension, { x: repairArrayLocation.x, y: repairArrayLocation.y + 1.5, z: repairArrayLocation.z }, { x: repairableLocation.x, y: repairableLocation.y + 0.3, z: repairableLocation.z }, distance, 'rza:repair_array_beam');

                healthComponent.setCurrentValue(Math.max(health + 4, maxHealth));

                repairable.dimension.spawnParticle('rza:repair_array_repair', repairableLocation);
                repairable.dimension.playSound('turret.repair_array.repair', repairableLocation);
            }

            // Remove the repair tag from the entity
            repairable.removeTag(`${repairArray.id}_target`);
        });
    } else if (cooldown > 0) {
        // Decrement the cooldown time if it is greater than 0
        repairArrayCooldown.set(repairArray.id, cooldown - 1);
    }
}