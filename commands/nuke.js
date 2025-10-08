const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Database = require('../utils/database');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

const db = new Database();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('Emergency server protection - removes all channels and bans all members')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for nuking the server')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        try {
            const reason = interaction.options.getString('reason') || 'Emergency server protection';
            
            // Confirmation embed
            const confirmEmbed = new EmbedBuilder()
                .setTitle('⚠️ EMERGENCY NUKE CONFIRMATION')
                .setDescription('**WARNING: This action will:**\n• Delete ALL channels\n• Ban ALL members\n• Remove ALL roles\n• This action is IRREVERSIBLE!\n\nAre you sure you want to proceed?')
                .setColor('#ff0000')
                .setFooter({ text: 'This action cannot be undone!' });

            const confirmButton = new ButtonBuilder()
                .setCustomId('nuke_confirm')
                .setLabel('CONFIRM NUKE')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('💥');

            const cancelButton = new ButtonBuilder()
                .setCustomId('nuke_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌');

            const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await interaction.reply({ 
                embeds: [confirmEmbed], 
                components: [row],
                ephemeral: true 
            });

            // Handle button interactions
            const filter = i => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ 
                filter, 
                time: 30000,
                max: 1 
            });

            collector.on('collect', async i => {
                if (i.customId === 'nuke_confirm') {
                    await i.deferUpdate();
                    
                    try {
                        const guild = interaction.guild;
                        
                        // Log the nuke action
                        await db.logRaidAction(guild.id, interaction.user.id, 'NUKE', null);
                        
                        // Delete all channels
                        const channels = guild.channels.cache.filter(channel => 
                            channel.type !== ChannelType.GuildCategory
                        );
                        
                        for (const channel of channels.values()) {
                            try {
                                await channel.delete();
                            } catch (error) {
                                console.error(`Failed to delete channel ${channel.name}:`, error);
                            }
                        }

                        // Ban all members (except the one who ran the command)
                        const members = guild.members.cache.filter(member => 
                            member.id !== interaction.user.id && 
                            member.id !== guild.members.me.id
                        );

                        for (const member of members.values()) {
                            try {
                                await member.ban({ reason: `Emergency nuke: ${reason}` });
                            } catch (error) {
                                console.error(`Failed to ban member ${member.user.tag}:`, error);
                            }
                        }

                        // Delete all roles (except @everyone and bot's roles)
                        const roles = guild.roles.cache.filter(role => 
                            role.id !== guild.id && 
                            !role.managed &&
                            role.position < guild.members.me.roles.highest.position
                        );

                        for (const role of roles.values()) {
                            try {
                                await role.delete();
                            } catch (error) {
                                console.error(`Failed to delete role ${role.name}:`, error);
                            }
                        }

                        // Create a new channel for confirmation
                        const newChannel = await guild.channels.create({
                            name: 'emergency-protection',
                            type: ChannelType.GuildText,
                            reason: 'Emergency nuke protection'
                        });

                        const successEmbed = new EmbedBuilder()
                            .setTitle('💥 Server Nuked Successfully')
                            .setDescription(`Server has been nuked for: ${reason}`)
                            .setColor('#ff0000')
                            .setTimestamp();

                        await newChannel.send({ embeds: [successEmbed] });

                    } catch (error) {
                        console.error('Nuke execution error:', error);
                        const errorEmbed = createErrorEmbed('Failed to complete nuke operation. Some actions may have been performed.');
                        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                    }
                } else if (i.customId === 'nuke_cancel') {
                    await i.deferUpdate();
                    const cancelEmbed = createSuccessEmbed('Nuke operation cancelled.');
                    await interaction.followUp({ embeds: [cancelEmbed], ephemeral: true });
                }
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = createErrorEmbed('Nuke confirmation timed out.');
                    await interaction.followUp({ embeds: [timeoutEmbed], ephemeral: true });
                }
            });

        } catch (error) {
            console.error('Nuke command error:', error);
            await interaction.reply({ embeds: [createErrorEmbed('Failed to initiate nuke operation. Please try again.')], ephemeral: true });
        }
    }
};
