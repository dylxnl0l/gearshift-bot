const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Show user profile information')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to show profile for (default: yourself)')
                .setRequired(false)),
    
    permissions: [PermissionFlagsBits.SendMessages],
    cooldown: 5,

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetMember = interaction.guild.members.cache.get(targetUser.id);

        try {
            // Create profile embed
            const profileEmbed = new EmbedBuilder()
                .setColor(targetMember?.displayHexColor || 0x0099ff)
                .setTitle(`👤 ${targetUser.tag}'s Profile`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '🆔 User ID', value: targetUser.id, inline: true },
                    { name: '📅 Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: true },
                    { name: '🤖 Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true }
                )
                .setTimestamp();

            if (targetMember) {
                profileEmbed.addFields(
                    { name: '📅 Joined Server', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>`, inline: true },
                    { name: '🎭 Nickname', value: targetMember.nickname || 'None', inline: true },
                    { name: '🎨 Display Name', value: targetMember.displayName, inline: true }
                );

                // Add roles
                const roles = targetMember.roles.cache
                    .filter(role => role.id !== interaction.guild.id)
                    .map(role => role.toString())
                    .slice(0, 10); // Limit to 10 roles

                if (roles.length > 0) {
                    profileEmbed.addFields({
                        name: '🎭 Roles',
                        value: roles.join(', ') + (targetMember.roles.cache.size > 11 ? ` (+${targetMember.roles.cache.size - 11} more)` : ''),
                        inline: false
                    });
                }

                // Add permissions
                const permissions = targetMember.permissions.toArray().slice(0, 10);
                if (permissions.length > 0) {
                    profileEmbed.addFields({
                        name: '🔑 Key Permissions',
                        value: permissions.map(perm => `\`${perm}\``).join(', '),
                        inline: false
                    });
                }
            }

            // Add activity status
            if (targetMember?.presence) {
                const status = targetMember.presence.status;
                const activities = targetMember.presence.activities;
                
                profileEmbed.addFields({
                    name: '📊 Status',
                    value: `**${status.charAt(0).toUpperCase() + status.slice(1)}**`,
                    inline: true
                });

                if (activities.length > 0) {
                    const activity = activities[0];
                    profileEmbed.addFields({
                        name: '🎮 Activity',
                        value: `${activity.type === 0 ? 'Playing' : activity.type === 1 ? 'Streaming' : activity.type === 2 ? 'Listening to' : activity.type === 3 ? 'Watching' : 'Custom'} ${activity.name}`,
                        inline: true
                    });
                }
            }

            await interaction.reply({ embeds: [profileEmbed] });

        } catch (error) {
            console.error('Error showing profile:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },
};
