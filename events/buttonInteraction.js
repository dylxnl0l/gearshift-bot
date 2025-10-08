const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');
const config = require('../config.json');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        try {
            if (interaction.customId === 'create_ticket') {
                await this.handleCreateTicket(interaction);
            } else if (interaction.customId === 'close_ticket') {
                await this.handleCloseTicket(interaction);
            } else if (interaction.customId === 'confirm_close') {
                await this.handleConfirmClose(interaction);
            } else if (interaction.customId === 'cancel_close') {
                await this.handleCancelClose(interaction);
            } else if (interaction.customId === 'claim_ticket') {
                await this.handleClaimTicket(interaction);
            } else if (interaction.customId === 'add_user_ticket') {
                await this.handleAddUserTicket(interaction);
            } else if (interaction.customId === 'remove_user_ticket') {
                await this.handleRemoveUserTicket(interaction);
            } else if (interaction.customId === 'join_giveaway') {
                await this.handleJoinGiveaway(interaction);
            } else if (interaction.customId === 'verify_button') {
                await this.handleVerifyButton(interaction);
            }
        } catch (error) {
            console.error('Error handling button interaction:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },

    async handleCloseTicket(interaction) {
        // Check if this is a ticket channel
        if (!interaction.channel.name.startsWith('ticket-')) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Not a Ticket Channel',
                'This button can only be used in ticket channels.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check permissions
        const isTicketOwner = interaction.channel.name === `ticket-${interaction.user.username.toLowerCase()}`;
        const isStaff = interaction.member.roles.cache.has(config.roles.moderator) || 
                       interaction.member.permissions.has('ManageChannels');

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
    },

    async handleConfirmClose(interaction) {
        // Check if this is a ticket channel
        if (!interaction.channel.name.startsWith('ticket-')) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Not a Ticket Channel',
                'This button can only be used in ticket channels.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Create transcript (simplified version)
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = messages
            .reverse()
            .map(msg => `[${msg.createdAt.toISOString()}] ${msg.author.tag}: ${msg.content}`)
            .join('\n');

        // Create close embed
        const closeEmbed = EmbedUtils.createInfoEmbed(
            'Ticket Closed',
            `This ticket has been closed by ${interaction.user.tag}`
        ).addFields(
            { name: '📋 Ticket ID', value: `#${interaction.channel.id.slice(-6)}`, inline: true },
            { name: '👤 Closed By', value: interaction.user.tag, inline: true },
            { name: '📅 Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        );

        await interaction.channel.send({ embeds: [closeEmbed] });

        // Log to logs channel
        const logsChannel = interaction.guild.channels.cache.get(config.channels.logs);
        if (logsChannel) {
            const logEmbed = EmbedUtils.createInfoEmbed(
                'Ticket Closed',
                `Ticket ${interaction.channel} has been closed`
            ).addFields(
                { name: '📋 Ticket ID', value: `#${interaction.channel.id.slice(-6)}`, inline: true },
                { name: '👤 Closed By', value: interaction.user.tag, inline: true },
                { name: '📅 Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            );

            // Send transcript as attachment if it's not too long
            if (transcript.length < 2000) {
                logEmbed.addFields({
                    name: '📄 Transcript',
                    value: `\`\`\`\n${transcript.substring(0, 1000)}...\n\`\`\``,
                    inline: false
                });
            }

            await logsChannel.send({ embeds: [logEmbed] });
        }

        // Delete the channel after a delay
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (error) {
                console.error('Error deleting ticket channel:', error);
            }
        }, 5000);

        await interaction.reply({ 
            content: '✅ Ticket closed successfully! This channel will be deleted in 5 seconds.',
            ephemeral: true 
        });
    },

    async handleCancelClose(interaction) {
        const cancelEmbed = EmbedUtils.createInfoEmbed(
            'Ticket Close Cancelled',
            'The ticket will remain open.'
        );

        await interaction.reply({ 
            embeds: [cancelEmbed], 
            ephemeral: true 
        });
    },

    async handleCreateTicket(interaction) {
        try {
            // Check if user already has an open ticket
            const existingTicket = interaction.guild.channels.cache.find(
                channel => channel.name === `ticket-${interaction.user.username.toLowerCase()}` &&
                          channel.type === 0 // GuildText
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
                type: 0, // GuildText
                parent: config.channels.tickets,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: interaction.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                    },
                    {
                        id: config.roles.moderator,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
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

            const successEmbed = EmbedUtils.createSuccessEmbed(
                'Ticket Created',
                `Your support ticket has been created: ${ticketChannel}`
            );

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error creating ticket:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },

    async handleClaimTicket(interaction) {
        // Check if this is a ticket channel
        if (!interaction.channel.name.startsWith('ticket-')) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Not a Ticket Channel',
                'This button can only be used in ticket channels.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if user is staff
        if (!interaction.member.roles.cache.has(config.roles.moderator) && 
            !interaction.member.permissions.has('ManageChannels')) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Insufficient Permissions',
                'Only staff members can claim tickets.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Update ticket embed to show claimed status
        const claimedEmbed = EmbedUtils.createTicketEmbed(
            'Support Ticket - Claimed',
            `Thanks for contacting support! A staff member will be with you soon.`
        ).addFields(
            { name: '📋 Ticket ID', value: `#${interaction.channel.id.slice(-6)}`, inline: true },
            { name: '👤 Created By', value: interaction.channel.topic || 'Unknown', inline: true },
            { name: '📅 Created', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: '👮 Status', value: '🟢 Claimed', inline: true },
            { name: '👮 Claimed By', value: interaction.user.tag, inline: true }
        );

        await interaction.update({ embeds: [claimedEmbed] });

        const claimEmbed = EmbedUtils.createSuccessEmbed(
            'Ticket Claimed',
            `${interaction.user.tag} has claimed this ticket.`
        );

        await interaction.followUp({ embeds: [claimEmbed] });
    },

    async handleAddUserTicket(interaction) {
        // Check if this is a ticket channel
        if (!interaction.channel.name.startsWith('ticket-')) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Not a Ticket Channel',
                'This button can only be used in ticket channels.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if user is staff
        if (!interaction.member.roles.cache.has(config.roles.moderator) && 
            !interaction.member.permissions.has('ManageChannels')) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Insufficient Permissions',
                'Only staff members can add users to tickets.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const infoEmbed = EmbedUtils.createInfoEmbed(
            'Add User to Ticket',
            'Please mention the user you want to add to this ticket.\nExample: `/ticket add @username`'
        );

        await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
    },

    async handleRemoveUserTicket(interaction) {
        // Check if this is a ticket channel
        if (!interaction.channel.name.startsWith('ticket-')) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Not a Ticket Channel',
                'This button can only be used in ticket channels.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if user is staff
        if (!interaction.member.roles.cache.has(config.roles.moderator) && 
            !interaction.member.permissions.has('ManageChannels')) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Insufficient Permissions',
                'Only staff members can remove users from tickets.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const infoEmbed = EmbedUtils.createInfoEmbed(
            'Remove User from Ticket',
            'Please mention the user you want to remove from this ticket.\nExample: `/ticket remove @username`'
        );

        await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
    },

    async handleJoinGiveaway(interaction) {
        try {
            const db = require('../utils/database');
            const Database = db;
            const database = new Database();
            
            const giveaway = await database.getGiveaway(interaction.message.id);
            
            if (!giveaway || !giveaway.active) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Giveaway Not Found',
                    'This giveaway is not active or has ended.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            if (giveaway.end_time < Date.now()) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Giveaway Ended',
                    'This giveaway has already ended.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Get current participants
            const participants = JSON.parse(giveaway.participants || '[]');
            
            if (participants.includes(interaction.user.id)) {
                const alreadyJoinedEmbed = EmbedUtils.createWarningEmbed(
                    'Already Joined',
                    'You have already joined this giveaway!'
                );
                return await interaction.reply({ embeds: [alreadyJoinedEmbed], ephemeral: true });
            }

            // Add user to participants
            participants.push(interaction.user.id);
            await database.updateGiveawayParticipants(interaction.message.id, participants);

            const joinedEmbed = EmbedUtils.createSuccessEmbed(
                'Joined Giveaway',
                `You have successfully joined the giveaway for **${giveaway.prize}**!`
            ).addFields(
                { name: '🎁 Prize', value: giveaway.prize, inline: true },
                { name: '👥 Participants', value: `${participants.length}`, inline: true },
                { name: '⏱️ Ends', value: `<t:${Math.floor(giveaway.end_time / 1000)}:R>`, inline: true }
            );

            await interaction.reply({ embeds: [joinedEmbed], ephemeral: true });
            database.close();

        } catch (error) {
            console.error('Error joining giveaway:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },

    async handleVerifyButton(interaction) {
        try {
            const Database = require('../utils/database');
            const database = new Database();
            
            const guildId = interaction.guild.id;
            const settings = await database.getGuildSettings(guildId);
            
            if (!settings || !settings.verify_role_id) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Verification Not Set Up',
                    'The verification system is not configured for this server.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Check if user is already verified
            const isVerified = await database.isUserVerified(interaction.user.id, guildId);
            if (isVerified) {
                const alreadyVerifiedEmbed = EmbedUtils.createWarningEmbed(
                    'Already Verified',
                    'You are already verified on this server!'
                );
                return await interaction.reply({ embeds: [alreadyVerifiedEmbed], ephemeral: true });
            }

            // Assign verification role
            const role = interaction.guild.roles.cache.get(settings.verify_role_id);
            if (!role) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Verification Role Not Found',
                    'The verification role could not be found. Please contact an administrator.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            try {
                await interaction.member.roles.add(role, 'User verification');
                await database.verifyUser(interaction.user.id, guildId);
                
                const successEmbed = EmbedUtils.createSuccessEmbed(
                    'Verification Successful',
                    'You have been successfully verified! Welcome to the server!'
                ).addFields(
                    { name: '🎭 Role Assigned', value: role.toString(), inline: true },
                    { name: '✅ Status', value: 'Verified', inline: true }
                );
                
                await interaction.reply({ embeds: [successEmbed], ephemeral: true });
            } catch (error) {
                console.error('Failed to assign verification role:', error);
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Verification Failed',
                    'Failed to assign the verification role. Please contact an administrator.'
                );
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            database.close();
        } catch (error) {
            console.error('Error handling verification:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    }
};
