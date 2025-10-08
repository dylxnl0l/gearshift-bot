const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed } = require('../utils/embeds');

const db = new Database();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Configure bot settings for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const settings = await db.getGuildSettings(guildId);
            
            const embed = new EmbedBuilder()
                .setTitle('⚙️ Server Settings')
                .setDescription('Configure your server settings using the dropdown menu below.')
                .setColor('#0099ff')
                .setTimestamp();

            // Add current settings to embed
            if (settings) {
                const banRoles = JSON.parse(settings.ban_roles || '[]');
                embed.addFields(
                    { name: '🔨 Ban Roles', value: banRoles.length > 0 ? banRoles.map(id => `<@&${id}>`).join(', ') : 'None set', inline: true },
                    { name: '🎭 Auto Role', value: settings.auto_role_id ? `<@&${settings.auto_role_id}>` : 'Not set', inline: true },
                    { name: '✅ Verify Channel', value: settings.verify_channel_id ? `<#${settings.verify_channel_id}>` : 'Not set', inline: true },
                    { name: '🛡️ Anti-Raid', value: settings.anti_raid_enabled ? 'Enabled' : 'Disabled', inline: true },
                    { name: '📝 Log Channel', value: settings.log_channel_id ? `<#${settings.log_channel_id}>` : 'Not set', inline: true }
                );
            } else {
                embed.addFields(
                    { name: '🔨 Ban Roles', value: 'None set', inline: true },
                    { name: '🎭 Auto Role', value: 'Not set', inline: true },
                    { name: '✅ Verify Channel', value: 'Not set', inline: true },
                    { name: '🛡️ Anti-Raid', value: 'Disabled', inline: true },
                    { name: '📝 Log Channel', value: 'Not set', inline: true }
                );
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('settings_menu')
                .setPlaceholder('Select a setting to configure...')
                .addOptions([
                    {
                        label: 'Ban Roles',
                        description: 'Configure which roles can use ban commands',
                        value: 'ban_roles',
                        emoji: '🔨'
                    },
                    {
                        label: 'Auto Role',
                        description: 'Set up automatic role assignment',
                        value: 'auto_role',
                        emoji: '🎭'
                    },
                    {
                        label: 'Verification',
                        description: 'Configure verification system',
                        value: 'verification',
                        emoji: '✅'
                    },
                    {
                        label: 'Anti-Raid',
                        description: 'Configure anti-raid protection',
                        value: 'anti_raid',
                        emoji: '🛡️'
                    },
                    {
                        label: 'Log Channel',
                        description: 'Set the channel for bot logs',
                        value: 'log_channel',
                        emoji: '📝'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        } catch (error) {
            console.error('Settings command error:', error);
            await interaction.reply({ embeds: [createErrorEmbed('Failed to load settings. Please try again.')], ephemeral: true });
        }
    }
};
