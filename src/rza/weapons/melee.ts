import { Entity, EntityComponentTypes, EntityDamageCause, EntityEquippableComponent, EquipmentSlot, ItemComponentTypes, ItemEnchantableComponent, ItemStack, system } from "@minecraft/server";

// Map to store cooldown for each wielder
export const meleeWeaponCooldown = new Map();

// Function for player melee weapon attack
export function playerMeleeWeaponAttack(entityHit: Entity, wielder: Entity, weapon: ItemStack) {
    const weaponId = weapon?.typeId;
    const hitLocation = entityHit.location;
    meleeWeaponCooldown.set(wielder.id, 20);

    if (weaponId?.endsWith('axe') || weaponId?.endsWith('sword')) {
        // Spawn particle effect to indicate the melee attack
        entityHit.dimension.spawnParticle('rza:melee_sweep', { x: hitLocation.x, y: hitLocation.y + 0.5, z: hitLocation.z });

        // Play sound effect for the melee attack
        entityHit.dimension.playSound('weapon.melee.sweep', { x: hitLocation.x, y: hitLocation.y + 0.5, z: hitLocation.z }, { volume: 2 });

        // Check if the weapon has the sharpness enchantment
        const equippableComponent = wielder.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
        const mainhandEquipment = equippableComponent?.getEquipment(EquipmentSlot.Mainhand);
        const enchantableComponent = mainhandEquipment?.getComponent(ItemComponentTypes.Enchantable) as ItemEnchantableComponent;
        const hasSharpnessEnchantment = enchantableComponent?.hasEnchantment('sharpness');
        const sharpnessLevel = enchantableComponent?.getEnchantment('sharpness')?.level;

        // Get nearby entities within a certain range
        const nearbyEntities = entityHit.dimension.getEntities({ location: hitLocation, minDistance: 1, maxDistance: 3, excludeFamilies: ['player', 'turret', 'inanimate', 'utility', 'illager', 'villager', 'irongolem', 'wandering_trader'] });

        // Apply damage to each nearby entity
        for (const hit of nearbyEntities) {
            const damage = hasSharpnessEnchantment ? 0 + (sharpnessLevel ?? 0) : 1;
            hit.applyDamage(damage, { damagingEntity: wielder, cause: EntityDamageCause.entityAttack });
        }
    }

    // Run interval to update weapon cooldown
    const cooldown = system.runInterval(() => {
        const cooldownTime = meleeWeaponCooldown.get(wielder.id) as number;
        if (cooldownTime === 20) {
            wielder.runCommand('title @s actionbar Weapon Cooldown: 1s');
        } else if (cooldownTime === 1) {
            wielder.runCommand('title @s actionbar Weapon Cooldown: 0s');
        }
        meleeWeaponCooldown.set(wielder.id, Math.max(cooldownTime - 1, 0));
        if (cooldownTime === 0) {
            system.clearRun(cooldown);
        }
    });
}

// Function for non-player melee weapon attack
export function nonPlayerMeleeWeaponAttack(entityHit: Entity, wielder: Entity) {
    meleeWeaponCooldown.set(wielder.id, 20);
    const hitLocation = entityHit.location;

    // Spawn particle effect to indicate the melee attack
    entityHit.dimension.spawnParticle('rza:melee_sweep', { x: hitLocation.x, y: hitLocation.y + 0.5, z: hitLocation.z });

    // Play sound effect for the melee attack
    entityHit.dimension.playSound('weapon.melee.sweep', { x: hitLocation.x, y: hitLocation.y + 0.5, z: hitLocation.z }, { volume: 2 });

    // Get nearby entities within a certain range
    const nearbyEntities = entityHit.dimension.getEntities({ location: hitLocation, minDistance: 1, maxDistance: 2.5, excludeFamilies: ['player', 'turret', 'inanimate', 'utility', 'illager', 'villager', 'irongolem', 'wandering_trader'] });

    // Apply damage to each nearby entity
    for (const hit of nearbyEntities) {
        hit.applyDamage(2, { damagingEntity: wielder, cause: EntityDamageCause.entityAttack });
    }

    // Run interval to update weapon cooldown
    const cooldown = system.runInterval(() => {
        const cooldownTime = meleeWeaponCooldown.get(wielder.id);
        meleeWeaponCooldown.set(wielder.id, Math.max(cooldownTime - 1, 0));
        if (cooldownTime === 0) {
            system.clearRun(cooldown);
        }
    });
}
