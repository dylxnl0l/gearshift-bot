const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup ticket system in current channel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new support ticket'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket')),
    
    permissions: [PermissionFlagsBits.SendMessages],
    cooldown: 5,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            await this.handleSetup(interaction);
        } else if (subcommand === 'create') {
            await this.handleCreate(interaction);
        } else if (subcommand === 'close') {
            await this.handleClose(interaction);
        }
    },

    async handleSetup(interaction) {
        try {
            // Check if user has permission to setup tickets
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Insufficient Permissions',
                    'You need the "Manage Channels" permission to setup the ticket system.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Create setup embed
            const setupEmbed = EmbedUtils.createInfoEmbed(
                '🎫 Support Tickets',
                'Need help? Create a support ticket and our staff will assist you!'
            ).addFields(
                { name: '📋 How to create a ticket', value: 'Click the button below to create a private support channel', inline: false },
                { name: '⏱️ Response time', value: 'Our staff typically respond within 24 hours', inline: true },
                { name: '🔒 Privacy', value: 'Only you and staff can see your ticket', inline: true }
            );

            // Create ticket button
            const ticketButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket')
                        .setLabel('🎫 Create Ticket')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.reply({ 
                embeds: [setupEmbed], 
                components: [ticketButton] 
            });

        } catch (error) {
            console.error('Error setting up ticket system:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },

    async handleCreate(interaction) {
        try {
            // Check if user already has an open ticket
            const existingTicket = interaction.guild.channels.cache.find(
                channel => channel.name === `ticket-${interaction.user.username.toLowerCase()}` &&
                          channel.type === ChannelType.GuildText
            );

            if (existingTicket) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Ticket Already Exists',
                    `You already have an open ticket: ${existingTicket}`
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Create ticket channel
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username.toLowerCase()}`,
                type: ChannelType.GuildText,
                parent: config.channels.tickets,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: config.roles.moderator,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    }
                ]
            });

            // Create ticket embed
            const ticketEmbed = EmbedUtils.createTicketEmbed(
                'Support Ticket Created',
                `Thanks for contacting support! A staff member will be with you soon.`
            ).addFields(
                { name: '📋 Ticket ID', value: `#${ticketChannel.id.slice(-6)}`, inline: true },
                { name: '👤 Created By', value: interaction.user.tag, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '👮 Status', value: '🟡 Unclaimed', inline: true }
            );

            // Create ticket management buttons
            const ticketButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('claim_ticket')
                        .setLabel('Claim Ticket')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🧍‍♂️'),
                    new ButtonBuilder()
                        .setCustomId('add_user_ticket')
                        .setLabel('Add User')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('➕'),
                    new ButtonBuilder()
                        .setCustomId('remove_user_ticket')
                        .setLabel('Remove User')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('➖'),
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

            await ticketChannel.send({ 
                content: `${interaction.user} | <@&${config.roles.moderator}>`,
                embeds: [ticketEmbed],
                components: [ticketButtons]
            });

            // Create success embed
            const successEmbed = EmbedUtils.createSuccessEmbed(
                'Ticket Created',
                `Your support ticket has been created: ${ticketChannel}`
            ).addFields(
                { name: '📋 Ticket ID', value: `#${ticketChannel.id.slice(-6)}`, inline: true },
                { name: '📍 Channel', value: ticketChannel.toString(), inline: true }
            );

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error creating ticket:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },

    async handleClose(interaction) {
        try {
            // Check if this is a ticket channel
            if (!interaction.channel.name.startsWith('ticket-')) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Not a Ticket Channel',
                    'This command can only be used in ticket channels.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Check permissions
            const isTicketOwner = interaction.channel.name === `ticket-${interaction.user.username.toLowerCase()}`;
            const isStaff = interaction.member.roles.cache.has(config.roles.moderator) || 
                           interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

            if (!isTicketOwner && !isStaff) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Insufficient Permissions',
                    'Only the ticket owner or staff can close this ticket.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Create confirmation embed
            const confirmEmbed = EmbedUtils.createWarningEmbed(
                'Close Ticket',
                'Are you sure you want to close this ticket? This action cannot be undone.'
            ).addFields(
                { name: '📋 Ticket ID', value: `#${interaction.channel.id.slice(-6)}`, inline: true },
                { name: '👤 Closed By', value: interaction.user.tag, inline: true }
            );

            // Create confirmation buttons
            const confirmButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_close')
                        .setLabel('Yes, Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒'),
                    new ButtonBuilder()
                        .setCustomId('cancel_close')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❌')
                );

            await interaction.reply({ 
                embeds: [confirmEmbed], 
                components: [confirmButtons],
                ephemeral: true 
            });

        } catch (error) {
            console.error('Error closing ticket:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    }
};
