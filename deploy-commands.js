const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load all command files
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️  The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Create REST instance
const rest = new REST().setToken(config.token);

// Deploy commands
(async () => {
    try {
        console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

        // Register commands globally
        const data = await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands globally.`);
        
        // If guild ID is provided, also register guild-specific commands
        if (config.guildId) {
            const guildData = await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands },
            );
            
            console.log(`✅ Successfully reloaded ${guildData.length} application (/) commands for guild ${config.guildId}.`);
        }

    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
})();
