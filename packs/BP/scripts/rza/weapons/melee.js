import { EntityComponentTypes, EntityDamageCause, EquipmentSlot, ItemComponentTypes, system } from "@minecraft/server";
export const meleeWeaponCooldown = new Map();
export function playerMeleeWeaponAttack(entityHit, wielder, weapon) {
    const weaponId = weapon?.type.id;
    const hitLocation = entityHit.location;
    meleeWeaponCooldown.set(wielder.id, 20);
    if (weaponId?.endsWith('axe') || weaponId?.endsWith('sword')) {
        entityHit.dimension.spawnParticle('rza:melee_sweep', { x: hitLocation.x, y: hitLocation.y + 0.5, z: hitLocation.z });
        entityHit.dimension.playSound('weapon.melee.sweep', { x: hitLocation.x, y: hitLocation.y + 0.5, z: hitLocation.z }, { volume: 2 });
        const equippableComponent = wielder.getComponent(EntityComponentTypes.Equippable);
        const mainhandEquipment = equippableComponent?.getEquipment(EquipmentSlot.Mainhand);
        const enchantableComponent = mainhandEquipment?.getComponent(ItemComponentTypes.Enchantable);
        const hasSharpnessEnchantment = enchantableComponent?.hasEnchantment('sharpness');
        const sharpnessLevel = enchantableComponent?.getEnchantment('sharpness')?.level;
        const nearbyEntities = entityHit.dimension.getEntities({ location: hitLocation, minDistance: 1, maxDistance: 3, excludeFamilies: ['player', 'turret', 'inanimate', 'utility', 'illager', 'villager', 'irongolem', 'wandering_trader'] });
        for (const hit of nearbyEntities) {
            const damage = hasSharpnessEnchantment ? 0 + (sharpnessLevel ?? 0) : 1;
            hit.applyDamage(damage, { damagingEntity: wielder, cause: EntityDamageCause.entityAttack });
        }
    }
    const cooldown = system.runInterval(() => {
        const cooldownTime = meleeWeaponCooldown.get(wielder.id);
        meleeWeaponCooldown.set(wielder.id, Math.max(cooldownTime - 1, 0));
        if (cooldownTime === 0) {
            system.clearRun(cooldown);
        }
    });
}
export function nonPlayerMeleeWeaponAttack(entityHit, wielder) {
    meleeWeaponCooldown.set(wielder.id, 20);
    const hitLocation = entityHit.location;
    entityHit.dimension.spawnParticle('rza:melee_sweep', { x: hitLocation.x, y: hitLocation.y + 0.5, z: hitLocation.z });
    entityHit.dimension.playSound('weapon.melee.sweep', { x: hitLocation.x, y: hitLocation.y + 0.5, z: hitLocation.z }, { volume: 2 });
    const nearbyEntities = entityHit.dimension.getEntities({ location: hitLocation, minDistance: 1, maxDistance: 2.5, excludeFamilies: ['player', 'turret', 'inanimate', 'utility', 'illager', 'villager', 'irongolem', 'wandering_trader'] });
    for (const hit of nearbyEntities) {
        hit.applyDamage(2, { damagingEntity: wielder, cause: EntityDamageCause.entityAttack });
    }
    const cooldown = system.runInterval(() => {
        const cooldownTime = meleeWeaponCooldown.get(wielder.id);
        meleeWeaponCooldown.set(wielder.id, Math.max(cooldownTime - 1, 0));
        if (cooldownTime === 0) {
            system.clearRun(cooldown);
        }
    });
}
