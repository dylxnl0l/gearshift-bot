const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue'),
    
    permissions: [PermissionFlagsBits.SendMessages],
    cooldown: 3,

    async execute(interaction) {
        try {
            // Get queue
            const musicQueues = require('./play').musicQueues;
            const queue = musicQueues.get(interaction.guild.id);

            if (!queue || (!queue.isPlaying && queue.songs.length === 0)) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Empty Queue',
                    'There is no music in the queue!'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Create queue embed
            const queueEmbed = EmbedUtils.createMusicEmbed(
                'Music Queue',
                `Currently ${queue.isPlaying ? 'playing' : 'paused'}`
            );

            // Add current song
            if (queue.currentSong) {
                queueEmbed.addFields({
                    name: '🎵 Now Playing',
                    value: `**${queue.currentSong.title}**\nRequested by: ${queue.currentSong.requestedBy.tag}`,
                    inline: false
                });
            }

            // Add upcoming songs (limit to 10)
            if (queue.songs.length > 0) {
                const upcomingSongs = queue.songs.slice(0, 10).map((song, index) => 
                    `${index + 1}. **${song.title}** - ${song.requestedBy.tag}`
                ).join('\n');

                queueEmbed.addFields({
                    name: '📋 Upcoming',
                    value: upcomingSongs || 'No songs in queue',
                    inline: false
                });

                if (queue.songs.length > 10) {
                    queueEmbed.addFields({
                        name: '📊 Total Songs',
                        value: `${queue.songs.length} songs in queue`,
                        inline: true
                    });
                }
            }

            await interaction.reply({ embeds: [queueEmbed] });

        } catch (error) {
            console.error('Error showing queue:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },
};
