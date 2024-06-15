scoreboard players set @s lightning_chain_length 10
scoreboard players set @s lightning_branch_length 1
scoreboard players set @s lightning_chain 64
damage @e[family=zombie, r=3] 40 lightning entity @p
execute rotated as @s positioned ~~0.6~ positioned ^^^2 run function world/turrets/storm_weaver/turret/chain

event entity @s rza:start_recoil_recovery