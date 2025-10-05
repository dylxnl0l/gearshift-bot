const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Auto-moderation features can be added here
        // For example: spam detection, bad word filtering, etc.

        // Log message deletion for audit purposes
        if (message.channel.id === config.channels.logs) {
            // Track important messages in logs channel
            console.log(`Log message: ${message.author.tag} - ${message.content}`);
        }

        // Handle ticket system messages
        if (message.channel.name?.startsWith('ticket-')) {
            // Add ticket-specific handling here
            console.log(`Ticket message: ${message.author.tag} - ${message.content}`);
        }
    },
};
