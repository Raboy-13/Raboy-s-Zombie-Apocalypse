import { Entity, EntityComponentTypes, EntityDamageCause, EntityEquippableComponent, EquipmentSlot, ItemComponentTypes, ItemEnchantableComponent, system } from "@minecraft/server";

export let meleeWeaponCooldown = new Map();
export function playerMeleeWeaponAttack(entityHit: Entity, wielder: Entity) {
    meleeWeaponCooldown.set(wielder.id, 20);
    const hitLocation = entityHit.location;
    entityHit.dimension.spawnParticle('rza:melee_sweep', { x: hitLocation.x, y: hitLocation.y + 0.5, z: hitLocation.z });
    entityHit.dimension.playSound('weapon.melee.sweep', { x: hitLocation.x, y: hitLocation.y + 0.5, z: hitLocation.z }, { volume: 2 });
    const weapon = (wielder.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent);
    const hasSharpnessEnchantment = (weapon?.getEquipment(EquipmentSlot.Mainhand)?.getComponent(ItemComponentTypes.Enchantable) as ItemEnchantableComponent)?.hasEnchantment('sharpness');
    const sharpnessLevel = (weapon?.getEquipment(EquipmentSlot.Mainhand)?.getComponent(ItemComponentTypes.Enchantable) as ItemEnchantableComponent)?.getEnchantment('sharpness')?.level;

    const nearbyEntities = entityHit.dimension.getEntities({ location: hitLocation, minDistance: 1, maxDistance: 3, excludeFamilies: ['player', 'turret', 'inanimate', 'utility', 'illager', 'villager', 'irongolem', 'wandering_trader'] });
    nearbyEntities.forEach(hit => {
        if (hasSharpnessEnchantment) {
            hit.applyDamage((0 + sharpnessLevel), { damagingEntity: wielder, cause: EntityDamageCause.entityAttack });
        }
        else hit.applyDamage(1, { damagingEntity: wielder, cause: EntityDamageCause.entityAttack });
    })
    let cooldown = system.runInterval(() => {
        if ((meleeWeaponCooldown.get(wielder.id) == 20)) wielder.runCommand('title @s actionbar Weapon Cooldown: 1s');
        else if ((meleeWeaponCooldown.get(wielder.id) == 1)) wielder.runCommand('title @s actionbar Weapon Cooldown: 0s');
        meleeWeaponCooldown.set(wielder.id, meleeWeaponCooldown.get(wielder.id) - 1);
        if (meleeWeaponCooldown.get(wielder.id) == 0) system.clearRun(cooldown);
    })
    return;

}

export function nonPlayerMeleeWeaponAttack(entityHit: Entity, wielder: Entity) {
    meleeWeaponCooldown.set(wielder.id, 20);
    const hitLocation = entityHit.location;
    entityHit.dimension.spawnParticle('rza:melee_sweep', { x: hitLocation.x, y: hitLocation.y + 0.5, z: hitLocation.z });
    entityHit.dimension.playSound('weapon.melee.sweep', { x: hitLocation.x, y: hitLocation.y + 0.5, z: hitLocation.z }, { volume: 2 });
    const nearbyEntities = entityHit.dimension.getEntities({ location: hitLocation, minDistance: 1, maxDistance: 2.5, excludeFamilies: ['player', 'turret', 'inanimate', 'utility', 'illager', 'villager', 'irongolem', 'wandering_trader'] });
    nearbyEntities.forEach(hit => {
        hit.applyDamage(2, { damagingEntity: wielder, cause: EntityDamageCause.entityAttack });
    })
    let cooldown = system.runInterval(() => {
        meleeWeaponCooldown.set(wielder.id, meleeWeaponCooldown.get(wielder.id) - 1);
        if (meleeWeaponCooldown.get(wielder.id) == 0) system.clearRun(cooldown);
    })
    return;

}