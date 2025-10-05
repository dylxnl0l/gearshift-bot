const { PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');

class PermissionUtils {
    static hasPermission(member, permission) {
        return member.permissions.has(permission);
    }

    static isModerator(member) {
        return member.roles.cache.has(config.roles.moderator) || 
               member.permissions.has(PermissionFlagsBits.ModerateMembers);
    }

    static isAdmin(member) {
        return member.roles.cache.has(config.roles.admin) || 
               member.permissions.has(PermissionFlagsBits.Administrator);
    }

    static isOwner(member) {
        return member.roles.cache.has(config.roles.owner) || 
               member.id === config.developer.userId;
    }

    static canModerate(member, target) {
        // Check if member can moderate the target
        if (member.id === target.id) return false;
        if (target.id === member.guild.ownerId) return false;
        
        // Check role hierarchy
        if (member.roles.highest.position <= target.roles.highest.position) {
            return false;
        }

        return this.isModerator(member);
    }

    static getRequiredPermissions(commandName) {
        const permissions = {
            'ban': PermissionFlagsBits.BanMembers,
            'kick': PermissionFlagsBits.KickMembers,
            'mute': PermissionFlagsBits.ModerateMembers,
            'warn': PermissionFlagsBits.ModerateMembers,
            'purge': PermissionFlagsBits.ManageMessages,
            'announce': PermissionFlagsBits.ManageMessages,
            'ticket': PermissionFlagsBits.ManageChannels
        };

        return permissions[commandName] || PermissionFlagsBits.SendMessages;
    }
}

module.exports = PermissionUtils;
