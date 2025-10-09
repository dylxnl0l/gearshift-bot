const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

const db = new Database();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givecredits')
        .setDescription('🎁 Give credits to a user (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to give credits to')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of credits to give')
                .setMinValue(1)
                .setMaxValue(100000)
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for giving credits')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const reason = interaction.options.getString('reason') || 'Admin reward';

            // Validate target user
            if (targetUser.bot) {
                await interaction.reply({ 
                    embeds: [createErrorEmbed('You cannot give credits to bots!')], 
                    ephemeral: true 
                });
                return;
            }

            // Get or create user data
            let user = await db.getRacingUser(targetUser.id, guildId);
            if (!user) {
                await db.createRacingUser(targetUser.id, guildId);
                user = await db.getRacingUser(targetUser.id, guildId);
            }

            // Give credits
            await db.updateRacingUser(targetUser.id, guildId, {
                credits: user.credits + amount
            });

            // Create success embed
            const successEmbed = createSuccessEmbed('Credits Given Successfully!')
                .setDescription(`Successfully gave credits to ${targetUser.tag}!`)
                .addFields(
                    { name: '👤 Recipient', value: targetUser.toString(), inline: true },
                    { name: '💰 Amount', value: `${amount.toLocaleString()} credits`, inline: true },
                    { name: '📝 Reason', value: reason, inline: true },
                    { name: '💳 Their New Balance', value: `${(user.credits + amount).toLocaleString()} credits`, inline: true },
                    { name: '👮 Given By', value: interaction.user.toString(), inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Give credits command error:', error);
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while giving credits. Please try again.')], 
                ephemeral: true 
            });
        }
    }
};
