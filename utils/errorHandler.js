const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

class ErrorHandler {
    static async handleError(error, interaction = null, client = null) {
        console.error('Error occurred:', error);

        // Create error embed
        const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ An Error Occurred')
            .setDescription('Something went wrong while processing your request.')
            .addFields(
                { name: 'Error', value: `\`\`\`${error.message}\`\`\``, inline: false },
                { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

        // Try to respond to interaction
        if (interaction) {
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            } catch (replyError) {
                console.error('Failed to send error response:', replyError);
            }
        }

        // Send error to developer
        if (client && config.developer.userId) {
            try {
                const developer = await client.users.fetch(config.developer.userId);
                const devEmbed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('🚨 Bot Error Report')
                    .setDescription('An error occurred in the bot')
                    .addFields(
                        { name: 'Error', value: `\`\`\`${error.message}\`\`\``, inline: false },
                        { name: 'Stack', value: `\`\`\`${error.stack?.substring(0, 1000)}\`\`\``, inline: false },
                        { name: 'Command', value: interaction?.commandName || 'Unknown', inline: true },
                        { name: 'User', value: interaction?.user?.tag || 'Unknown', inline: true },
                        { name: 'Guild', value: interaction?.guild?.name || 'DM', inline: true }
                    )
                    .setTimestamp();

                await developer.send({ embeds: [devEmbed] });
            } catch (devError) {
                console.error('Failed to send error to developer:', devError);
            }
        }
    }

    static async handleDMError(error, user, action, reason, moderator) {
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setTitle(`🔨 ${action}`)
                .setDescription(`You have been ${action.toLowerCase()} from the server.`)
                .addFields(
                    { name: '📝 Reason', value: reason || 'No reason provided', inline: false },
                    { name: '👮 Moderator', value: moderator.tag, inline: true },
                    { name: '📅 Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setTimestamp();

            await user.send({ embeds: [dmEmbed] });
            return true;
        } catch (dmError) {
            console.error(`Failed to send DM to ${user.tag}:`, dmError);
            return false;
        }
    }

    static async logDMFailure(guild, user, action, reason, moderator) {
        try {
            const logsChannel = guild.channels.cache.get(config.channels.logs);
            if (!logsChannel) return;

            const failureEmbed = new EmbedBuilder()
                .setColor(0xffaa00)
                .setTitle('⚠️ DM Delivery Failed')
                .setDescription(`Could not deliver ${action} notification to user.`)
                .addFields(
                    { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: '🔨 Action', value: action, inline: true },
                    { name: '👮 Moderator', value: moderator.tag, inline: true }
                )
                .setTimestamp();

            await logsChannel.send({ embeds: [failureEmbed] });
        } catch (logError) {
            console.error('Failed to log DM failure:', logError);
        }
    }
}

module.exports = ErrorHandler;
