const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

const db = new Database();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antiraid')
        .setDescription('Configure anti-raid protection settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable anti-raid protection')
                .addIntegerOption(option =>
                    option.setName('threshold')
                        .setDescription('Number of actions before triggering (default: 5)')
                        .setMinValue(3)
                        .setMaxValue(20)
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('timeframe')
                        .setDescription('Timeframe in seconds (default: 60)')
                        .setMinValue(10)
                        .setMaxValue(300)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable anti-raid protection')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check current anti-raid status')
        ),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'enable') {
                const threshold = interaction.options.getInteger('threshold') || 5;
                const timeframe = (interaction.options.getInteger('timeframe') || 60) * 1000; // Convert to milliseconds

                await db.updateGuildSettings(guildId, {
                    anti_raid_enabled: true,
                    anti_raid_threshold: threshold,
                    anti_raid_timeframe: timeframe
                });

                const embed = createSuccessEmbed('Anti-raid protection enabled!')
                    .addFields(
                        { name: 'Threshold', value: `${threshold} actions`, inline: true },
                        { name: 'Timeframe', value: `${timeframe / 1000} seconds`, inline: true }
                    );

                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'disable') {
                await db.updateGuildSettings(guildId, {
                    anti_raid_enabled: false
                });

                const embed = createSuccessEmbed('Anti-raid protection disabled!');
                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'status') {
                const settings = await db.getGuildSettings(guildId);
                
                if (!settings || !settings.anti_raid_enabled) {
                    const embed = new EmbedBuilder()
                        .setTitle('🛡️ Anti-Raid Status')
                        .setDescription('Anti-raid protection is **disabled**')
                        .setColor('#ff6b6b');
                    
                    await interaction.reply({ embeds: [embed] });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle('🛡️ Anti-Raid Status')
                    .setDescription('Anti-raid protection is **enabled**')
                    .setColor('#51cf66')
                    .addFields(
                        { name: 'Threshold', value: `${settings.anti_raid_threshold} actions`, inline: true },
                        { name: 'Timeframe', value: `${settings.anti_raid_timeframe / 1000} seconds`, inline: true }
                    );

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Anti-raid command error:', error);
            await interaction.reply({ embeds: [createErrorEmbed('Failed to configure anti-raid settings. Please try again.')], ephemeral: true });
        }
    }
};
