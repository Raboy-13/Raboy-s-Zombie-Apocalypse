##Turret Base Sensor
execute as @s[family=turret, tag=!active] at @s if block ~ ~-0.5 ~ rza:turret_base run event entity @s rza:activate
execute as @s[family=turret, tag=!active] at @s if block ~ ~-0.5 ~ rza:turret_base run tag @s add active
execute as @s[family=turret, tag=active] at @s unless block ~ ~-0.5 ~ rza:turret_base run event entity @s rza:deactivate
execute as @s[family=turret, tag=active] at @s unless block ~ ~-0.5 ~ rza:turret_base run tag @s remove active