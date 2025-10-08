const { EmbedBuilder } = require('discord.js');
const Database = require('../utils/database');

const db = new Database();

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            const guildId = member.guild.id;
            const settings = await db.getGuildSettings(guildId);
            
            // Auto-role assignment
            if (settings && settings.auto_role_id) {
                const role = member.guild.roles.cache.get(settings.auto_role_id);
                if (role) {
                    try {
                        await member.roles.add(role, 'Auto-role assignment');
                        console.log(`Auto-role assigned to ${member.user.tag} in ${member.guild.name}`);
                    } catch (error) {
                        console.error(`Failed to assign auto-role to ${member.user.tag}:`, error);
                    }
                }
            }

            // Anti-raid protection
            if (settings && settings.anti_raid_enabled) {
                const recentActions = await db.getRecentRaidActions(guildId, settings.anti_raid_timeframe);
                
                if (recentActions.length >= settings.anti_raid_threshold) {
                    try {
                        // Log the suspicious activity
                        await db.logRaidAction(guildId, member.id, 'JOIN', null);
                        
                        // Ban the member
                        await member.ban({ reason: 'Anti-raid protection triggered' });
                        
                        // Log to channel if set
                        if (settings.log_channel_id) {
                            const logChannel = member.guild.channels.cache.get(settings.log_channel_id);
                            if (logChannel) {
                                const embed = new EmbedBuilder()
                                    .setTitle('🛡️ Anti-Raid Protection')
                                    .setDescription(`User ${member.user.tag} was banned due to anti-raid protection`)
                                    .setColor('#ff6b6b')
                                    .setTimestamp();
                                
                                await logChannel.send({ embeds: [embed] });
                            }
                        }
                    } catch (error) {
                        console.error(`Failed to ban member ${member.user.tag} due to anti-raid:`, error);
                    }
                } else {
                    // Log the join for tracking
                    await db.logRaidAction(guildId, member.id, 'JOIN', null);
                }
            }

        } catch (error) {
            console.error('Guild member add event error:', error);
        }
    }
};
