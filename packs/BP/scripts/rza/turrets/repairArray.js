import { EntityComponentTypes, EquipmentSlot, ItemComponentTypes, system, world } from "@minecraft/server";
export let repairArrays = {
    "rza:cooldown": new Map()
};
export function repairArrayMechanics(repairArray) {
    if (repairArrays["rza:cooldown"].get(repairArray.id) === 0 && repairArray.getProperty('rza:active') === true) {
        repairArrays["rza:cooldown"].set(repairArray.id, 40);
        const repairArrayLocation = repairArray.location;
        const repairables = repairArray.dimension.getEntities({
            location: repairArrayLocation,
            minDistance: 1,
            maxDistance: 32
        });
        const repairableEntities = repairables.filter(repairable => {
            if (!repairable.hasComponent(EntityComponentTypes.Health))
                return false;
            const healthComponent = repairable.getComponent(EntityComponentTypes.Health);
            const currentHealth = healthComponent.currentValue;
            const maxHealth = healthComponent.defaultValue;
            if (repairable.typeId === 'minecraft:player') {
                const player = repairable;
                const equipmentSlots = [
                    EquipmentSlot.Head,
                    EquipmentSlot.Chest,
                    EquipmentSlot.Legs,
                    EquipmentSlot.Feet,
                    EquipmentSlot.Mainhand,
                    EquipmentSlot.Offhand
                ];
                const inventory = player.getComponent(EntityComponentTypes.Inventory).container;
                let isAnyEquipmentRepairableInInventory = false;
                for (let i = 0; i < inventory.size; i++) {
                    const item = inventory.getItem(i);
                    const damaged = item?.getComponent(ItemComponentTypes.Durability);
                    if (damaged?.damage > 0)
                        isAnyEquipmentRepairableInInventory = true;
                }
                const isEquipmentRepairable = (slot) => {
                    const equipment = player?.getComponent(EntityComponentTypes.Equippable)?.getEquipment(slot);
                    const durabilityComponent = equipment?.getComponent(ItemComponentTypes.Durability);
                    return durabilityComponent?.damage > 0;
                };
                const isAnyEquipmentRepairable = equipmentSlots.some(isEquipmentRepairable);
                if (isAnyEquipmentRepairable || isAnyEquipmentRepairableInInventory)
                    return true;
            }
            return currentHealth < maxHealth &&
                !repairable.hasTag(`${repairArray.id}_target`) &&
                (repairable.getComponent(EntityComponentTypes.TypeFamily).hasTypeFamily('turret') ||
                    repairable.getComponent(EntityComponentTypes.TypeFamily).hasTypeFamily('utility'));
        });
        repairableEntities.sort((a, b) => {
            if (a.typeId === 'minecraft:player' && b.typeId !== 'minecraft:player')
                return -1;
            if (a.typeId !== 'minecraft:player' && b.typeId === 'minecraft:player')
                return 1;
            const healthA = a.getComponent(EntityComponentTypes.Health).currentValue;
            const healthB = b.getComponent(EntityComponentTypes.Health).currentValue;
            return healthA - healthB;
        });
        const maxRepairables = repairableEntities.slice(0, 5);
        if (maxRepairables.length > 0) {
            repairArray.setProperty('rza:fire', true);
            repairArray.dimension.playSound('turret.repair_array.beam', repairArrayLocation);
            let delayRemoveFire = system.runTimeout(() => {
                repairArray.setProperty('rza:fire', false);
                system.clearRun(delayRemoveFire);
            }, 10);
        }
        maxRepairables.forEach(repairable => {
            repairable.addTag(`${repairArray.id}_target`);
            if (repairable.typeId === 'minecraft:player') {
                const player = repairable;
                const playerLocation = player.location;
                const equipmentSlots = [
                    EquipmentSlot.Head,
                    EquipmentSlot.Chest,
                    EquipmentSlot.Legs,
                    EquipmentSlot.Feet,
                    EquipmentSlot.Mainhand,
                    EquipmentSlot.Offhand,
                ];
                const getDurabilityComponent = (slot) => {
                    const equipment = player?.getComponent(EntityComponentTypes.Equippable)?.getEquipment(slot);
                    return {
                        equipment,
                        durabilityComponent: equipment?.getComponent(ItemComponentTypes.Durability)
                    };
                };
                const durabilityComponents = equipmentSlots.map(getDurabilityComponent);
                durabilityComponents.forEach((component, index) => {
                    if (component.durabilityComponent && component.durabilityComponent.damage > 0) {
                        component.durabilityComponent.damage = Math.max(component.durabilityComponent.damage - 2, 0);
                        (player?.getComponent(EntityComponentTypes.Equippable)).setEquipment(equipmentSlots[index], component.equipment);
                    }
                });
                const inventory = player.getComponent(EntityComponentTypes.Inventory).container;
                for (let i = 0; i < inventory.size; i++) {
                    const item = inventory.getItem(i);
                    const damaged = item?.getComponent(ItemComponentTypes.Durability);
                    if (damaged?.damage > 0) {
                        damaged.damage = Math.max(damaged.damage - 2, 0);
                        inventory.getSlot(i).setItem(item);
                    }
                }
                const distance = calculateDistance(repairArrayLocation, playerLocation);
                world.scoreboard.getObjective('repair_distance').setScore(repairArray, distance);
                repairArray.runCommand(`execute positioned ${repairArrayLocation.x} ${repairArrayLocation.y + 1.5} ${repairArrayLocation.z} facing ${playerLocation.x} ${playerLocation.y + 0.3} ${playerLocation.z} run function world/turrets/repair_array/repair_beam`);
                player.dimension.spawnParticle('rza:repair_array_repair', playerLocation);
                player.dimension.playSound('turret.repair_array.repair', playerLocation);
            }
            else {
                const healthComponent = repairable.getComponent(EntityComponentTypes.Health);
                const health = healthComponent.currentValue;
                const repairableLocation = repairable.location;
                const distance = calculateDistance(repairArrayLocation, repairableLocation);
                world.scoreboard.getObjective('repair_distance').setScore(repairArray, distance);
                repairArray.runCommand(`execute positioned ${repairArrayLocation.x} ${repairArrayLocation.y + 1.5} ${repairArrayLocation.z} facing ${repairableLocation.x} ${repairableLocation.y + 0.3} ${repairableLocation.z} run function world/turrets/repair_array/repair_beam`);
                healthComponent.setCurrentValue(health + 4);
                repairable.dimension.spawnParticle('rza:repair_array_repair', repairableLocation);
                repairable.dimension.playSound('turret.repair_array.repair', repairableLocation);
            }
            repairable.removeTag(`${repairArray.id}_target`);
        });
    }
    else if (repairArrays["rza:cooldown"].get(repairArray.id) > 0) {
        repairArrays["rza:cooldown"].set(repairArray.id, repairArrays["rza:cooldown"].get(repairArray.id) - 1);
    }
    return;
}
function calculateDistance(loc1, loc2) {
    const dx = loc1.x - loc2.x;
    const dy = loc1.y - loc2.y;
    const dz = loc1.z - loc2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) * 2;
}
