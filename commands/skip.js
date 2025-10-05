const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    
    permissions: [PermissionFlagsBits.SendMessages],
    cooldown: 3,

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
            // Get queue
            const musicQueues = require('./play').musicQueues;
            const queue = musicQueues.get(interaction.guild.id);

            if (!queue || !queue.isPlaying) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Nothing Playing',
                    'There is no music currently playing!'
                );
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Skip current song
            const currentSong = queue.currentSong;
            const playNext = require('./play').playNext;
            await playNext(interaction.guild);

            const successEmbed = EmbedUtils.createSuccessEmbed(
                'Song Skipped',
                currentSong ? `Skipped **${currentSong.title}**` : 'Skipped current song'
            ).addFields(
                { name: '👤 Skipped By', value: interaction.user.tag, inline: true }
            );

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error skipping song:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },
};
