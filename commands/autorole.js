const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

const db = new Database();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Configure automatic role assignment')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set the role to automatically assign to new members')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to assign automatically')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove automatic role assignment')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check current auto-role settings')
        ),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'set') {
                const role = interaction.options.getRole('role');
                
                // Check if bot can manage the role
                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    await interaction.reply({ 
                        embeds: [createErrorEmbed('I cannot assign this role as it is higher than or equal to my highest role.')], 
                        ephemeral: true 
                    });
                    return;
                }

                await db.updateGuildSettings(guildId, {
                    auto_role_id: role.id
                });

                const embed = createSuccessEmbed(`Auto-role set to ${role}!`)
                    .setDescription('New members will automatically receive this role when they join the server.');

                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'remove') {
                await db.updateGuildSettings(guildId, {
                    auto_role_id: null
                });

                const embed = createSuccessEmbed('Auto-role removed!');
                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'status') {
                const settings = await db.getGuildSettings(guildId);
                
                if (!settings || !settings.auto_role_id) {
                    const embed = new EmbedBuilder()
                        .setTitle('🎭 Auto-Role Status')
                        .setDescription('No auto-role is currently set')
                        .setColor('#ff6b6b');
                    
                    await interaction.reply({ embeds: [embed] });
                    return;
                }

                const role = interaction.guild.roles.cache.get(settings.auto_role_id);
                const embed = new EmbedBuilder()
                    .setTitle('🎭 Auto-Role Status')
                    .setDescription(`Auto-role is set to: ${role || 'Role not found'}`)
                    .setColor('#51cf66');

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Auto-role command error:', error);
            await interaction.reply({ embeds: [createErrorEmbed('Failed to configure auto-role settings. Please try again.')], ephemeral: true });
        }
    }
};
