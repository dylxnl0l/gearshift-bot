const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed } = require('../utils/embeds');

const db = new Database();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('📊 View your racing statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to view stats for (defaults to yourself)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const userId = targetUser.id;

            // Get user stats
            let user = await db.getRacingUser(userId, guildId);
            if (!user) {
                await db.createRacingUser(userId, guildId);
                user = await db.getRacingUser(userId, guildId);
            }

            // Calculate win rate
            const winRate = user.total_races > 0 ? ((user.wins / user.total_races) * 100).toFixed(1) : 0;

            // Create stats embed
            const embed = new EmbedBuilder()
                .setTitle(`📊 Racing Stats - ${targetUser.tag}`)
                .setColor('#5865f2')
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            // Add main stats
            embed.addFields(
                { name: '💰 Credits', value: `${user.credits.toLocaleString()}`, inline: true },
                { name: '🏆 Wins', value: `${user.wins}`, inline: true },
                { name: '❌ Losses', value: `${user.losses}`, inline: true },
                { name: '🏎️ Total Races', value: `${user.total_races}`, inline: true },
                { name: '📈 Win Rate', value: `${winRate}%`, inline: true },
                { name: '🔥 Daily Streak', value: `${user.daily_claimed} days`, inline: true }
            );

            // Add achievements
            const achievements = [];
            if (user.wins >= 10) achievements.push('🏆 **Racing Veteran** - 10+ wins');
            if (user.wins >= 50) achievements.push('👑 **Racing Champion** - 50+ wins');
            if (user.wins >= 100) achievements.push('💎 **Racing Legend** - 100+ wins');
            if (user.credits >= 10000) achievements.push('💰 **High Roller** - 10,000+ credits');
            if (user.credits >= 50000) achievements.push('💎 **Credit King** - 50,000+ credits');
            if (user.daily_claimed >= 7) achievements.push('🔥 **Streak Master** - 7+ day streak');
            if (user.daily_claimed >= 30) achievements.push('📅 **Daily Devotee** - 30+ day streak');
            if (winRate >= 80 && user.total_races >= 10) achievements.push('🎯 **Precision Driver** - 80%+ win rate');

            if (achievements.length > 0) {
                embed.addFields({ 
                    name: '🏅 Achievements', 
                    value: achievements.slice(0, 5).join('\n'), 
                    inline: false 
                });
            }

            // Add recent activity
            const daysSinceLastDaily = user.last_daily ? 
                Math.floor((Date.now() - user.last_daily) / (24 * 60 * 60 * 1000)) : null;

            if (daysSinceLastDaily !== null) {
                embed.addFields({ 
                    name: '📅 Last Daily', 
                    value: `${daysSinceLastDaily} days ago`, 
                    inline: true 
                });
            }

            // Add rank info (if possible to calculate)
            const leaderboard = await db.getRacingLeaderboard(guildId, 100, 'credits');
            const userRank = leaderboard.findIndex(u => u.user_id === userId) + 1;
            
            if (userRank > 0) {
                embed.addFields({ 
                    name: '🏆 Server Rank', 
                    value: `#${userRank} by credits`, 
                    inline: true 
                });
            }

            // Add footer
            embed.setFooter({ 
                text: `Stats last updated • Use /daily to claim your daily reward!` 
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Stats command error:', error);
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while fetching stats. Please try again.')], 
                ephemeral: true 
            });
        }
    }
};
