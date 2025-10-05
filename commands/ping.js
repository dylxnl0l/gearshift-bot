const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency and status'),
    
    permissions: [PermissionFlagsBits.SendMessages],
    cooldown: 3,

    async execute(interaction) {
        try {
            const sent = await interaction.reply({ 
                content: '🏓 Pinging...', 
                fetchReply: true 
            });

            const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
            const websocketLatency = Math.round(interaction.client.ws.ping);

            const pingEmbed = EmbedUtils.createInfoEmbed(
                '🏓 Pong!',
                'Here are the bot\'s current statistics:'
            ).addFields(
                { name: '📡 WebSocket Latency', value: `${websocketLatency}ms`, inline: true },
                { name: '🔄 Roundtrip Latency', value: `${roundtripLatency}ms`, inline: true },
                { name: '💾 Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
                { name: '⏱️ Uptime', value: this.formatUptime(interaction.client.uptime), inline: true },
                { name: '📊 Servers', value: `${interaction.client.guilds.cache.size}`, inline: true },
                { name: '👥 Users', value: `${interaction.client.users.cache.size}`, inline: true }
            );

            await interaction.editReply({ 
                content: '', 
                embeds: [pingEmbed] 
            });

        } catch (error) {
            console.error('Error in ping command:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },

    formatUptime(uptime) {
        const days = Math.floor(uptime / 86400000);
        const hours = Math.floor((uptime % 86400000) / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m ${seconds}s`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
};
