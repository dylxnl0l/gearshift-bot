const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { search } = require('youtube-sr');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');

// Store music queues and connections
const musicQueues = new Map();
const connections = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from YouTube')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Song name or YouTube URL to play')
                .setRequired(true)),
    
    permissions: [PermissionFlagsBits.SendMessages],
    cooldown: 3,

    async execute(interaction) {
        const song = interaction.options.getString('song');
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        // Check if user is in a voice channel
        if (!voiceChannel) {
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Not in Voice Channel',
                'You need to be in a voice channel to play music!'
            );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            // Get or create queue for this guild
            if (!musicQueues.has(interaction.guild.id)) {
                musicQueues.set(interaction.guild.id, {
                    songs: [],
                    currentSong: null,
                    isPlaying: false,
                    volume: 0.5
                });
            }

            const queue = musicQueues.get(interaction.guild.id);

            // Search for song
            let songInfo;
            if (ytdl.validateURL(song)) {
                // Direct YouTube URL
                songInfo = await ytdl.getInfo(song);
            } else {
                // Search for song
                const searchResults = await search(song, { limit: 1 });
                if (!searchResults || searchResults.length === 0) {
                    const errorEmbed = EmbedUtils.createErrorEmbed(
                        'Song Not Found',
                        'Could not find the requested song. Please try a different search term.'
                    );
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
                songInfo = await ytdl.getInfo(searchResults[0].url);
            }

            const songData = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url,
                duration: songInfo.videoDetails.lengthSeconds,
                thumbnail: songInfo.videoDetails.thumbnails[0]?.url,
                requestedBy: interaction.user
            };

            // Add song to queue
            queue.songs.push(songData);

            // Create success embed
            const successEmbed = EmbedUtils.createMusicEmbed(
                'Song Added to Queue',
                `**${songData.title}** has been added to the queue.`
            ).addFields(
                { name: '🎵 Song', value: songData.title, inline: false },
                { name: '⏱️ Duration', value: this.formatDuration(songData.duration), inline: true },
                { name: '👤 Requested By', value: interaction.user.tag, inline: true },
                { name: '📊 Position in Queue', value: `${queue.songs.length}`, inline: true }
            );

            if (songData.thumbnail) {
                successEmbed.setThumbnail(songData.thumbnail);
            }

            await interaction.reply({ embeds: [successEmbed] });

            // If not playing, start playing
            if (!queue.isPlaying) {
                await this.playMusic(interaction.guild, voiceChannel);
            }

        } catch (error) {
            console.error('Error playing music:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },

    async playMusic(guild, voiceChannel) {
        const queue = musicQueues.get(guild.id);
        if (!queue || queue.songs.length === 0) return;

        queue.isPlaying = true;
        const song = queue.songs.shift();
        queue.currentSong = song;

        try {
            // Create or get connection
            let connection = connections.get(guild.id);
            if (!connection) {
                connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                });
                connections.set(guild.id, connection);
            }

            // Create audio player
            const player = createAudioPlayer();
            connection.subscribe(player);

            // Create audio resource
            const stream = ytdl(song.url, {
                filter: 'audioonly',
                highWaterMark: 1 << 25
            });

            const resource = createAudioResource(stream);
            player.play(resource);

            // Send now playing embed
            const textChannel = guild.channels.cache.find(channel => 
                channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
            );

            if (textChannel) {
                const nowPlayingEmbed = EmbedUtils.createMusicEmbed(
                    'Now Playing',
                    `**${song.title}**`
                ).addFields(
                    { name: '⏱️ Duration', value: this.formatDuration(song.duration), inline: true },
                    { name: '👤 Requested By', value: song.requestedBy.tag, inline: true }
                );

                if (song.thumbnail) {
                    nowPlayingEmbed.setThumbnail(song.thumbnail);
                }

                await textChannel.send({ embeds: [nowPlayingEmbed] });
            }

            // Handle player events
            player.on('error', error => {
                console.error('Audio player error:', error);
                this.playNext(guild);
            });

            player.on('stateChange', (oldState, newState) => {
                if (oldState.status === 'playing' && newState.status === 'idle') {
                    this.playNext(guild);
                }
            });

        } catch (error) {
            console.error('Error in playMusic:', error);
            queue.isPlaying = false;
        }
    },

    async playNext(guild) {
        const queue = musicQueues.get(guild.id);
        if (!queue) return;

        if (queue.songs.length > 0) {
            const voiceChannel = guild.members.me.voice.channel;
            if (voiceChannel) {
                await this.playMusic(guild, voiceChannel);
            }
        } else {
            queue.isPlaying = false;
            queue.currentSong = null;
            
            // Disconnect after 5 minutes of inactivity
            setTimeout(() => {
                const connection = connections.get(guild.id);
                if (connection) {
                    connection.destroy();
                    connections.delete(guild.id);
                }
            }, 300000);
        }
    },

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
};
