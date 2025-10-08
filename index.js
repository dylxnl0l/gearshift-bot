const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
// Load configuration from environment variables or config.json
let config;

if (process.env.DISCORD_TOKEN) {
    // Use environment variables (production)
    config = {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID,
        channels: {
            logs: process.env.LOGS_CHANNEL_ID,
            tickets: process.env.TICKETS_CHANNEL_ID
        },
        roles: {
            moderator: process.env.MODERATOR_ROLE_ID,
            admin: process.env.ADMIN_ROLE_ID,
            owner: process.env.OWNER_ROLE_ID
        },
        music: {
            maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE) || 50,
            defaultVolume: parseFloat(process.env.DEFAULT_VOLUME) || 0.5
        },
        developer: {
            userId: process.env.DEVELOPER_USER_ID
        }
    };
} else {
    // Try to load config.json (development)
    try {
        config = require('./config.json');
    } catch (error) {
        console.error('❌ Configuration Error:');
        console.error('No environment variables found and config.json not found.');
        console.error('Please set the following environment variables:');
        console.error('- DISCORD_TOKEN');
        console.error('- CLIENT_ID');
        console.error('- GUILD_ID');
        console.error('- LOGS_CHANNEL_ID');
        console.error('- TICKETS_CHANNEL_ID');
        console.error('- MODERATOR_ROLE_ID');
        console.error('- ADMIN_ROLE_ID');
        console.error('- OWNER_ROLE_ID');
        console.error('- DEVELOPER_USER_ID');
        process.exit(1);
    }
}

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// Create collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Load command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️  The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Load event files
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`✅ Loaded event: ${event.name}`);
}

// Global error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

// Login to Discord
client.login(config.token).catch(error => {
    console.error('Failed to login:', error);
    process.exit(1);
});

module.exports = client;
