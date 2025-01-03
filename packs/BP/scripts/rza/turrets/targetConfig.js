import { ModalFormData } from "@minecraft/server-ui";
export function turretConfigurator(player, turret, turretName) {
    let zombieSelection = ['Walkers', 'Miners', 'Ferals', 'Spitters', 'Alphas'];
    const selectedZombieType = turret.getProperty('rza:target_zombies');
    zombieSelection = zombieSelection.filter(zombieType => zombieType !== selectedZombieType);
    zombieSelection.unshift(selectedZombieType);
    new ModalFormData()
        .title(`${turretName}`)
        .toggle('Prioritize Mutated Zombies', turret.getProperty('rza:prioritize_mutants'))
        .dropdown('§cPriority Target', zombieSelection)
        .show(player)
        .then((result) => {
        if (!result || !result.formValues)
            return;
        const [toggle, dropdown] = result.formValues;
        const selectedZombieType = zombieSelection[dropdown];
        if (toggle !== undefined) {
            turret.setProperty('rza:prioritize_mutants', toggle);
        }
        if (selectedZombieType !== undefined) {
            turret.setProperty('rza:target_zombies', selectedZombieType);
        }
        if (!toggle && selectedZombieType === 'All') {
            player.sendMessage(`[${turretName}] Targeting §cAll Zombies§r: Not Prioritizing Mutants`);
            turret.triggerEvent('rza:target_all_zombies');
        }
        if (toggle && selectedZombieType === 'All') {
            player.sendMessage(`[${turretName}] Targeting §cAll Zombies§r: Prioritizing Mutants`);
            turret.triggerEvent('rza:target_all_zombies_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Walkers') {
            player.sendMessage(`[${turretName}] Targeting §cWalkers§r: Not Prioritizing Mutants`);
            turret.triggerEvent('rza:target_walkers');
        }
        if (toggle && selectedZombieType === 'Walkers') {
            player.sendMessage(`[${turretName}] Targeting §cWalkers§r: Prioritizing Mutants`);
            turret.triggerEvent('rza:target_walkers_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Miners') {
            player.sendMessage(`[${turretName}] Targeting §cMiners§r: Not Prioritizing Mutants`);
            turret.triggerEvent('rza:target_miners');
        }
        if (toggle && selectedZombieType === 'Miners') {
            player.sendMessage(`[${turretName}] Targeting §cMiners§r: Prioritizing Mutants`);
            turret.triggerEvent('rza:target_miners_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Ferals') {
            player.sendMessage(`[${turretName}] Targeting §cFerals§r: Not Prioritizing Mutants`);
            turret.triggerEvent('rza:target_ferals');
        }
        if (toggle && selectedZombieType === 'Ferals') {
            player.sendMessage(`[${turretName}] Targeting §cFerals§r: Prioritizing Mutants`);
            turret.triggerEvent('rza:target_ferals_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Spitters') {
            player.sendMessage(`[${turretName}] Targeting §cSpitters§r: Not Prioritizing Mutants`);
            turret.triggerEvent('rza:target_spitters');
        }
        if (toggle && selectedZombieType === 'Spitters') {
            player.sendMessage(`[${turretName}] Targeting §cSpitters§r: Prioritizing Mutants`);
            turret.triggerEvent('rza:target_spitters_prioritize_mutants');
        }
        if (!toggle && selectedZombieType === 'Alphas') {
            player.sendMessage(`[${turretName}] Targeting §cAlphas§r: Not Prioritizing Mutants`);
            turret.triggerEvent('rza:target_alphas');
        }
        if (toggle && selectedZombieType === 'Alphas') {
            player.sendMessage(`[${turretName}] Targeting §cAlphas§r: Prioritizing Mutants`);
            turret.triggerEvent('rza:target_alphas_prioritize_mutants');
        }
    }).catch(() => {
        player.sendMessage(`[SYSTEM] §cConfiguration Canceled§r: Resetting to previous configuration.`);
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
        .then((result) => {
        if (!result || !result.formValues)
            return;
        const [toggle, dropdown] = result.formValues;
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
        if (toggle !== undefined) {
            turret.setProperty('rza:active_state', toggle);
        }
        if (selectedConvertType !== undefined) {
            turret.setProperty('rza:convert_items_to', selectedConvertType);
        }
    }).catch(() => {
        player.sendMessage(`[SYSTEM] §cConfiguration Canceled§r: Resetting to previous configuration.`);
    });
    return;
}
