import { Entity, Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

//Arrow Turret Configurator
export function arrowTurretConfigurator(player: Player, turret: Entity) {
    //Get the last configuration on the entity properties and apply it into the selections
    let zombieSelection = ['All', 'Walkers', 'Miners', 'Ferals', 'Spitters'];
    const selectedZombieType = turret.getProperty('rza:target_zombies') as string;

    // Remove the selectedZombieType from the array
    zombieSelection = zombieSelection.filter(zombieType => zombieType !== selectedZombieType);

    // Add the selectedZombieType as the first element in the array
    zombieSelection.unshift(selectedZombieType);

    new ModalFormData()
        .title("§2Arrow Turret§r")
        .toggle('Prioritize Mutated Zombies', turret.getProperty('rza:prioritize_mutants') as boolean)
        .dropdown('§cZombies to target', zombieSelection)
        .show(player)
        .then(({ formValues: [toggle, dropdown] }) => {
            const selectedZombieType = zombieSelection[dropdown as string];

            //All Zombies: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'All') {
                player.sendMessage('[§2Arrow Turret§r] Targeting §cAll Zombies§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_all_zombies');
            }

            //All Zombies: Prioritize Mutants
            if (toggle && selectedZombieType === 'All') {
                player.sendMessage('[§2Arrow Turret§r] Targeting §cAll Zombies§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_all_zombies_prioritize_mutants');
            }

            //Walkers: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Walkers') {
                player.sendMessage('[§2Arrow Turret§r] Targeting §cWalkers§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_walkers');
            }

            //Walkers: Prioritize Mutants
            if (toggle && selectedZombieType === 'Walkers') {
                player.sendMessage('[§2Arrow Turret§r] Targeting §cWalkers§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_walkers_prioritize_mutants');
            }

            //Miners: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Miners') {
                player.sendMessage('[§2Arrow Turret§r] Targeting §cMiners§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_miners');
            }

            //Miners: Prioritize Mutants
            if (toggle && selectedZombieType === 'Miners') {
                player.sendMessage('[§2Arrow Turret§r] Targeting §cMiners§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_miners_prioritize_mutants');
            }

            //Ferals: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Ferals') {
                player.sendMessage('[§2Arrow Turret§r] Targeting §cFerals§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_ferals');
            }

            //Ferals: Prioritize Mutants
            if (toggle && selectedZombieType === 'Ferals') {
                player.sendMessage('[§2Arrow Turret§r] Targeting §cFerals§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_ferals_prioritize_mutants');
            }

            //Spitters: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Spitters') {
                player.sendMessage('[§2Arrow Turret§r] Targeting §cSpitters§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_spitters');
            }

            //Spitters: Prioritize Mutants
            if (toggle && selectedZombieType === 'Spitters') {
                player.sendMessage('[§2Arrow Turret§r] Targeting §cSpitters§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_spitters_prioritize_mutants');
            }


            turret.setProperty('rza:prioritize_mutants', toggle);
            turret.setProperty('rza:target_zombies', selectedZombieType);
        }).catch((e) => {
            console.error(e, e.stack)
        });
    return;
}

//Pyro Charger Configurator
export function pyroChargerConfigurator(player: Player, turret: Entity) {
    //Get the last configuration on the entity properties and apply it into the selections
    let zombieSelection = ['All', 'Walkers', 'Miners', 'Ferals', 'Spitters'];
    const selectedZombieType = turret.getProperty('rza:target_zombies') as string;

    // Remove the selectedZombieType from the array
    zombieSelection = zombieSelection.filter(zombieType => zombieType !== selectedZombieType);

    // Add the selectedZombieType as the first element in the array
    zombieSelection.unshift(selectedZombieType);

    new ModalFormData()
        .title("§6Pyro Charger§r")
        .toggle('Prioritize Mutated Zombies', turret.getProperty('rza:prioritize_mutants') as boolean)
        .dropdown('§cZombies to target', zombieSelection)
        .show(player)
        .then(({ formValues: [toggle, dropdown] }) => {
            const selectedZombieType = zombieSelection[dropdown as string];

            //All Zombies: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'All') {
                player.sendMessage('[§6Pyro Charger§r] Targeting §cAll Zombies§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_all_zombies');
            }

            //All Zombies: Prioritize Mutants
            if (toggle && selectedZombieType === 'All') {
                player.sendMessage('[§6Pyro Charger§r] Targeting §cAll Zombies§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_all_zombies_prioritize_mutants');
            }

            //Walkers: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Walkers') {
                player.sendMessage('[§6Pyro Charger§r] Targeting §cWalkers§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_walkers');
            }

            //Walkers: Prioritize Mutants
            if (toggle && selectedZombieType === 'Walkers') {
                player.sendMessage('[§6Pyro Charger§r] Targeting §cWalkers§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_walkers_prioritize_mutants');
            }

            //Miners: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Miners') {
                player.sendMessage('[§6Pyro Charger§r] Targeting §cMiners§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_miners');
            }

            //Miners: Prioritize Mutants
            if (toggle && selectedZombieType === 'Miners') {
                player.sendMessage('[§6Pyro Charger§r] Targeting §cMiners§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_miners_prioritize_mutants');
            }

            //Ferals: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Ferals') {
                player.sendMessage('[§6Pyro Charger§r] Targeting §cFerals§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_ferals');
            }

            //Ferals: Prioritize Mutants
            if (toggle && selectedZombieType === 'Ferals') {
                player.sendMessage('[§6Pyro Charger§r] Targeting §cFerals§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_ferals_prioritize_mutants');
            }

            //Spitters: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Spitters') {
                player.sendMessage('[§6Pyro Charger§r] Targeting §cSpitters§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_spitters');
            }

            //Spitters: Prioritize Mutants
            if (toggle && selectedZombieType === 'Spitters') {
                player.sendMessage('[§6Pyro Charger§r] Targeting §cSpitters§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_spitters_prioritize_mutants');
            }


            turret.setProperty('rza:prioritize_mutants', toggle);
            turret.setProperty('rza:target_zombies', selectedZombieType);
        }).catch((e) => {
            console.error(e, e.stack)
        });
    return;
}

//Sonic Cannon Configurator
export function sonicCannonConfigurator(player: Player, turret: Entity) {
    //Get the last configuration on the entity properties and apply it into the selections
    let zombieSelection = ['All', 'Walkers', 'Miners', 'Ferals', 'Spitters'];
    const selectedZombieType = turret.getProperty('rza:target_zombies') as string;

    // Remove the selectedZombieType from the array
    zombieSelection = zombieSelection.filter(zombieType => zombieType !== selectedZombieType);

    // Add the selectedZombieType as the first element in the array
    zombieSelection.unshift(selectedZombieType);

    new ModalFormData()
        .title("§5Sonic Cannon§r")
        .toggle('Prioritize Mutated Zombies', turret.getProperty('rza:prioritize_mutants') as boolean)
        .dropdown('§cZombies to target', zombieSelection)
        .show(player)
        .then(({ formValues: [toggle, dropdown] }) => {
            const selectedZombieType = zombieSelection[dropdown as string];

            //All Zombies: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'All') {
                player.sendMessage('[§5Sonic Cannon§r] Targeting §cAll Zombies§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_all_zombies');
            }

            //All Zombies: Prioritize Mutants
            if (toggle && selectedZombieType === 'All') {
                player.sendMessage('[§5Sonic Cannon§r] Targeting §cAll Zombies§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_all_zombies_prioritize_mutants');
            }

            //Walkers: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Walkers') {
                player.sendMessage('[§5Sonic Cannon§r] Targeting §cWalkers§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_walkers');
            }

            //Walkers: Prioritize Mutants
            if (toggle && selectedZombieType === 'Walkers') {
                player.sendMessage('[§5Sonic Cannon§r] Targeting §cWalkers§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_walkers_prioritize_mutants');
            }

            //Miners: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Miners') {
                player.sendMessage('[§5Sonic Cannon§r] Targeting §cMiners§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_miners');
            }

            //Miners: Prioritize Mutants
            if (toggle && selectedZombieType === 'Miners') {
                player.sendMessage('[§5Sonic Cannon§r] Targeting §cMiners§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_miners_prioritize_mutants');
            }

            //Ferals: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Ferals') {
                player.sendMessage('[§5Sonic Cannon§r] Targeting §cFerals§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_ferals');
            }

            //Ferals: Prioritize Mutants
            if (toggle && selectedZombieType === 'Ferals') {
                player.sendMessage('[§5Sonic Cannon§r] Targeting §cFerals§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_ferals_prioritize_mutants');
            }

            //Spitters: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Spitters') {
                player.sendMessage('[§5Sonic Cannon§r] Targeting §cSpitters§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_spitters');
            }

            //Spitters: Prioritize Mutants
            if (toggle && selectedZombieType === 'Spitters') {
                player.sendMessage('[§5Sonic Cannon§r] Targeting §cSpitters§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_spitters_prioritize_mutants');
            }


            turret.setProperty('rza:prioritize_mutants', toggle);
            turret.setProperty('rza:target_zombies', selectedZombieType);
        }).catch((e) => {
            console.error(e, e.stack)
        });
    return;
}

//Storm Weaver Configurator
export function stormWeaverConfigurator(player: Player, turret: Entity) {
    //Get the last configuration on the entity properties and apply it into the selections
    let zombieSelection = ['All', 'Walkers', 'Miners', 'Ferals', 'Spitters'];
    const selectedZombieType = turret.getProperty('rza:target_zombies') as string;

    // Remove the selectedZombieType from the array
    zombieSelection = zombieSelection.filter(zombieType => zombieType !== selectedZombieType);

    // Add the selectedZombieType as the first element in the array
    zombieSelection.unshift(selectedZombieType);

    new ModalFormData()
        .title("§cStorm Weaver§r")
        .toggle('Prioritize Mutated Zombies', turret.getProperty('rza:prioritize_mutants') as boolean)
        .dropdown('§cZombies to target', zombieSelection)
        .show(player)
        .then(({ formValues: [toggle, dropdown] }) => {
            const selectedZombieType = zombieSelection[dropdown as string];

            //All Zombies: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'All') {
                player.sendMessage('[§cStorm Weaver§r] Targeting §cAll Zombies§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_all_zombies');
            }

            //All Zombies: Prioritize Mutants
            if (toggle && selectedZombieType === 'All') {
                player.sendMessage('[§cStorm Weaver§r] Targeting §cAll Zombies§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_all_zombies_prioritize_mutants');
            }

            //Walkers: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Walkers') {
                player.sendMessage('[§cStorm Weaver§r] Targeting §cWalkers§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_walkers');
            }

            //Walkers: Prioritize Mutants
            if (toggle && selectedZombieType === 'Walkers') {
                player.sendMessage('[§cStorm Weaver§r] Targeting §cWalkers§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_walkers_prioritize_mutants');
            }

            //Miners: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Miners') {
                player.sendMessage('[§cStorm Weaver§r] Targeting §cMiners§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_miners');
            }

            //Miners: Prioritize Mutants
            if (toggle && selectedZombieType === 'Miners') {
                player.sendMessage('[§cStorm Weaver§r] Targeting §cMiners§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_miners_prioritize_mutants');
            }

            //Ferals: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Ferals') {
                player.sendMessage('[§cStorm Weaver§r] Targeting §cFerals§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_ferals');
            }

            //Ferals: Prioritize Mutants
            if (toggle && selectedZombieType === 'Ferals') {
                player.sendMessage('[§cStorm Weaver§r] Targeting §cFerals§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_ferals_prioritize_mutants');
            }

            //Spitters: Don't Prioritize Mutants
            if (!toggle && selectedZombieType === 'Spitters') {
                player.sendMessage('[§cStorm Weaver§r] Targeting §cSpitters§r: Not Prioritizing Mutants');
                turret.triggerEvent('rza:target_spitters');
            }

            //Spitters: Prioritize Mutants
            if (toggle && selectedZombieType === 'Spitters') {
                player.sendMessage('[§cStorm Weaver§r] Targeting §cSpitters§r: Prioritizing Mutants');
                turret.triggerEvent('rza:target_spitters_prioritize_mutants');
            }


            turret.setProperty('rza:prioritize_mutants', toggle);
            turret.setProperty('rza:target_zombies', selectedZombieType);
        }).catch((e) => {
            console.error(e, e.stack)
        });
    return;
}

//Pulsar System Configurator
export function pulsarSystemConfigurator(player: Player, turret: Entity) {
    //Get the last configuration on the entity properties and apply it into the selections
    let convertTo = ['Charcoal', 'XP'];
    const selectedConvertType = turret.getProperty('rza:convert_items_to') as string;

    // Remove the selectedConvertType from the array
    convertTo = convertTo.filter(convertType => convertType !== selectedConvertType);

    // Add the selectedConvertType as the first element in the array
    convertTo.unshift(selectedConvertType);

    new ModalFormData()
        .title("§cPulsar System§r")
        .toggle('Active', turret.getProperty('rza:active_state') as boolean)
        .dropdown('Convert Items to', convertTo)
        .show(player)
        .then(({ formValues: [toggle, dropdown] }) => {
            const selectedConvertType = convertTo[dropdown as string];

            //Active: Convert Items to Charcoal
            if (toggle && selectedConvertType === 'Charcoal') {
                player.sendMessage('[§cPulsar System§r] §2Active§r: Converting items to Charcoal');
            }

            //Active: Convert Items to XP Orbs
            if (toggle && selectedConvertType === 'XP') {
                player.sendMessage('[§cPulsar System§r] §2Active§r: Converting items to XP Orbs');
            }

            //Inactive: Convert Items to Charcoal
            if (!toggle && selectedConvertType === 'Charcoal') {
                player.sendMessage('[§cPulsar System§r] §4Inactive§r: Converting items to Charcoal');
            }

            //Inactive: Convert Items to XP Orbs
            if (!toggle && selectedConvertType === 'XP') {
                player.sendMessage('[§cPulsar System§r] §4Inactive§r: Converting items to XP Orbs');
            }

            turret.setProperty('rza:active_state', toggle);
            turret.setProperty('rza:convert_items_to', selectedConvertType);
        }).catch((e) => {
            console.error(e, e.stack)
        });
    return;
}