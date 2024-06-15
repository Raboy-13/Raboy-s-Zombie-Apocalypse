execute if score main start matches 0 run gamerule commandblocksenabled true
execute if score main start matches 0 run gamerule commandblocksenabled true
execute if score main start matches 0 run gamerule commandblockoutput false

#World
#Countdown until zombies can build/miner zombie can break blocks
execute if score main start matches 0 run scoreboard objectives add mutated_zombies dummy
scoreboard players set main mutated_zombies 0

#Turrets
execute if score main start matches 0 run scoreboard objectives add sonic_range dummy
execute if score main start matches 0 run scoreboard objectives add lightning_chain dummy
execute if score main start matches 0 run scoreboard objectives add lightning_branch dummy
execute if score main start matches 0 run scoreboard objectives add lightning_chain_length dummy
execute if score main start matches 0 run scoreboard objectives add lightning_branch_length dummy
execute if score main start matches 0 run scoreboard objectives add remove_chainer_tag_delay dummy