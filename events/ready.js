const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} guilds`);
        console.log(`👥 Watching ${client.users.cache.size} users`);
        
        // Set bot activity
        client.user.setActivity('for commands', { type: ActivityType.Watching });
        
        // Set up periodic status updates
        setInterval(() => {
            const activities = [
                { name: 'for commands', type: ActivityType.Watching },
                { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
                { name: 'music and moderation', type: ActivityType.Playing }
            ];
            
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            client.user.setActivity(randomActivity.name, { type: randomActivity.type });
        }, 300000); // Update every 5 minutes
    },
};
