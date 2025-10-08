const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

const db = new Database();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Configure verification system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up verification system')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send verification message')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to give after verification')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove verification system')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check verification system status')
        ),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'setup') {
                const channel = interaction.options.getChannel('channel');
                const role = interaction.options.getRole('role');

                // Check if bot has permissions
                if (!channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
                    await interaction.reply({ 
                        embeds: [createErrorEmbed('I need Send Messages and Embed Links permissions in that channel.')], 
                        ephemeral: true 
                    });
                    return;
                }

                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    await interaction.reply({ 
                        embeds: [createErrorEmbed('I cannot assign this role as it is higher than or equal to my highest role.')], 
                        ephemeral: true 
                    });
                    return;
                }

                await db.updateGuildSettings(guildId, {
                    verify_channel_id: channel.id,
                    verify_role_id: role.id
                });

                // Create verification embed
                const verifyEmbed = new EmbedBuilder()
                    .setTitle('✅ Server Verification')
                    .setDescription('Click the button below to verify yourself and gain access to the server!')
                    .setColor('#51cf66')
                    .setFooter({ text: 'This server requires verification to participate' });

                const verifyButton = new ButtonBuilder()
                    .setCustomId('verify_button')
                    .setLabel('Verify')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅');

                const row = new ActionRowBuilder().addComponents(verifyButton);

                await channel.send({ embeds: [verifyEmbed], components: [row] });

                const embed = createSuccessEmbed('Verification system set up!')
                    .addFields(
                        { name: 'Channel', value: channel.toString(), inline: true },
                        { name: 'Role', value: role.toString(), inline: true }
                    );

                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'remove') {
                await db.updateGuildSettings(guildId, {
                    verify_channel_id: null,
                    verify_role_id: null
                });

                const embed = createSuccessEmbed('Verification system removed!');
                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'status') {
                const settings = await db.getGuildSettings(guildId);
                
                if (!settings || !settings.verify_channel_id || !settings.verify_role_id) {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Verification Status')
                        .setDescription('Verification system is not set up')
                        .setColor('#ff6b6b');
                    
                    await interaction.reply({ embeds: [embed] });
                    return;
                }

                const channel = interaction.guild.channels.cache.get(settings.verify_channel_id);
                const role = interaction.guild.roles.cache.get(settings.verify_role_id);
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Verification Status')
                    .setDescription('Verification system is active')
                    .setColor('#51cf66')
                    .addFields(
                        { name: 'Channel', value: channel ? channel.toString() : 'Channel not found', inline: true },
                        { name: 'Role', value: role ? role.toString() : 'Role not found', inline: true }
                    );

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Verify command error:', error);
            await interaction.reply({ embeds: [createErrorEmbed('Failed to configure verification system. Please try again.')], ephemeral: true });
        }
    }
};
