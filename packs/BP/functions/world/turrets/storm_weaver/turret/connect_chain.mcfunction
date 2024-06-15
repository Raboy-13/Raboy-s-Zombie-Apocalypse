execute if score @s lightning_chain_length matches 1.. run scoreboard players remove @s lightning_chain_length 1
execute if score @s lightning_chain_length matches 1.. run scoreboard players set @s lightning_chain 64
damage @e[family=zombie, r=6] 7 entity_attack
execute if score @s lightning_chain_length matches 1.. positioned ~~0.5~ facing entity @e[family=zombie, rm=8, r=92, c=1, tag=!chainer] eyes run function world/turrets/storm_weaver/turret/chain