const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),
    
    permissions: [PermissionFlagsBits.SendMessages],
    cooldown: 5,

    async execute(interaction) {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        // Check if user is in a voice channel
        if (!voiceChannel) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Not in Voice Channel',
                'You need to be in a voice channel to use music commands!'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if bot is in the same voice channel
        if (interaction.guild.members.me.voice.channelId !== voiceChannel.id) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Not in Same Channel',
                'You need to be in the same voice channel as the bot!'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            // Get queue and connection
            const musicQueues = require('./play').musicQueues;
            const connections = require('./play').connections;
            
            const queue = musicQueues.get(interaction.guild.id);
            const connection = connections.get(interaction.guild.id);

            if (!queue || !queue.isPlaying) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Nothing Playing',
                    'There is no music currently playing!'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Stop music and clear queue
            queue.isPlaying = false;
            queue.currentSong = null;
            queue.songs = [];

            // Disconnect from voice channel
            if (connection) {
                connection.destroy();
                connections.delete(interaction.guild.id);
            }

            const successEmbed = EmbedUtils.createSuccessEmbed(
                'Music Stopped',
                'Music has been stopped and the queue has been cleared.'
            ).addFields(
                { name: '👤 Stopped By', value: interaction.user.tag, inline: true }
            );

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error stopping music:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },
};
