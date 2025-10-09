const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('💰 Claim your daily credit reward!'),
    
    async execute(interaction) {
        try {
            const db = new Database();
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;

            // Get or create user
            let user = await db.getRacingUser(userId, guildId);
            if (!user) {
                await db.createRacingUser(userId, guildId);
                user = await db.getRacingUser(userId, guildId);
            }

            // Check if daily was already claimed today
            const now = Date.now();
            const lastDaily = user.last_daily || 0;
            const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

            if (now - lastDaily < oneDay) {
                const nextDaily = new Date(lastDaily + oneDay);
                const timeLeft = Math.ceil((nextDaily - now) / 1000 / 60 / 60); // hours left

                const errorEmbed = createErrorEmbed('Daily Already Claimed!')
                    .setDescription(`You've already claimed your daily reward today!\n\nNext daily available in **${timeLeft} hours**.`);

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            // Calculate daily reward (base + streak bonus)
            const baseReward = 200;
            const streakBonus = Math.min(user.daily_claimed * 10, 200); // Max 200 bonus
            const totalReward = baseReward + streakBonus;

            // Update user
            await db.updateRacingUser(userId, guildId, {
                credits: user.credits + totalReward,
                daily_claimed: user.daily_claimed + 1,
                last_daily: now
            });

            // Create success embed
            const successEmbed = createSuccessEmbed('Daily Reward Claimed!')
                .setDescription(`You've claimed your daily reward!`)
                .addFields(
                    { name: '💰 Credits Earned', value: `${totalReward} credits`, inline: true },
                    { name: '🔥 Streak', value: `${user.daily_claimed + 1} days`, inline: true },
                    { name: '💎 New Balance', value: `${user.credits + totalReward} credits`, inline: true }
                )
                .setFooter({ text: 'Come back tomorrow for your next daily reward!' });

            if (streakBonus > 0) {
                successEmbed.addFields({ 
                    name: '🎉 Streak Bonus', 
                    value: `+${streakBonus} credits (${user.daily_claimed + 1} day streak!)`, 
                    inline: false 
                });
            }

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Daily command error:', error);
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while claiming your daily reward. Please try again.')], 
                ephemeral: true 
            });
        }
    }
};
