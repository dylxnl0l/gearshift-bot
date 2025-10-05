const { EmbedBuilder } = require('discord.js');

class EmbedUtils {
    static createSuccessEmbed(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    static createErrorEmbed(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    static createWarningEmbed(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(0xffaa00)
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    static createInfoEmbed(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    static createModerationEmbed(action, user, moderator, reason, duration = null) {
        const embed = new EmbedBuilder()
            .setColor(0xff6b6b)
            .setTitle(`🔨 ${action}`)
            .addFields(
                { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
                { name: '👮 Moderator', value: `${moderator.tag}`, inline: true },
                { name: '📝 Reason', value: reason || 'No reason provided', inline: false }
            )
            .setTimestamp();

        if (duration) {
            embed.addFields({ name: '⏱️ Duration', value: duration, inline: true });
        }

        return embed;
    }

    static createMusicEmbed(title, description, thumbnail = null, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle(`🎵 ${title}`)
            .setDescription(description)
            .setTimestamp();

        if (thumbnail) {
            embed.setThumbnail(thumbnail);
        }

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    static createTicketEmbed(title, description, user, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`🎫 ${title}`)
            .setDescription(description)
            .addFields(
                { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }
}

module.exports = EmbedUtils;
