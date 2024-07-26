import { EntityComponentTypes, EquipmentSlot, ItemComponentTypes, system, world } from "@minecraft/server";
import { calculateDistance, fixedPosRaycast } from "./raycast";
export const repairArrayCooldown = new Map();
export function repairArrayMechanics(repairArray) {
    const cooldown = repairArrayCooldown.get(repairArray.id) || 0;
    if (cooldown === 0 && repairArray.getProperty('rza:active') === true) {
        repairArrayCooldown.set(repairArray.id, 40);
        const repairArrayLocation = repairArray.location;
        const repairables = repairArray.dimension.getEntities({
            location: repairArrayLocation,
            minDistance: 1,
            maxDistance: 32
        });
        const repairableEntities = new Set();
        const equipmentSlots = [
            EquipmentSlot.Head,
            EquipmentSlot.Chest,
            EquipmentSlot.Legs,
            EquipmentSlot.Feet,
            EquipmentSlot.Mainhand,
            EquipmentSlot.Offhand
        ];
        repairables.forEach(repairable => {
            if (!repairable.hasComponent(EntityComponentTypes.Health))
                return;
            const healthComponent = repairable.getComponent(EntityComponentTypes.Health);
            const currentHealth = healthComponent.currentValue;
            const maxHealth = healthComponent.defaultValue;
            if (repairable.typeId === 'minecraft:player') {
                const player = repairable;
                const inventory = player.getComponent(EntityComponentTypes.Inventory).container;
                let isAnyEquipmentRepairableInInventory = false;
                for (let i = 0; i < inventory.size; i++) {
                    const item = inventory.getItem(i);
                    const damaged = item?.getComponent(ItemComponentTypes.Durability);
                    if (damaged?.damage > 0) {
                        isAnyEquipmentRepairableInInventory = true;
                        break;
                    }
                }
                const isAnyEquipmentRepairable = equipmentSlots.some(slot => {
                    const equipment = player?.getComponent(EntityComponentTypes.Equippable)?.getEquipment(slot);
                    const durabilityComponent = equipment?.getComponent(ItemComponentTypes.Durability);
                    return durabilityComponent?.damage > 0;
                });
                if (isAnyEquipmentRepairable || isAnyEquipmentRepairableInInventory) {
                    repairableEntities.add(repairable);
                }
            }
            else {
                if (currentHealth < maxHealth &&
                    !repairable.hasTag(`${repairArray.id}_target`) &&
                    (repairable.getComponent(EntityComponentTypes.TypeFamily).hasTypeFamily('turret') ||
                        repairable.getComponent(EntityComponentTypes.TypeFamily).hasTypeFamily('utility'))) {
                    repairableEntities.add(repairable);
                }
            }
        });
        const maxRepairables = Array.from(repairableEntities).sort((a, b) => {
            if (a.typeId === 'minecraft:player' && b.typeId !== 'minecraft:player')
                return -1;
            if (a.typeId !== 'minecraft:player' && b.typeId === 'minecraft:player')
                return 1;
            const healthA = a.getComponent(EntityComponentTypes.Health).currentValue;
            const healthB = b.getComponent(EntityComponentTypes.Health).currentValue;
            return healthA - healthB;
        }).slice(0, 5);
        if (maxRepairables.length > 0) {
            repairArray.setProperty('rza:fire', true);
            repairArray.dimension.playSound('turret.repair_array.beam', repairArrayLocation);
            const delayRemoveFire = system.runTimeout(() => {
                repairArray.setProperty('rza:fire', false);
                system.clearRun(delayRemoveFire);
            }, 10);
        }
        maxRepairables.forEach(repairable => {
            const dimension = repairable.dimension;
            const repairableLocation = repairable.location;
            repairable.addTag(`${repairArray.id}_target`);
            if (repairable.typeId === 'minecraft:player') {
                const player = repairable;
                const playerLocation = player.location;
                const inventory = player.getComponent(EntityComponentTypes.Inventory).container;
                equipmentSlots.forEach(slot => {
                    const equipment = player?.getComponent(EntityComponentTypes.Equippable)?.getEquipment(slot);
                    const durabilityComponent = equipment?.getComponent(ItemComponentTypes.Durability);
                    if (durabilityComponent && durabilityComponent.damage > 0) {
                        durabilityComponent.damage = Math.max(durabilityComponent.damage - 2, 0);
                        (player?.getComponent(EntityComponentTypes.Equippable)).setEquipment(slot, equipment);
                    }
                });
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
                fixedPosRaycast(repairArray, dimension, { x: repairArrayLocation.x, y: repairArrayLocation.y + 1.5, z: repairArrayLocation.z }, { x: playerLocation.x, y: playerLocation.y + 0.3, z: playerLocation.z }, distance, 'rza:repair_array_beam');
                player.dimension.spawnParticle('rza:repair_array_repair', playerLocation);
                player.dimension.playSound('turret.repair_array.repair', playerLocation);
            }
            else {
                const healthComponent = repairable.getComponent(EntityComponentTypes.Health);
                const health = healthComponent.currentValue;
                const maxHealth = healthComponent.defaultValue;
                const distance = calculateDistance(repairArrayLocation, repairableLocation);
                world.scoreboard.getObjective('repair_distance').setScore(repairArray, distance);
                fixedPosRaycast(repairArray, dimension, { x: repairArrayLocation.x, y: repairArrayLocation.y + 1.5, z: repairArrayLocation.z }, { x: repairableLocation.x, y: repairableLocation.y + 0.3, z: repairableLocation.z }, distance, 'rza:repair_array_beam');
                healthComponent.setCurrentValue(Math.max(health + 4, maxHealth));
                repairable.dimension.spawnParticle('rza:repair_array_repair', repairableLocation);
                repairable.dimension.playSound('turret.repair_array.repair', repairableLocation);
            }
            repairable.removeTag(`${repairArray.id}_target`);
        });
    }
    else if (cooldown > 0) {
        repairArrayCooldown.set(repairArray.id, cooldown - 1);
    }
}
