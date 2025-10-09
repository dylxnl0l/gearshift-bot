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

        // Create racing economy tables
        this.db.run(`
            CREATE TABLE IF NOT EXISTS racing_users (
                user_id TEXT PRIMARY KEY,
                guild_id TEXT NOT NULL,
                credits INTEGER DEFAULT 1000,
                total_races INTEGER DEFAULT 0,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                daily_claimed INTEGER DEFAULT 0,
                last_daily INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT 0,
                updated_at INTEGER DEFAULT 0
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS racing_races (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                racer1_id TEXT NOT NULL,
                racer2_id TEXT,
                winner_id TEXT,
                credits_wagered INTEGER DEFAULT 0,
                race_type TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                duration REAL
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

    // Racing economy methods
    getRacingUser(userId, guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM racing_users WHERE user_id = ? AND guild_id = ?',
                [userId, guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    createRacingUser(userId, guildId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO racing_users (user_id, guild_id, created_at, updated_at)
                VALUES (?, ?, ?, ?)
            `);
            
            const now = Date.now();
            stmt.run([userId, guildId, now, now], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            
            stmt.finalize();
        });
    }

    updateRacingUser(userId, guildId, updates) {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];
            
            if (updates.credits !== undefined) {
                fields.push('credits = ?');
                values.push(updates.credits);
            }
            if (updates.total_races !== undefined) {
                fields.push('total_races = ?');
                values.push(updates.total_races);
            }
            if (updates.wins !== undefined) {
                fields.push('wins = ?');
                values.push(updates.wins);
            }
            if (updates.losses !== undefined) {
                fields.push('losses = ?');
                values.push(updates.losses);
            }
            if (updates.daily_claimed !== undefined) {
                fields.push('daily_claimed = ?');
                values.push(updates.daily_claimed);
            }
            if (updates.last_daily !== undefined) {
                fields.push('last_daily = ?');
                values.push(updates.last_daily);
            }
            
            fields.push('updated_at = ?');
            values.push(Date.now());
            values.push(userId, guildId);
            
            this.db.run(
                `UPDATE racing_users SET ${fields.join(', ')} WHERE user_id = ? AND guild_id = ?`,
                values,
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    getRacingLeaderboard(guildId, limit = 10, sortBy = 'credits') {
        return new Promise((resolve, reject) => {
            const validSorts = ['credits', 'wins', 'total_races'];
            const sortColumn = validSorts.includes(sortBy) ? sortBy : 'credits';
            
            this.db.all(
                `SELECT * FROM racing_users WHERE guild_id = ? ORDER BY ${sortColumn} DESC LIMIT ?`,
                [guildId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    createRace(guildId, racer1Id, racer2Id, raceType, creditsWagered = 0) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO racing_races (guild_id, racer1_id, racer2_id, race_type, credits_wagered, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([guildId, racer1Id, racer2Id, raceType, creditsWagered, Date.now()], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            
            stmt.finalize();
        });
    }

    updateRace(raceId, winnerId, duration) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE racing_races SET winner_id = ?, duration = ? WHERE id = ?',
                [winnerId, duration, raceId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    getRacingStats(userId, guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM racing_users WHERE user_id = ? AND guild_id = ?',
                [userId, guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;
