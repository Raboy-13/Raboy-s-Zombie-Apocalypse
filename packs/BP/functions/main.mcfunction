#World start
scoreboard objectives add start dummy
scoreboard players add main start 0
execute if score main start matches 0 run function world/start
execute if score main start matches 0 run scoreboard players set main start 1

#Turrets
execute as @e[family=turret] as @s run function world/turrets/turrets_main