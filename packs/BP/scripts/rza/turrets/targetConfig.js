import { ModalFormData } from "@minecraft/server-ui";
export function arrowTurretConfigurator(player, turret) {
    let zombieSelection = ['All', 'Walkers', 'Miners', 'Ferals', 'Spitters'];
    const selectedZombieType = turret.getProperty('rza:target_zombies');
    zombieSelection = zombieSelection.filter(zombieType => zombieType !== selectedZombieType);
    zombieSelection.unshift(selectedZombieType);
    new ModalFormData()
        .title("§2Arrow Turret§r")
        .toggle('Prioritize Mutated Zombies', turret.getProperty('rza:prioritize_mutants'))
        .dropdown('§cZombies to target', zombieSelection)
        .show(player)
        .then(({ formValues: [toggle, dropdown] }) => {
        const selectedZombieType = zombieSelection[dropdown];
        if (!toggle && selectedZombieType === 'All') {
            player.sendMessage('[§2Arrow Turret§r] Targeting §cAll Zombies§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_all_zombies');
        }
        if (toggle && selectedZombieType === 'All') {
            player.sendMessage('[§2Arrow Turret§r] Targeting §cAll Zombies§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_all_zombies_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Walkers') {
            player.sendMessage('[§2Arrow Turret§r] Targeting §cWalkers§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_walkers');
        }
        if (toggle && selectedZombieType === 'Walkers') {
            player.sendMessage('[§2Arrow Turret§r] Targeting §cWalkers§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_walkers_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Miners') {
            player.sendMessage('[§2Arrow Turret§r] Targeting §cMiners§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_miners');
        }
        if (toggle && selectedZombieType === 'Miners') {
            player.sendMessage('[§2Arrow Turret§r] Targeting §cMiners§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_miners_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Ferals') {
            player.sendMessage('[§2Arrow Turret§r] Targeting §cFerals§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_ferals');
        }
        if (toggle && selectedZombieType === 'Ferals') {
            player.sendMessage('[§2Arrow Turret§r] Targeting §cFerals§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_ferals_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Spitters') {
            player.sendMessage('[§2Arrow Turret§r] Targeting §cSpitters§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_spitters');
        }
        if (toggle && selectedZombieType === 'Spitters') {
            player.sendMessage('[§2Arrow Turret§r] Targeting §cSpitters§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_spitters_prioritize_mutants');
        }
        turret.setProperty('rza:prioritize_mutants', toggle);
        turret.setProperty('rza:target_zombies', selectedZombieType);
    }).catch((e) => {
        console.error(e, e.stack);
    });
    return;
}
export function pyroChargerConfigurator(player, turret) {
    let zombieSelection = ['All', 'Walkers', 'Miners', 'Ferals', 'Spitters'];
    const selectedZombieType = turret.getProperty('rza:target_zombies');
    zombieSelection = zombieSelection.filter(zombieType => zombieType !== selectedZombieType);
    zombieSelection.unshift(selectedZombieType);
    new ModalFormData()
        .title("§6Pyro Charger§r")
        .toggle('Prioritize Mutated Zombies', turret.getProperty('rza:prioritize_mutants'))
        .dropdown('§cZombies to target', zombieSelection)
        .show(player)
        .then(({ formValues: [toggle, dropdown] }) => {
        const selectedZombieType = zombieSelection[dropdown];
        if (!toggle && selectedZombieType === 'All') {
            player.sendMessage('[§6Pyro Charger§r] Targeting §cAll Zombies§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_all_zombies');
        }
        if (toggle && selectedZombieType === 'All') {
            player.sendMessage('[§6Pyro Charger§r] Targeting §cAll Zombies§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_all_zombies_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Walkers') {
            player.sendMessage('[§6Pyro Charger§r] Targeting §cWalkers§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_walkers');
        }
        if (toggle && selectedZombieType === 'Walkers') {
            player.sendMessage('[§6Pyro Charger§r] Targeting §cWalkers§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_walkers_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Miners') {
            player.sendMessage('[§6Pyro Charger§r] Targeting §cMiners§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_miners');
        }
        if (toggle && selectedZombieType === 'Miners') {
            player.sendMessage('[§6Pyro Charger§r] Targeting §cMiners§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_miners_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Ferals') {
            player.sendMessage('[§6Pyro Charger§r] Targeting §cFerals§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_ferals');
        }
        if (toggle && selectedZombieType === 'Ferals') {
            player.sendMessage('[§6Pyro Charger§r] Targeting §cFerals§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_ferals_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Spitters') {
            player.sendMessage('[§6Pyro Charger§r] Targeting §cSpitters§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_spitters');
        }
        if (toggle && selectedZombieType === 'Spitters') {
            player.sendMessage('[§6Pyro Charger§r] Targeting §cSpitters§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_spitters_prioritize_mutants');
        }
        turret.setProperty('rza:prioritize_mutants', toggle);
        turret.setProperty('rza:target_zombies', selectedZombieType);
    }).catch((e) => {
        console.error(e, e.stack);
    });
    return;
}
export function sonicCannonConfigurator(player, turret) {
    let zombieSelection = ['All', 'Walkers', 'Miners', 'Ferals', 'Spitters'];
    const selectedZombieType = turret.getProperty('rza:target_zombies');
    zombieSelection = zombieSelection.filter(zombieType => zombieType !== selectedZombieType);
    zombieSelection.unshift(selectedZombieType);
    new ModalFormData()
        .title("§5Sonic Cannon§r")
        .toggle('Prioritize Mutated Zombies', turret.getProperty('rza:prioritize_mutants'))
        .dropdown('§cZombies to target', zombieSelection)
        .show(player)
        .then(({ formValues: [toggle, dropdown] }) => {
        const selectedZombieType = zombieSelection[dropdown];
        if (!toggle && selectedZombieType === 'All') {
            player.sendMessage('[§5Sonic Cannon§r] Targeting §cAll Zombies§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_all_zombies');
        }
        if (toggle && selectedZombieType === 'All') {
            player.sendMessage('[§5Sonic Cannon§r] Targeting §cAll Zombies§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_all_zombies_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Walkers') {
            player.sendMessage('[§5Sonic Cannon§r] Targeting §cWalkers§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_walkers');
        }
        if (toggle && selectedZombieType === 'Walkers') {
            player.sendMessage('[§5Sonic Cannon§r] Targeting §cWalkers§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_walkers_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Miners') {
            player.sendMessage('[§5Sonic Cannon§r] Targeting §cMiners§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_miners');
        }
        if (toggle && selectedZombieType === 'Miners') {
            player.sendMessage('[§5Sonic Cannon§r] Targeting §cMiners§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_miners_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Ferals') {
            player.sendMessage('[§5Sonic Cannon§r] Targeting §cFerals§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_ferals');
        }
        if (toggle && selectedZombieType === 'Ferals') {
            player.sendMessage('[§5Sonic Cannon§r] Targeting §cFerals§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_ferals_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Spitters') {
            player.sendMessage('[§5Sonic Cannon§r] Targeting §cSpitters§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_spitters');
        }
        if (toggle && selectedZombieType === 'Spitters') {
            player.sendMessage('[§5Sonic Cannon§r] Targeting §cSpitters§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_spitters_prioritize_mutants');
        }
        turret.setProperty('rza:prioritize_mutants', toggle);
        turret.setProperty('rza:target_zombies', selectedZombieType);
    }).catch((e) => {
        console.error(e, e.stack);
    });
    return;
}
export function stormWeaverConfigurator(player, turret) {
    let zombieSelection = ['All', 'Walkers', 'Miners', 'Ferals', 'Spitters'];
    const selectedZombieType = turret.getProperty('rza:target_zombies');
    zombieSelection = zombieSelection.filter(zombieType => zombieType !== selectedZombieType);
    zombieSelection.unshift(selectedZombieType);
    new ModalFormData()
        .title("§cStorm Weaver§r")
        .toggle('Prioritize Mutated Zombies', turret.getProperty('rza:prioritize_mutants'))
        .dropdown('§cZombies to target', zombieSelection)
        .show(player)
        .then(({ formValues: [toggle, dropdown] }) => {
        const selectedZombieType = zombieSelection[dropdown];
        if (!toggle && selectedZombieType === 'All') {
            player.sendMessage('[§cStorm Weaver§r] Targeting §cAll Zombies§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_all_zombies');
        }
        if (toggle && selectedZombieType === 'All') {
            player.sendMessage('[§cStorm Weaver§r] Targeting §cAll Zombies§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_all_zombies_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Walkers') {
            player.sendMessage('[§cStorm Weaver§r] Targeting §cWalkers§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_walkers');
        }
        if (toggle && selectedZombieType === 'Walkers') {
            player.sendMessage('[§cStorm Weaver§r] Targeting §cWalkers§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_walkers_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Miners') {
            player.sendMessage('[§cStorm Weaver§r] Targeting §cMiners§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_miners');
        }
        if (toggle && selectedZombieType === 'Miners') {
            player.sendMessage('[§cStorm Weaver§r] Targeting §cMiners§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_miners_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Ferals') {
            player.sendMessage('[§cStorm Weaver§r] Targeting §cFerals§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_ferals');
        }
        if (toggle && selectedZombieType === 'Ferals') {
            player.sendMessage('[§cStorm Weaver§r] Targeting §cFerals§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_ferals_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Spitters') {
            player.sendMessage('[§cStorm Weaver§r] Targeting §cSpitters§r: Not Prioritizing Mutants');
            turret.triggerEvent('rza:target_spitters');
        }
        if (toggle && selectedZombieType === 'Spitters') {
            player.sendMessage('[§cStorm Weaver§r] Targeting §cSpitters§r: Prioritizing Mutants');
            turret.triggerEvent('rza:target_spitters_prioritize_mutants');
        }
        turret.setProperty('rza:prioritize_mutants', toggle);
        turret.setProperty('rza:target_zombies', selectedZombieType);
    }).catch((e) => {
        console.error(e, e.stack);
    });
    return;
}
export function pulsarSystemConfigurator(player, turret) {
    let convertTo = ['Charcoal', 'XP'];
    const selectedConvertType = turret.getProperty('rza:convert_items_to');
    convertTo = convertTo.filter(convertType => convertType !== selectedConvertType);
    convertTo.unshift(selectedConvertType);
    new ModalFormData()
        .title("§cPulsar System§r")
        .toggle('Active', turret.getProperty('rza:active_state'))
        .dropdown('Convert Items to', convertTo)
        .show(player)
        .then(({ formValues: [toggle, dropdown] }) => {
        const selectedConvertType = convertTo[dropdown];
        if (toggle && selectedConvertType === 'Charcoal') {
            player.sendMessage('[§cPulsar System§r] §2Active§r: Converting items to Charcoal');
        }
        if (toggle && selectedConvertType === 'XP') {
            player.sendMessage('[§cPulsar System§r] §2Active§r: Converting items to XP Orbs');
        }
        if (!toggle && selectedConvertType === 'Charcoal') {
            player.sendMessage('[§cPulsar System§r] §4Inactive§r: Converting items to Charcoal');
        }
        if (!toggle && selectedConvertType === 'XP') {
            player.sendMessage('[§cPulsar System§r] §4Inactive§r: Converting items to XP Orbs');
        }
        turret.setProperty('rza:active_state', toggle);
        turret.setProperty('rza:convert_items_to', selectedConvertType);
    }).catch((e) => {
        console.error(e, e.stack);
    });
    return;
}
