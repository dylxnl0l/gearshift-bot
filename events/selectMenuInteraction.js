const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const Database = require('../utils/database');
const EmbedUtils = require('../utils/embeds');
const ErrorHandler = require('../utils/errorHandler');

const db = new Database();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isStringSelectMenu()) return;

        try {
            if (interaction.customId === 'settings_menu') {
                await this.handleSettingsMenu(interaction);
            }
        } catch (error) {
            console.error('Error handling select menu interaction:', error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },

    async handleSettingsMenu(interaction) {
        const selectedOption = interaction.values[0];
        const guildId = interaction.guild.id;
        const settings = await db.getGuildSettings(guildId);

        switch (selectedOption) {
            case 'ban_roles':
                await this.handleBanRolesSettings(interaction, settings);
                break;
            case 'auto_role':
                await this.handleAutoRoleSettings(interaction, settings);
                break;
            case 'verification':
                await this.handleVerificationSettings(interaction, settings);
                break;
            case 'anti_raid':
                await this.handleAntiRaidSettings(interaction, settings);
                break;
            case 'log_channel':
                await this.handleLogChannelSettings(interaction, settings);
                break;
        }
    },

    async handleBanRolesSettings(interaction, settings) {
        const embed = new EmbedBuilder()
            .setTitle('🔨 Ban Roles Configuration')
            .setDescription('Configure which roles can use ban commands')
            .setColor('#0099ff');

        const currentBanRoles = settings ? JSON.parse(settings.ban_roles || '[]') : [];
        
        if (currentBanRoles.length > 0) {
            embed.addFields({
                name: 'Current Ban Roles',
                value: currentBanRoles.map(id => `<@&${id}>`).join(', '),
                inline: false
            });
        } else {
            embed.addFields({
                name: 'Current Ban Roles',
                value: 'None set',
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_ban_role')
                    .setLabel('Add Role')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('remove_ban_role')
                    .setLabel('Remove Role')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('➖'),
                new ButtonBuilder()
                    .setCustomId('clear_ban_roles')
                    .setLabel('Clear All')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗑️')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleAutoRoleSettings(interaction, settings) {
        const embed = new EmbedBuilder()
            .setTitle('🎭 Auto Role Configuration')
            .setDescription('Configure automatic role assignment for new members')
            .setColor('#0099ff');

        if (settings && settings.auto_role_id) {
            const role = interaction.guild.roles.cache.get(settings.auto_role_id);
            embed.addFields({
                name: 'Current Auto Role',
                value: role ? role.toString() : 'Role not found',
                inline: false
            });
        } else {
            embed.addFields({
                name: 'Current Auto Role',
                value: 'Not set',
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_auto_role')
                    .setLabel('Set Auto Role')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎭'),
                new ButtonBuilder()
                    .setCustomId('remove_auto_role')
                    .setLabel('Remove Auto Role')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleVerificationSettings(interaction, settings) {
        const embed = new EmbedBuilder()
            .setTitle('✅ Verification Configuration')
            .setDescription('Configure the verification system')
            .setColor('#0099ff');

        if (settings && settings.verify_channel_id && settings.verify_role_id) {
            const channel = interaction.guild.channels.cache.get(settings.verify_channel_id);
            const role = interaction.guild.roles.cache.get(settings.verify_role_id);
            
            embed.addFields(
                {
                    name: 'Verification Channel',
                    value: channel ? channel.toString() : 'Channel not found',
                    inline: true
                },
                {
                    name: 'Verification Role',
                    value: role ? role.toString() : 'Role not found',
                    inline: true
                }
            );
        } else {
            embed.addFields({
                name: 'Status',
                value: 'Not configured',
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('setup_verification')
                    .setLabel('Setup Verification')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('remove_verification')
                    .setLabel('Remove Verification')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleAntiRaidSettings(interaction, settings) {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Anti-Raid Configuration')
            .setDescription('Configure anti-raid protection settings')
            .setColor('#0099ff');

        if (settings && settings.anti_raid_enabled) {
            embed.addFields(
                {
                    name: 'Status',
                    value: 'Enabled',
                    inline: true
                },
                {
                    name: 'Threshold',
                    value: `${settings.anti_raid_threshold} actions`,
                    inline: true
                },
                {
                    name: 'Timeframe',
                    value: `${settings.anti_raid_timeframe / 1000} seconds`,
                    inline: true
                }
            );
        } else {
            embed.addFields({
                name: 'Status',
                value: 'Disabled',
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('enable_anti_raid')
                    .setLabel('Enable Anti-Raid')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🛡️'),
                new ButtonBuilder()
                    .setCustomId('disable_anti_raid')
                    .setLabel('Disable Anti-Raid')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('configure_anti_raid')
                    .setLabel('Configure')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚙️')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleLogChannelSettings(interaction, settings) {
        const embed = new EmbedBuilder()
            .setTitle('📝 Log Channel Configuration')
            .setDescription('Configure the channel for bot logs')
            .setColor('#0099ff');

        if (settings && settings.log_channel_id) {
            const channel = interaction.guild.channels.cache.get(settings.log_channel_id);
            embed.addFields({
                name: 'Current Log Channel',
                value: channel ? channel.toString() : 'Channel not found',
                inline: false
            });
        } else {
            embed.addFields({
                name: 'Current Log Channel',
                value: 'Not set',
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('set_log_channel')
                    .setLabel('Set Log Channel')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('remove_log_channel')
                    .setLabel('Remove Log Channel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    }
};
