const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('race')
        .setDescription('🏎️ Race against another player or AI to earn credits!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('player')
                .setDescription('Race against another player')
                .addUserOption(option =>
                    option.setName('opponent')
                        .setDescription('The player you want to race against')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('wager')
                        .setDescription('Credits to wager (optional)')
                        .setMinValue(10)
                        .setMaxValue(1000)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ai')
                .setDescription('Race against the AI')
                .addIntegerOption(option =>
                    option.setName('wager')
                        .setDescription('Credits to wager (optional)')
                        .setMinValue(10)
                        .setMaxValue(500)
                        .setRequired(false)
                )
        ),
    
    async execute(interaction) {
        try {
            const db = new Database();
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;
            const subcommand = interaction.options.getSubcommand();

            // Get or create user
            let user = await db.getRacingUser(userId, guildId);
            if (!user) {
                await db.createRacingUser(userId, guildId);
                user = await db.getRacingUser(userId, guildId);
            }

            if (subcommand === 'player') {
                const opponent = interaction.options.getUser('opponent');
                const wager = interaction.options.getInteger('wager') || 0;

                if (opponent.id === userId) {
                    await interaction.reply({ 
                        embeds: [createErrorEmbed('You cannot race yourself!')], 
                        ephemeral: true 
                    });
                    return;
                }

                if (opponent.bot) {
                    await interaction.reply({ 
                        embeds: [createErrorEmbed('You cannot race bots! Use `/race ai` instead.')], 
                        ephemeral: true 
                    });
                    return;
                }

                // Check if user has enough credits
                if (wager > user.credits) {
                    await interaction.reply({ 
                        embeds: [createErrorEmbed(`You don't have enough credits! You have ${user.credits} credits.`)], 
                        ephemeral: true 
                    });
                    return;
                }

                // Get or create opponent
                let opponentData = await db.getRacingUser(opponent.id, guildId);
                if (!opponentData) {
                    await db.createRacingUser(opponent.id, guildId);
                    opponentData = await db.getRacingUser(opponent.id, guildId);
                }

                if (wager > opponentData.credits) {
                    await interaction.reply({ 
                        embeds: [createErrorEmbed(`${opponent.tag} doesn't have enough credits! They have ${opponentData.credits} credits.`)], 
                        ephemeral: true 
                    });
                    return;
                }

                // Create race
                const raceId = await db.createRace(guildId, userId, opponent.id, 'player', wager);

                // Simulate race
                const raceEmbed = new EmbedBuilder()
                    .setTitle('🏎️ Race Starting!')
                    .setDescription('Get ready to race! The race is starting in 3 seconds...')
                    .setColor('#ff6b6b')
                    .addFields(
                        { name: '🏁 Racer 1', value: interaction.user.toString(), inline: true },
                        { name: '🏁 Racer 2', value: opponent.toString(), inline: true },
                        { name: '💰 Wager', value: `${wager} credits`, inline: true }
                    );

                await interaction.reply({ embeds: [raceEmbed] });

                // Wait 3 seconds
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Determine winner (random for now)
                const winner = Math.random() < 0.5 ? userId : opponent.id;
                const winnerUser = winner === userId ? interaction.user : opponent;
                const loserUser = winner === userId ? opponent : interaction.user;

                // Calculate rewards
                const baseReward = 100 + Math.floor(Math.random() * 400); // 100-500 credits
                const totalReward = baseReward + wager;

                // Update stats
                if (winner === userId) {
                    await db.updateRacingUser(userId, guildId, {
                        credits: user.credits + totalReward,
                        total_races: user.total_races + 1,
                        wins: user.wins + 1
                    });
                    await db.updateRacingUser(opponent.id, guildId, {
                        credits: opponentData.credits - wager,
                        total_races: opponentData.total_races + 1,
                        losses: opponentData.losses + 1
                    });
                } else {
                    await db.updateRacingUser(opponent.id, guildId, {
                        credits: opponentData.credits + totalReward,
                        total_races: opponentData.total_races + 1,
                        wins: opponentData.wins + 1
                    });
                    await db.updateRacingUser(userId, guildId, {
                        credits: user.credits - wager,
                        total_races: user.total_races + 1,
                        losses: user.losses + 1
                    });
                }

                // Update race with winner
                await db.updateRace(raceId, winner, Math.random() * 10 + 5); // 5-15 seconds

                // Send results
                const resultEmbed = new EmbedBuilder()
                    .setTitle('🏁 Race Finished!')
                    .setDescription(`**${winnerUser.tag}** wins the race!`)
                    .setColor('#51cf66')
                    .addFields(
                        { name: '🏆 Winner', value: winnerUser.toString(), inline: true },
                        { name: '💰 Credits Won', value: `${totalReward} credits`, inline: true },
                        { name: '⏱️ Race Time', value: `${(Math.random() * 10 + 5).toFixed(2)}s`, inline: true }
                    );

                await interaction.followUp({ embeds: [resultEmbed] });

            } else if (subcommand === 'ai') {
                const wager = interaction.options.getInteger('wager') || 0;

                // Check if user has enough credits
                if (wager > user.credits) {
                    await interaction.reply({ 
                        embeds: [createErrorEmbed(`You don't have enough credits! You have ${user.credits} credits.`)], 
                        ephemeral: true 
                    });
                    return;
                }

                // Create race
                const raceId = await db.createRace(guildId, userId, null, 'ai', wager);

                // Simulate race
                const raceEmbed = new EmbedBuilder()
                    .setTitle('🏎️ AI Race Starting!')
                    .setDescription('Get ready to race against the AI! The race is starting in 3 seconds...')
                    .setColor('#ff6b6b')
                    .addFields(
                        { name: '🏁 Racer', value: interaction.user.toString(), inline: true },
                        { name: '🤖 AI Opponent', value: 'Racing Bot', inline: true },
                        { name: '💰 Wager', value: `${wager} credits`, inline: true }
                    );

                await interaction.reply({ embeds: [raceEmbed] });

                // Wait 3 seconds
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Determine winner (player has 60% chance to win)
                const playerWins = Math.random() < 0.6;
                const winner = playerWins ? userId : 'ai';

                // Calculate rewards
                const baseReward = 50 + Math.floor(Math.random() * 200); // 50-250 credits
                const totalReward = playerWins ? baseReward + wager : 0;

                // Update stats
                if (playerWins) {
                    await db.updateRacingUser(userId, guildId, {
                        credits: user.credits + totalReward,
                        total_races: user.total_races + 1,
                        wins: user.wins + 1
                    });
                } else {
                    await db.updateRacingUser(userId, guildId, {
                        credits: user.credits - wager,
                        total_races: user.total_races + 1,
                        losses: user.losses + 1
                    });
                }

                // Update race with winner
                await db.updateRace(raceId, winner, Math.random() * 10 + 5);

                // Send results
                const resultEmbed = new EmbedBuilder()
                    .setTitle('🏁 AI Race Finished!')
                    .setDescription(playerWins ? 
                        `**${interaction.user.tag}** wins against the AI!` : 
                        `**Racing Bot** wins! Better luck next time!`
                    )
                    .setColor(playerWins ? '#51cf66' : '#ff6b6b')
                    .addFields(
                        { name: '🏆 Winner', value: playerWins ? interaction.user.toString() : 'Racing Bot', inline: true },
                        { name: '💰 Credits', value: playerWins ? `+${totalReward} credits` : `-${wager} credits`, inline: true },
                        { name: '⏱️ Race Time', value: `${(Math.random() * 10 + 5).toFixed(2)}s`, inline: true }
                    );

                await interaction.followUp({ embeds: [resultEmbed] });
            }

        } catch (error) {
            console.error('Race command error:', error);
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred during the race. Please try again.')], 
                ephemeral: true 
            });
        }
    }
};
