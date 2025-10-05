const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');
const Database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modlogs')
        .setDescription('View moderation logs for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to view modlogs for')
                .setRequired(true)),
    
    permissions: [PermissionFlagsBits.ModerateMembers],
    cooldown: 5,

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const db = new Database();

        try {
            // Get modlogs from database
            const modlogs = await db.getModlogs(user.id, interaction.guild.id);

            if (modlogs.length === 0) {
                const noLogsEmbed = EmbedUtils.createInfoEmbed(
                    'No Moderation Logs',
                    `No moderation actions found for ${user.tag}.`
                ).addFields(
                    { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: '📊 Total Actions', value: '0', inline: true }
                );

                return await interaction.reply({ embeds: [noLogsEmbed] });
            }

            // Count actions by type
            const actionCounts = modlogs.reduce((acc, log) => {
                acc[log.action] = (acc[log.action] || 0) + 1;
                return acc;
            }, {});

            // Create main embed
            const modlogsEmbed = EmbedUtils.createInfoEmbed(
                'Moderation Logs',
                `Moderation history for ${user.tag}`
            ).addFields(
                { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
                { name: '📊 Total Actions', value: `${modlogs.length}`, inline: true },
                { name: '📅 First Action', value: `<t:${Math.floor(modlogs[modlogs.length - 1].timestamp / 1000)}:F>`, inline: true },
                { name: '📅 Latest Action', value: `<t:${Math.floor(modlogs[0].timestamp / 1000)}:F>`, inline: true }
            );

            // Add action counts
            const actionCountFields = Object.entries(actionCounts).map(([action, count]) => ({
                name: `🔨 ${action.charAt(0).toUpperCase() + action.slice(1)}s`,
                value: `${count}`,
                inline: true
            }));

            modlogsEmbed.addFields(actionCountFields);

            // Add recent actions (last 5)
            const recentActions = modlogs.slice(0, 5).map(log => {
                const moderator = interaction.guild.members.cache.get(log.moderator_id);
                const moderatorTag = moderator ? moderator.user.tag : 'Unknown';
                const duration = log.duration ? ` (${log.duration})` : '';
                return `**${log.action.charAt(0).toUpperCase() + log.action.slice(1)}**${duration} - ${moderatorTag}\n*${log.reason || 'No reason provided'}*`;
            }).join('\n\n');

            modlogsEmbed.addFields({
                name: '📋 Recent Actions',
                value: recentActions || 'No recent actions',
                inline: false
            });

            await interaction.reply({ embeds: [modlogsEmbed] });

            db.close();

        } catch (error) {
            console.error('Error fetching modlogs:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
            db.close();
        }
    },
};
