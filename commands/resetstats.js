const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

const db = new Database();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetstats')
        .setDescription('🔄 Reset a user\'s racing statistics (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to reset stats for')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of reset to perform')
                .setRequired(true)
                .addChoices(
                    { name: '🔄 All Stats', value: 'all' },
                    { name: '💰 Credits Only', value: 'credits' },
                    { name: '🏆 Wins/Losses Only', value: 'wins' },
                    { name: '📅 Daily Streak Only', value: 'daily' }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const targetUser = interaction.options.getUser('user');
            const resetType = interaction.options.getString('type');

            // Get user data
            let user = await db.getRacingUser(targetUser.id, guildId);
            if (!user) {
                await interaction.reply({ 
                    embeds: [createErrorEmbed('User has no racing data to reset!')], 
                    ephemeral: true 
                });
                return;
            }

            // Prepare reset data based on type
            let resetData = {};
            let resetDescription = '';

            switch (resetType) {
                case 'all':
                    resetData = {
                        credits: 1000,
                        total_races: 0,
                        wins: 0,
                        losses: 0,
                        daily_claimed: 0,
                        last_daily: 0
                    };
                    resetDescription = 'All racing statistics have been reset to default values.';
                    break;
                case 'credits':
                    resetData = { credits: 1000 };
                    resetDescription = 'Credits have been reset to 1,000.';
                    break;
                case 'wins':
                    resetData = {
                        total_races: 0,
                        wins: 0,
                        losses: 0
                    };
                    resetDescription = 'Win/loss statistics have been reset.';
                    break;
                case 'daily':
                    resetData = {
                        daily_claimed: 0,
                        last_daily: 0
                    };
                    resetDescription = 'Daily streak has been reset.';
                    break;
            }

            // Perform reset
            await db.updateRacingUser(targetUser.id, guildId, resetData);

            // Create success embed
            const successEmbed = createSuccessEmbed('Stats Reset Successful!')
                .setDescription(resetDescription)
                .addFields(
                    { name: '👤 User', value: targetUser.toString(), inline: true },
                    { name: '🔄 Reset Type', value: resetType.charAt(0).toUpperCase() + resetType.slice(1), inline: true },
                    { name: '👮 Reset By', value: interaction.user.toString(), inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Reset stats command error:', error);
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while resetting stats. Please try again.')], 
                ephemeral: true 
            });
        }
    }
};
