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

    close() {
        this.db.close();
    }
}

module.exports = Database;
