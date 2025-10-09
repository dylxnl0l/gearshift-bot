const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed } = require('../utils/embeds');

const db = new Database();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 View the racing leaderboard')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of leaderboard to display')
                .setRequired(false)
                .addChoices(
                    { name: '💰 Credits', value: 'credits' },
                    { name: '🏆 Wins', value: 'wins' },
                    { name: '🏎️ Total Races', value: 'total_races' }
                )
        )
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of players to show (1-20)')
                .setMinValue(1)
                .setMaxValue(20)
                .setRequired(false)
        ),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const sortBy = interaction.options.getString('type') || 'credits';
            const limit = interaction.options.getInteger('limit') || 10;

            // Get leaderboard data
            const leaderboard = await db.getRacingLeaderboard(guildId, limit, sortBy);

            if (leaderboard.length === 0) {
                await interaction.reply({ 
                    embeds: [createErrorEmbed('No racing data found! Start racing to appear on the leaderboard.')], 
                    ephemeral: true 
                });
                return;
            }

            // Create leaderboard embed
            const embed = new EmbedBuilder()
                .setTitle('🏆 Racing Leaderboard')
                .setColor('#ffd700')
                .setTimestamp();

            // Set description based on sort type
            const sortNames = {
                'credits': '💰 Credits',
                'wins': '🏆 Wins',
                'total_races': '🏎️ Total Races'
            };

            embed.setDescription(`**${sortNames[sortBy]}** • Top ${limit} racers`);

            // Add leaderboard entries
            const leaderboardText = leaderboard.map((user, index) => {
                const position = index + 1;
                const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
                
                let value;
                switch (sortBy) {
                    case 'credits':
                        value = `${user.credits} credits`;
                        break;
                    case 'wins':
                        value = `${user.wins} wins`;
                        break;
                    case 'total_races':
                        value = `${user.total_races} races`;
                        break;
                }

                // Get user mention
                const userMention = `<@${user.user_id}>`;
                
                return `${medal} ${userMention} • **${value}**`;
            }).join('\n');

            embed.addFields({ name: 'Rankings', value: leaderboardText, inline: false });

            // Add stats summary
            const totalPlayers = leaderboard.length;
            const totalCredits = leaderboard.reduce((sum, user) => sum + user.credits, 0);
            const totalRaces = leaderboard.reduce((sum, user) => sum + user.total_races, 0);

            embed.addFields(
                { name: '📊 Server Stats', value: `**${totalPlayers}** active racers\n**${totalCredits.toLocaleString()}** total credits\n**${totalRaces}** total races`, inline: true }
            );

            // Add footer with instructions
            embed.setFooter({ 
                text: `Use /leaderboard type:${sortBy} limit:${limit} to customize this view` 
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Leaderboard command error:', error);
            await interaction.reply({ 
                embeds: [createErrorEmbed('An error occurred while fetching the leaderboard. Please try again.')], 
                ephemeral: true 
            });
        }
    }
};
