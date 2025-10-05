const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');
const PermissionUtils = require('../utils/permissions');
const Database = require('../utils/database');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true)),
    
    permissions: [PermissionFlagsBits.ModerateMembers],
    cooldown: 3,

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        // Check if user is trying to warn themselves
        if (user.id === interaction.user.id) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Invalid Target',
                'You cannot warn yourself!'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if user is trying to warn the bot
        if (user.id === interaction.client.user.id) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Invalid Target',
                'I cannot warn myself!'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Get target member
        const targetMember = interaction.guild.members.cache.get(user.id);
        if (!targetMember) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'User Not Found',
                'This user is not in the server.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if moderator can warn the target
        if (!PermissionUtils.canModerate(interaction.member, targetMember)) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Insufficient Permissions',
                'You cannot warn this user due to role hierarchy.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            // Send DM to user
            const dmSent = await ErrorHandler.handleDMError(
                null, user, 'Warned', reason, interaction.user
            );

            // Create success embed
            const successEmbed = EmbedUtils.createSuccessEmbed(
                'User Warned',
                `Successfully warned ${user.tag}.`
            ).addFields(
                { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
                { name: '👮 Moderator', value: interaction.user.tag, inline: true },
                { name: '📝 Reason', value: reason, inline: false },
                { name: '📨 DM Sent', value: dmSent ? '✅ Yes' : '❌ No', inline: true }
            );

            await interaction.reply({ embeds: [successEmbed] });

            // Log to logs channel
            const logsChannel = interaction.guild.channels.cache.get(config.channels.logs);
            if (logsChannel) {
                const logEmbed = EmbedUtils.createModerationEmbed(
                    'User Warned',
                    user,
                    interaction.user,
                    reason
                ).addFields(
                    { name: '📨 DM Sent', value: dmSent ? '✅ Yes' : '❌ No', inline: true }
                );

                await logsChannel.send({ embeds: [logEmbed] });
            }

            // Log DM failure if it occurred
            if (!dmSent) {
                await ErrorHandler.logDMFailure(interaction.guild, user, 'Warned', reason, interaction.user);
            }

            // Log to database
            const db = new Database();
            await db.addModlog(user.id, interaction.user.id, 'warned', reason, null, interaction.guild.id);
            db.close();

        } catch (error) {
            console.error('Error warning user:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },
};
