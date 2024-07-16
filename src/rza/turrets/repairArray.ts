// Import necessary components and types from the Minecraft server module
import { Entity, EntityComponentTypes, EntityEquippableComponent, EntityHealthComponent, EntityInventoryComponent, EntityTypeFamilyComponent, EquipmentSlot, ItemComponentTypes, ItemDurabilityComponent, Player, system, Vector3, world } from "@minecraft/server";

// Global object to store cooldown information for repair arrays
export let repairArrays = {
    "rza:cooldown": new Map()
}

// Main function to handle repair mechanics for a given repair array entity
export function repairArrayMechanics(repairArray: Entity) {
    // Check if the repair array is active and its cooldown is 0
    if (repairArrays["rza:cooldown"].get(repairArray.id) === 0 && repairArray.getProperty('rza:active') === true) {
        // Set the cooldown to 40 ticks (or other time unit)
        repairArrays["rza:cooldown"].set(repairArray.id, 40);
        const repairArrayLocation = repairArray.location;

        // Get entities within a radius of 1 to 32 units, excluding other repair arrays
        const repairables = repairArray.dimension.getEntities({
            location: repairArrayLocation,
            minDistance: 1,
            maxDistance: 32
        });

        // Filter entities that need repair and are of the correct type
        const repairableEntities = repairables.filter(repairable => {
            if (!repairable.hasComponent(EntityComponentTypes.Health)) return false;
            const healthComponent = repairable.getComponent(EntityComponentTypes.Health) as EntityHealthComponent;
            const currentHealth = healthComponent.currentValue;
            const maxHealth = healthComponent.defaultValue;

            if (repairable.typeId === 'minecraft:player') {
                const player = repairable as Player;

                // Define the equipment slots to check
                const equipmentSlots = [
                    EquipmentSlot.Head,
                    EquipmentSlot.Chest,
                    EquipmentSlot.Legs,
                    EquipmentSlot.Feet,
                    EquipmentSlot.Mainhand,
                    EquipmentSlot.Offhand
                ];

                const inventory = (player.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent).container;
                let isAnyEquipmentRepairableInInventory = false;
                for (let i = 0; i < inventory.size; i++) {
                    const item = inventory.getItem(i);
                    const damaged = item?.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent;
                    if (damaged?.damage > 0) isAnyEquipmentRepairableInInventory = true;
                }

                // Helper function to get the durability component of equipment
                const isEquipmentRepairable = (slot: EquipmentSlot): boolean => {
                    const equipment = (player?.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent)?.getEquipment(slot);
                    const durabilityComponent = equipment?.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent;
                    return durabilityComponent?.damage > 0;
                };

                const isAnyEquipmentRepairable = equipmentSlots.some(isEquipmentRepairable);
                if (isAnyEquipmentRepairable || isAnyEquipmentRepairableInInventory) return true;
            }

            return currentHealth < maxHealth &&
                !repairable.hasTag(`${repairArray.id}_target`) &&
                ((repairable.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('turret') ||
                    (repairable.getComponent(EntityComponentTypes.TypeFamily) as EntityTypeFamilyComponent).hasTypeFamily('utility'));
        });

        // Sort the repairable entities by type (players first) and then by their current health in ascending order
        repairableEntities.sort((a, b) => {
            if (a.typeId === 'minecraft:player' && b.typeId !== 'minecraft:player') return -1;
            if (a.typeId !== 'minecraft:player' && b.typeId === 'minecraft:player') return 1;
            const healthA = (a.getComponent(EntityComponentTypes.Health) as EntityHealthComponent).currentValue;
            const healthB = (b.getComponent(EntityComponentTypes.Health) as EntityHealthComponent).currentValue;
            return healthA - healthB;
        });

        // Select the top 3 entities with the lowest health
        const maxRepairables = repairableEntities.slice(0, 5);

        //This is only for the firing animation and sound to play
        if (maxRepairables.length > 0) {
            repairArray.setProperty('rza:fire', true);
            repairArray.dimension.playSound('turret.repair_array.beam', repairArrayLocation);
            let delayRemoveFire = system.runTimeout(() => {
                repairArray.setProperty('rza:fire', false);
                system.clearRun(delayRemoveFire);
            }, 10);
        }

        // Repair the selected entities
        maxRepairables.forEach(repairable => {
            // Tag the entity to mark it as being repaired
            repairable.addTag(`${repairArray.id}_target`);
            if (repairable.typeId === 'minecraft:player') {
                const player = repairable as Player;
                const playerLocation = player.location;

                //FOR DAMAGED ITEMS IN EQUIPMENT SLOTS
                // Get the player's equipment slots and durability components
                const equipmentSlots = [
                    EquipmentSlot.Head,
                    EquipmentSlot.Chest,
                    EquipmentSlot.Legs,
                    EquipmentSlot.Feet,
                    EquipmentSlot.Mainhand,
                    EquipmentSlot.Offhand,
                ];

                // Function to get equipment and durability component
                const getDurabilityComponent = (slot: EquipmentSlot) => {
                    const equipment = (player?.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent)?.getEquipment(slot);
                    return {
                        equipment,
                        durabilityComponent: equipment?.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent
                    };
                };

                // Array to hold equipment and durability components
                const durabilityComponents = equipmentSlots.map(getDurabilityComponent);

                // Repair each piece of equipment if it's damageable and has damage
                durabilityComponents.forEach((component, index) => {
                    if (component.durabilityComponent && component.durabilityComponent.damage > 0) {
                        component.durabilityComponent.damage = Math.max(component.durabilityComponent.damage - 2, 0);
                        (player?.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent).setEquipment(equipmentSlots[index], component.equipment);
                    }
                });

                //FOR DAMAGED ITEMS IN THE INVENTORY IN GENERAL
                const inventory = (player.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent).container;
                for (let i = 0; i < inventory.size; i++) {
                    const item = inventory.getItem(i);
                    const damaged = item?.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent;
                    if (damaged?.damage > 0) {
                        damaged.damage = Math.max(damaged.damage - 2, 0);
                        inventory.getSlot(i).setItem(item);
                    }
                }

                // Calculate the distance between the repair array and the player
                const distance = calculateDistance(repairArrayLocation, playerLocation);

                // Set the calculated distance for use in the repair beam raycast
                world.scoreboard.getObjective('repair_distance').setScore(repairArray, distance);
                repairArray.runCommand(`execute positioned ${repairArrayLocation.x} ${repairArrayLocation.y + 1.5} ${repairArrayLocation.z} facing ${playerLocation.x} ${playerLocation.y + 0.3} ${playerLocation.z} run function world/turrets/repair_array/repair_beam`);

                // Spawn a particle effect and play repair sound to visualize the repair process
                player.dimension.spawnParticle('rza:repair_array_repair', playerLocation);
                player.dimension.playSound('turret.repair_array.repair', playerLocation);
            }

            else {
                const healthComponent = repairable.getComponent(EntityComponentTypes.Health) as EntityHealthComponent;
                const health = healthComponent.currentValue;
                const repairableLocation = repairable.location;

                // Calculate the distance between the repair array and the repairable entity
                const distance = calculateDistance(repairArrayLocation, repairableLocation);

                // Set the calculated distance for use in the repair beam raycast
                world.scoreboard.getObjective('repair_distance').setScore(repairArray, distance);
                repairArray.runCommand(`execute positioned ${repairArrayLocation.x} ${repairArrayLocation.y + 1.5} ${repairArrayLocation.z} facing ${repairableLocation.x} ${repairableLocation.y + 0.3} ${repairableLocation.z} run function world/turrets/repair_array/repair_beam`);

                // Increase the health of the repairable entity by 4
                healthComponent.setCurrentValue(health + 4);

                // Spawn a particle effect and play repair sound to visualize the repair process
                repairable.dimension.spawnParticle('rza:repair_array_repair', repairableLocation);
                repairable.dimension.playSound('turret.repair_array.repair', repairableLocation);
            }

            // Remove the repair tag from the entity
            repairable.removeTag(`${repairArray.id}_target`);
        });
    } else if (repairArrays["rza:cooldown"].get(repairArray.id) > 0) {
        // Decrement the cooldown time if it is greater than 0
        repairArrays["rza:cooldown"].set(repairArray.id, repairArrays["rza:cooldown"].get(repairArray.id) - 1);
    }

    return;
}

// Helper function to calculate the distance between the repair array and repairable locations
function calculateDistance(loc1: Vector3, loc2: Vector3): number {
    const dx = loc1.x - loc2.x;
    const dy = loc1.y - loc2.y;
    const dz = loc1.z - loc2.z;

    //Mutiply the distance because the raycast step is 0.5
    return Math.sqrt(dx * dx + dy * dy + dz * dz) * 2;
}