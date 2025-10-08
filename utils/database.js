const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, '../modlogs.db'));
        this.init();
    }

    init() {
        // Create modlogs table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS modlogs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                action TEXT NOT NULL,
                reason TEXT,
                duration TEXT,
                guild_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                message_id TEXT
            )
        `);

        // Create giveaways table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS giveaways (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                prize TEXT NOT NULL,
                winners INTEGER NOT NULL,
                end_time INTEGER NOT NULL,
                creator_id TEXT NOT NULL,
                active INTEGER DEFAULT 1,
                participants TEXT DEFAULT '[]'
            )
        `);

        // Create guild settings table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY,
                ban_roles TEXT DEFAULT '[]',
                auto_role_id TEXT,
                verify_channel_id TEXT,
                verify_role_id TEXT,
                anti_raid_enabled INTEGER DEFAULT 0,
                anti_raid_threshold INTEGER DEFAULT 5,
                anti_raid_timeframe INTEGER DEFAULT 60000,
                log_channel_id TEXT,
                created_at INTEGER DEFAULT 0,
                updated_at INTEGER DEFAULT 0
            )
        `);

        // Create verification table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                verified INTEGER DEFAULT 0,
                verified_at INTEGER,
                created_at INTEGER NOT NULL
            )
        `);

        // Create raid protection table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS raid_protection (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                ip_hash TEXT
            )
        `);
    }

    // Modlogs methods
    addModlog(userId, moderatorId, action, reason, duration, guildId, messageId = null) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO modlogs (user_id, moderator_id, action, reason, duration, guild_id, timestamp, message_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([userId, moderatorId, action, reason, duration, guildId, Date.now(), messageId], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            
            stmt.finalize();
        });
    }

    getModlogs(userId, guildId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM modlogs WHERE user_id = ? AND guild_id = ? ORDER BY timestamp DESC',
                [userId, guildId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    // Giveaway methods
    createGiveaway(messageId, channelId, guildId, prize, winners, endTime, creatorId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO giveaways (message_id, channel_id, guild_id, prize, winners, end_time, creator_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([messageId, channelId, guildId, prize, winners, endTime, creatorId], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            
            stmt.finalize();
        });
    }

    getGiveaway(messageId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM giveaways WHERE message_id = ?',
                [messageId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    updateGiveawayParticipants(messageId, participants) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE giveaways SET participants = ? WHERE message_id = ?',
                [JSON.stringify(participants), messageId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    endGiveaway(messageId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE giveaways SET active = 0 WHERE message_id = ?',
                [messageId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    getActiveGiveaways(guildId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM giveaways WHERE guild_id = ? AND active = 1 AND end_time > ?',
                [guildId, Date.now()],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    // Guild settings methods
    getGuildSettings(guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM guild_settings WHERE guild_id = ?',
                [guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    updateGuildSettings(guildId, settings) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO guild_settings 
                (guild_id, ban_roles, auto_role_id, verify_channel_id, verify_role_id, 
                 anti_raid_enabled, anti_raid_threshold, anti_raid_timeframe, log_channel_id, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                guildId,
                JSON.stringify(settings.ban_roles || []),
                settings.auto_role_id || null,
                settings.verify_channel_id || null,
                settings.verify_role_id || null,
                settings.anti_raid_enabled ? 1 : 0,
                settings.anti_raid_threshold || 5,
                settings.anti_raid_timeframe || 60000,
                settings.log_channel_id || null,
                Date.now()
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            
            stmt.finalize();
        });
    }

    // Verification methods
    createVerification(userId, guildId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO verifications (user_id, guild_id, created_at)
                VALUES (?, ?, ?)
            `);
            
            stmt.run([userId, guildId, Date.now()], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            
            stmt.finalize();
        });
    }

    verifyUser(userId, guildId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE verifications SET verified = 1, verified_at = ? WHERE user_id = ? AND guild_id = ?',
                [Date.now(), userId, guildId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    isUserVerified(userId, guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT verified FROM verifications WHERE user_id = ? AND guild_id = ?',
                [userId, guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.verified === 1 : false);
                }
            );
        });
    }

    // Raid protection methods
    logRaidAction(guildId, userId, action, ipHash = null) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO raid_protection (guild_id, user_id, action, timestamp, ip_hash)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            stmt.run([guildId, userId, action, Date.now(), ipHash], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            
            stmt.finalize();
        });
    }

    getRecentRaidActions(guildId, timeframe) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM raid_protection WHERE guild_id = ? AND timestamp > ?',
                [guildId, Date.now() - timeframe],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;
