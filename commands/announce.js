const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');
const PermissionUtils = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement to the server')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Title of the announcement')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Content of the announcement')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Color of the announcement (red, green, blue, yellow, purple)')
                .setRequired(false)
                .addChoices(
                    { name: 'Red', value: 'red' },
                    { name: 'Green', value: 'green' },
                    { name: 'Blue', value: 'blue' },
                    { name: 'Yellow', value: 'yellow' },
                    { name: 'Purple', value: 'purple' }
                ))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the announcement to (default: current channel)')
                .setRequired(false)),
    
    permissions: [PermissionFlagsBits.ManageMessages],
    cooldown: 10,

    async execute(interaction) {
        const title = interaction.options.getString('title');
        const message = interaction.options.getString('message');
        const color = interaction.options.getString('color') || 'blue';
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        // Check if user has permission to send announcements
        if (!PermissionUtils.isAdmin(interaction.member)) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Insufficient Permissions',
                'Only administrators can use this command.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            // Color mapping
            const colors = {
                red: 0xff0000,
                green: 0x00ff00,
                blue: 0x0099ff,
                yellow: 0xffaa00,
                purple: 0x9932cc
            };

            // Create announcement embed
            const announcementEmbed = new EmbedBuilder()
                .setColor(colors[color] || colors.blue)
                .setTitle(`📢 ${title}`)
                .setDescription(message)
                .addFields(
                    { name: '👤 Announced By', value: interaction.user.tag, inline: true },
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setTimestamp();

            // Send announcement
            await channel.send({ embeds: [announcementEmbed] });

            // Create success embed
            const successEmbed = EmbedUtils.createSuccessEmbed(
                'Announcement Sent',
                `Your announcement has been sent to ${channel}.`
            ).addFields(
                { name: '📢 Title', value: title, inline: true },
                { name: '📍 Channel', value: channel.toString(), inline: true }
            );

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error sending announcement:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },
};
