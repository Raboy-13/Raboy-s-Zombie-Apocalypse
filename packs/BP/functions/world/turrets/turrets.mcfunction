##Arrow Turret
execute as @e[type=rza:arrow_turret, tag=!active] at @s if block ~ ~-0.5 ~ rza:turret_base run event entity @s rza:activate
execute as @e[type=rza:arrow_turret, tag=!active] at @s if block ~ ~-0.5 ~ rza:turret_base run tag @s add active
execute as @e[type=rza:arrow_turret, tag=active] at @s unless block ~ ~-0.5 ~ rza:turret_base run event entity @s rza:deactivate
execute as @e[type=rza:arrow_turret, tag=active] at @s unless block ~ ~-0.5 ~ rza:turret_base run tag @s remove active

##Pyro Charger
execute as @e[type=rza:pyro_charger, tag=!active] at @s if block ~ ~-0.5 ~ rza:turret_base run event entity @s rza:activate
execute as @e[type=rza:pyro_charger, tag=!active] at @s if block ~ ~-0.5 ~ rza:turret_base run tag @s add active
execute as @e[type=rza:pyro_charger, tag=active] at @s unless block ~ ~-0.5 ~ rza:turret_base run event entity @s rza:deactivate
execute as @e[type=rza:pyro_charger, tag=active] at @s unless block ~ ~-0.5 ~ rza:turret_base run tag @s remove active

##Sonic Cannon
execute as @e[type=rza:sonic_cannon, tag=!active] at @s if block ~ ~-0.5 ~ rza:turret_base run event entity @s rza:activate
execute as @e[type=rza:sonic_cannon, tag=!active] at @s if block ~ ~-0.5 ~ rza:turret_base run tag @s add active
execute as @e[type=rza:sonic_cannon, tag=active] at @s unless block ~ ~-0.5 ~ rza:turret_base run event entity @s rza:deactivate
execute as @e[type=rza:sonic_cannon, tag=active] at @s unless block ~ ~-0.5 ~ rza:turret_base run tag @s remove active