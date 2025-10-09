const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

const db = new Database();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('💸 Transfer credits to another user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to transfer credits to')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of credits to transfer')
                .setMinValue(1)
                .setMaxValue(10000)
                .setRequired(true)
        ),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const senderId = interaction.user.id;
            const recipient = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');

            // Validate recipient
            if (recipient.id === senderId) {
                await interaction.reply({ 
                    embeds: [createErrorEmbed('You cannot transfer credits to yourself!')], 
                    ephemeral: true 
                });
                return;
            }

            if (recipient.bot) {
                await interaction.reply({ 
                    embeds: [createErrorEmbed('You cannot transfer credits to bots!')], 
                    ephemeral: true 
                });
                return;
            }

            // Get sender data
            let sender = await db.getRacingUser(senderId, guildId);
            if (!sender) {
                await db.createRacingUser(senderId, guildId);
                sender = await db.getRacingUser(senderId, guildId);
            }

            // Check if sender has enough credits
            if (sender.credits < amount) {
                await interaction.reply({ 
                    embeds: [createErrorEmbed(`You don't have enough credits! You have ${sender.credits} credits.`)], 
                    ephemeral: true 
                });
                return;
            }

            // Get or create recipient data
            let recipientData = await db.getRacingUser(recipient.id, guildId);
            if (!recipientData) {
                await db.createRacingUser(recipient.id, guildId);
                recipientData = await db.getRacingUser(recipient.id, guildId);
            }

            // Perform transfer
            await db.updateRacingUser(senderId, guildId, {
                credits: sender.credits - amount
            });

            await db.updateRacingUser(recipient.id, guildId, {
                credits: recipientData.credits + amount
            });

            // Create success embed
            const successEmbed = createSuccessEmbed('Transfer Successful!')
                .setDescription(`Successfully transferred credits!`)
                .addFields(
                    { name: '👤 From', value: interaction.user.toString(), inline: true },
                    { name: '👤 To', value: recipient.toString(), inline: true },
                    { name: '💰 Amount', value: `${amount.toLocaleString()} credits`, inline: true },
                    { name: '💳 Your New Balance', value: `${(sender.credits - amount).toLocaleString()} credits`, inline: true },
                    { name: '💳 Their New Balance', value: `${(recipientData.credits + amount).toLocaleString()} credits`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Transfer command error:', error);
            await interaction.reply({ 
                embeds: [createErrorEmbed('An error occurred during the transfer. Please try again.')], 
                ephemeral: true 
            });
        }
    }
};
