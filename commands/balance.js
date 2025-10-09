const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('💰 Check your credit balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check balance for (defaults to yourself)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        try {
            const db = new Database();
            const guildId = interaction.guild.id;
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const userId = targetUser.id;

            // Get user data
            let user = await db.getRacingUser(userId, guildId);
            if (!user) {
                await db.createRacingUser(userId, guildId);
                user = await db.getRacingUser(userId, guildId);
            }

            // Create balance embed
            const embed = new EmbedBuilder()
                .setTitle(`💰 Credit Balance`)
                .setColor('#51cf66')
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            // Add balance info
            embed.addFields(
                { name: '👤 User', value: targetUser.toString(), inline: true },
                { name: '💰 Credits', value: `${user.credits.toLocaleString()}`, inline: true },
                { name: '🏎️ Total Races', value: `${user.total_races}`, inline: true }
            );

            // Add quick stats
            const winRate = user.total_races > 0 ? ((user.wins / user.total_races) * 100).toFixed(1) : 0;
            embed.addFields(
                { name: '🏆 Wins', value: `${user.wins}`, inline: true },
                { name: '❌ Losses', value: `${user.losses}`, inline: true },
                { name: '📈 Win Rate', value: `${winRate}%`, inline: true }
            );

            // Add earning suggestions
            const suggestions = [];
            if (user.credits < 1000) {
                suggestions.push('💡 **Tip:** Use `/daily` to claim free credits!');
            }
            if (user.total_races < 5) {
                suggestions.push('🏎️ **Tip:** Try `/race ai` to earn credits safely!');
            }
            if (user.credits >= 1000) {
                suggestions.push('🎯 **Tip:** Try `/race player` with wagers for bigger rewards!');
            }

            if (suggestions.length > 0) {
                embed.addFields({ 
                    name: '💡 Earning Tips', 
                    value: suggestions.join('\n'), 
                    inline: false 
                });
            }

            // Add footer
            embed.setFooter({ 
                text: `Use /transfer to send credits to other users` 
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Balance command error:', error);
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while checking balance. Please try again.')], 
                ephemeral: true 
            });
        }
    }
};
