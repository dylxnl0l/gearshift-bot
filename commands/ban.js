const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');
const PermissionUtils = require('../utils/permissions');
const Database = require('../utils/database');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('delete_messages')
                .setDescription('Number of days of messages to delete (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)),
    
    permissions: [PermissionFlagsBits.BanMembers],
    cooldown: 5,

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteDays = interaction.options.getInteger('delete_messages') || 0;

        // Check if user is trying to ban themselves
        if (user.id === interaction.user.id) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Invalid Target',
                'You cannot ban yourself!'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if user is trying to ban the bot
        if (user.id === interaction.client.user.id) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Invalid Target',
                'I cannot ban myself!'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if user is trying to ban the server owner
        if (user.id === interaction.guild.ownerId) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Invalid Target',
                'You cannot ban the server owner!'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if target is already banned
        try {
            const banList = await interaction.guild.bans.fetch();
            if (banList.has(user.id)) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'User Already Banned',
                    'This user is already banned from the server.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (error) {
            console.error('Error checking ban list:', error);
        }

        // Check if moderator can ban the target
        const targetMember = interaction.guild.members.cache.get(user.id);
        if (targetMember && !PermissionUtils.canModerate(interaction.member, targetMember)) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Insufficient Permissions',
                'You cannot ban this user due to role hierarchy.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            // Send DM to user before banning
            const dmSent = await ErrorHandler.handleDMError(
                null, user, 'Banned', reason, interaction.user
            );

            // Ban the user
            await interaction.guild.members.ban(user, {
                reason: `${reason} | Moderator: ${interaction.user.tag}`,
                deleteMessageDays: deleteDays
            });

            // Create success embed
            const successEmbed = EmbedUtils.createSuccessEmbed(
                'User Banned',
                `Successfully banned ${user.tag} from the server.`
            ).addFields(
                { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
                { name: '👮 Moderator', value: interaction.user.tag, inline: true },
                { name: '📝 Reason', value: reason, inline: false },
                { name: '🗑️ Messages Deleted', value: `${deleteDays} days`, inline: true },
                { name: '📨 DM Sent', value: dmSent ? '✅ Yes' : '❌ No', inline: true }
            );

            await interaction.reply({ embeds: [successEmbed] });

            // Log to logs channel
            const logsChannel = interaction.guild.channels.cache.get(config.channels.logs);
            if (logsChannel) {
                const logEmbed = EmbedUtils.createModerationEmbed(
                    'User Banned',
                    user,
                    interaction.user,
                    reason
                ).addFields(
                    { name: '🗑️ Messages Deleted', value: `${deleteDays} days`, inline: true },
                    { name: '📨 DM Sent', value: dmSent ? '✅ Yes' : '❌ No', inline: true }
                );

                await logsChannel.send({ embeds: [logEmbed] });
            }

            // Log DM failure if it occurred
            if (!dmSent) {
                await ErrorHandler.logDMFailure(interaction.guild, user, 'Banned', reason, interaction.user);
            }

            // Log to database
            const db = new Database();
            await db.addModlog(user.id, interaction.user.id, 'banned', reason, null, interaction.guild.id);
            db.close();

        } catch (error) {
            console.error('Error banning user:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },
};
