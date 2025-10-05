const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');
const PermissionUtils = require('../utils/permissions');
const Database = require('../utils/database');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false)),
    
    permissions: [PermissionFlagsBits.KickMembers],
    cooldown: 5,

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Check if user is trying to kick themselves
        if (user.id === interaction.user.id) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Invalid Target',
                'You cannot kick yourself!'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if user is trying to kick the bot
        if (user.id === interaction.client.user.id) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Invalid Target',
                'I cannot kick myself!'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if user is trying to kick the server owner
        if (user.id === interaction.guild.ownerId) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Invalid Target',
                'You cannot kick the server owner!'
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

        // Check if moderator can kick the target
        if (!PermissionUtils.canModerate(interaction.member, targetMember)) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Insufficient Permissions',
                'You cannot kick this user due to role hierarchy.'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            // Send DM to user before kicking
            const dmSent = await ErrorHandler.handleDMError(
                null, user, 'Kicked', reason, interaction.user
            );

            // Kick the user
            await targetMember.kick(`${reason} | Moderator: ${interaction.user.tag}`);

            // Create success embed
            const successEmbed = EmbedUtils.createSuccessEmbed(
                'User Kicked',
                `Successfully kicked ${user.tag} from the server.`
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
                    'User Kicked',
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
                await ErrorHandler.logDMFailure(interaction.guild, user, 'Kicked', reason, interaction.user);
            }

            // Log to database
            const db = new Database();
            await db.addModlog(user.id, interaction.user.id, 'kicked', reason, null, interaction.guild.id);
            db.close();

        } catch (error) {
            console.error('Error kicking user:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },
};
