const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');
const Database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Giveaway system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('Duration of the giveaway (e.g., 1h, 30m, 1d)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('Prize for the giveaway')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Number of winners')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('Message ID of the giveaway')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Reroll winners for a giveaway')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('Message ID of the giveaway')
                        .setRequired(true))),
    
    permissions: [PermissionFlagsBits.ManageMessages],
    cooldown: 5,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'start') {
            await this.handleStart(interaction);
        } else if (subcommand === 'end') {
            await this.handleEnd(interaction);
        } else if (subcommand === 'reroll') {
            await this.handleReroll(interaction);
        }
    },

    async handleStart(interaction) {
        const duration = interaction.options.getString('duration');
        const prize = interaction.options.getString('prize');
        const winners = interaction.options.getInteger('winners') || 1;

        try {
            // Parse duration
            const durationMs = this.parseDuration(duration);
            if (!durationMs || durationMs < 60000 || durationMs > 2419200000) { // 1 minute to 28 days
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Duration',
                    'Please provide a valid duration between 1 minute and 28 days.\nExamples: 1h, 30m, 1d, 2h30m'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const endTime = Date.now() + durationMs;

            // Create giveaway embed
            const giveawayEmbed = EmbedUtils.createInfoEmbed(
                '🎉 Giveaway',
                `**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>`
            ).addFields(
                { name: '🎁 Prize', value: prize, inline: true },
                { name: '👥 Winners', value: `${winners}`, inline: true },
                { name: '⏱️ Duration', value: duration, inline: true },
                { name: '👤 Hosted by', value: interaction.user.tag, inline: true },
                { name: '📅 Ends at', value: `<t:${Math.floor(endTime / 1000)}:F>`, inline: true }
            );

            // Create join button
            const joinButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('join_giveaway')
                        .setLabel('🎉 Join Giveaway')
                        .setStyle(ButtonStyle.Success)
                );

            const message = await interaction.reply({ 
                embeds: [giveawayEmbed], 
                components: [joinButton],
                fetchReply: true 
            });

            // Save to database
            const db = new Database();
            await db.createGiveaway(message.id, interaction.channel.id, interaction.guild.id, prize, winners, endTime, interaction.user.id);

            // Set up auto-end timer
            setTimeout(async () => {
                await this.endGiveaway(interaction.client, message.id, interaction.channel.id);
            }, durationMs);

            db.close();

        } catch (error) {
            console.error('Error starting giveaway:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },

    async handleEnd(interaction) {
        const messageId = interaction.options.getString('message_id');

        try {
            const message = await interaction.channel.messages.fetch(messageId);
            if (!message) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Message Not Found',
                    'Could not find the specified message.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            await this.endGiveaway(interaction.client, messageId, interaction.channel.id);

            const successEmbed = EmbedUtils.createSuccessEmbed(
                'Giveaway Ended',
                'The giveaway has been ended early.'
            );

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error ending giveaway:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },

    async handleReroll(interaction) {
        const messageId = interaction.options.getString('message_id');

        try {
            const message = await interaction.channel.messages.fetch(messageId);
            if (!message) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Message Not Found',
                    'Could not find the specified message.'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            await this.rerollGiveaway(interaction.client, messageId, interaction.channel.id);

            const successEmbed = EmbedUtils.createSuccessEmbed(
                'Giveaway Rerolled',
                'New winners have been selected for the giveaway.'
            );

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error rerolling giveaway:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },

    async endGiveaway(client, messageId, channelId) {
        try {
            const db = new Database();
            const giveaway = await db.getGiveaway(messageId);
            
            if (!giveaway || !giveaway.active) {
                db.close();
                return;
            }

            const channel = client.channels.cache.get(channelId);
            const message = await channel.messages.fetch(messageId);
            
            // Get participants
            const participants = JSON.parse(giveaway.participants || '[]');
            
            if (participants.length === 0) {
                const noParticipantsEmbed = EmbedUtils.createWarningEmbed(
                    'Giveaway Ended',
                    `**Prize:** ${giveaway.prize}\n**Winners:** ${giveaway.winners}\n\n❌ **No participants joined this giveaway.**`
                );

                await message.edit({ 
                    embeds: [noParticipantsEmbed], 
                    components: [] 
                });

                await db.endGiveaway(messageId);
                db.close();
                return;
            }

            // Select winners
            const winners = this.selectWinners(participants, giveaway.winners);
            const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

            const endedEmbed = EmbedUtils.createSuccessEmbed(
                '🎉 Giveaway Ended',
                `**Prize:** ${giveaway.prize}\n**Winners:** ${winnerMentions}\n\n🎊 **Congratulations to the winners!**`
            );

            await message.edit({ 
                embeds: [endedEmbed], 
                components: [] 
            });

            await db.endGiveaway(messageId);
            db.close();

        } catch (error) {
            console.error('Error ending giveaway:', error);
        }
    },

    async rerollGiveaway(client, messageId, channelId) {
        try {
            const db = new Database();
            const giveaway = await db.getGiveaway(messageId);
            
            if (!giveaway) {
                db.close();
                return;
            }

            const channel = client.channels.cache.get(channelId);
            const message = await channel.messages.fetch(messageId);
            
            // Get participants
            const participants = JSON.parse(giveaway.participants || '[]');
            
            if (participants.length === 0) {
                const noParticipantsEmbed = EmbedUtils.createWarningEmbed(
                    'Giveaway Reroll',
                    `**Prize:** ${giveaway.prize}\n**Winners:** ${giveaway.winners}\n\n❌ **No participants to reroll.**`
                );

                await message.edit({ embeds: [noParticipantsEmbed] });
                db.close();
                return;
            }

            // Select new winners
            const winners = this.selectWinners(participants, giveaway.winners);
            const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

            const rerollEmbed = EmbedUtils.createSuccessEmbed(
                '🎉 Giveaway Rerolled',
                `**Prize:** ${giveaway.prize}\n**New Winners:** ${winnerMentions}\n\n🎊 **Congratulations to the new winners!**`
            );

            await message.edit({ embeds: [rerollEmbed] });
            db.close();

        } catch (error) {
            console.error('Error rerolling giveaway:', error);
        }
    },

    selectWinners(participants, winnerCount) {
        const shuffled = [...participants].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, winnerCount);
    },

    parseDuration(duration) {
        const regex = /(\d+)([smhd])/g;
        let totalMs = 0;
        let match;

        while ((match = regex.exec(duration)) !== null) {
            const value = parseInt(match[1]);
            const unit = match[2];

            switch (unit) {
                case 's':
                    totalMs += value * 1000;
                    break;
                case 'm':
                    totalMs += value * 60 * 1000;
                    break;
                case 'h':
                    totalMs += value * 60 * 60 * 1000;
                    break;
                case 'd':
                    totalMs += value * 24 * 60 * 60 * 1000;
                    break;
            }
        }

        return totalMs;
    }
};
