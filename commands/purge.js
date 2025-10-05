const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Bulk delete messages')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Only delete messages from this user')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for purging messages')
                .setRequired(false)),
    
    permissions: [PermissionFlagsBits.ManageMessages],
    cooldown: 10,

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            // Fetch messages
            const messages = await interaction.channel.messages.fetch({ limit: amount });
            let messagesToDelete = messages.filter(msg => !msg.pinned);

            // Filter by user if specified
            if (user) {
                messagesToDelete = messagesToDelete.filter(msg => msg.author.id === user.id);
            }

            // Check if there are messages to delete
            if (messagesToDelete.size === 0) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'No Messages Found',
                    user ? `No messages found from ${user.tag} in the last ${amount} messages.` : 'No messages found to delete.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Delete messages
            const deletedMessages = await interaction.channel.bulkDelete(messagesToDelete, true);

            // Create success embed
            const successEmbed = EmbedUtils.createSuccessEmbed(
                'Messages Purged',
                `Successfully deleted ${deletedMessages.size} message(s).`
            ).addFields(
                { name: '📊 Messages Deleted', value: `${deletedMessages.size}`, inline: true },
                { name: '👮 Moderator', value: interaction.user.tag, inline: true },
                { name: '📝 Reason', value: reason, inline: false }
            );

            if (user) {
                successEmbed.addFields({ name: '👤 Filtered By', value: user.tag, inline: true });
            }

            // Send response (ephemeral to avoid deletion)
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log to logs channel if available
            const config = require('../config.json');
            const logsChannel = interaction.guild.channels.cache.get(config.channels.logs);
            if (logsChannel) {
                const logEmbed = EmbedUtils.createInfoEmbed(
                    'Messages Purged',
                    `Messages were purged in ${interaction.channel}`
                ).addFields(
                    { name: '📊 Messages Deleted', value: `${deletedMessages.size}`, inline: true },
                    { name: '👮 Moderator', value: interaction.user.tag, inline: true },
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '📍 Channel', value: `${interaction.channel}`, inline: true }
                );

                if (user) {
                    logEmbed.addFields({ name: '👤 Filtered By', value: user.tag, inline: true });
                }

                await logsChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Error purging messages:', error);
            
            // Handle specific Discord API errors
            if (error.code === 50034) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Cannot Delete Messages',
                    'Some messages are older than 14 days and cannot be deleted.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },
};
