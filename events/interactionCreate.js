const { Events, EmbedBuilder } = require('discord.js');
const ErrorHandler = require('../utils/errorHandler');
const PermissionUtils = require('../utils/permissions');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        // Check permissions
        if (command.permissions) {
            const member = interaction.member;
            if (!member) {
                await interaction.reply({ 
                    content: '❌ This command can only be used in a server!', 
                    ephemeral: true 
                });
                return;
            }

            const hasPermission = command.permissions.some(permission => 
                PermissionUtils.hasPermission(member, permission)
            );

            if (!hasPermission) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('❌ Insufficient Permissions')
                    .setDescription('You do not have the required permissions to use this command.')
                    .setTimestamp();

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }
        }

        // Check cooldowns
        const { cooldowns } = interaction.client;

        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldownDuration = 3;
        const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const expiredTimestamp = Math.round(expirationTime / 1000);
                const cooldownEmbed = new EmbedBuilder()
                    .setColor(0xffaa00)
                    .setTitle('⏰ Cooldown Active')
                    .setDescription(`Please wait <t:${expiredTimestamp}:R> before using this command again.`)
                    .setTimestamp();

                await interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
                return;
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        // Execute command
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);
            await ErrorHandler.handleError(error, interaction, interaction.client);
        }
    },
};
