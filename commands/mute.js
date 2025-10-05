const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');
const PermissionUtils = require('../utils/permissions');
const Database = require('../utils/database');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user (timeout)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to mute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration of the mute (e.g., 1h, 30m, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the mute')
                .setRequired(false)),
    
    permissions: [PermissionFlagsBits.ModerateMembers],
    cooldown: 5,

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Check if user is trying to mute themselves
        if (user.id === interaction.user.id) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Invalid Target',
                'You cannot mute yourself!'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if user is trying to mute the bot
        if (user.id === interaction.client.user.id) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Invalid Target',
                'I cannot mute myself!'
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

        // Check if moderator can mute the target
        if (!PermissionUtils.canModerate(interaction.member, targetMember)) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Insufficient Permissions',
                'You cannot mute this user due to role hierarchy.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Parse duration
        const durationMs = this.parseDuration(duration);
        if (!durationMs || durationMs < 60000 || durationMs > 2419200000) { // 1 minute to 28 days
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Invalid Duration',
                'Please provide a valid duration between 1 minute and 28 days.\nExamples: 1h, 30m, 1d, 2h30m'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            // Send DM to user before muting
            const dmSent = await ErrorHandler.handleDMError(
                null, user, 'Muted', `${reason} (Duration: ${duration})`, interaction.user
            );

            // Mute the user
            const timeoutUntil = new Date(Date.now() + durationMs);
            await targetMember.timeout(durationMs, `${reason} | Moderator: ${interaction.user.tag}`);

            // Create success embed
            const successEmbed = EmbedUtils.createSuccessEmbed(
                'User Muted',
                `Successfully muted ${user.tag}.`
            ).addFields(
                { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
                { name: '👮 Moderator', value: interaction.user.tag, inline: true },
                { name: '📝 Reason', value: reason, inline: false },
                { name: '⏱️ Duration', value: duration, inline: true },
                { name: '🕐 Until', value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:F>`, inline: true },
                { name: '📨 DM Sent', value: dmSent ? '✅ Yes' : '❌ No', inline: true }
            );

            await interaction.reply({ embeds: [successEmbed] });

            // Log to logs channel
            const logsChannel = interaction.guild.channels.cache.get(config.channels.logs);
            if (logsChannel) {
                const logEmbed = EmbedUtils.createModerationEmbed(
                    'User Muted',
                    user,
                    interaction.user,
                    reason,
                    duration
                ).addFields(
                    { name: '🕐 Until', value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:F>`, inline: true },
                    { name: '📨 DM Sent', value: dmSent ? '✅ Yes' : '❌ No', inline: true }
                );

                await logsChannel.send({ embeds: [logEmbed] });
            }

            // Log DM failure if it occurred
            if (!dmSent) {
                await ErrorHandler.logDMFailure(interaction.guild, user, 'Muted', reason, interaction.user);
            }

            // Log to database
            const db = new Database();
            await db.addModlog(user.id, interaction.user.id, 'muted', reason, duration, interaction.guild.id);
            db.close();

        } catch (error) {
            console.error('Error muting user:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
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
