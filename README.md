# Discord Moderation Bot

A modern Discord bot built with Discord.js v14 featuring comprehensive moderation tools, ticket system, music functionality, and more.

## 🚀 Features

### 🛡️ Moderation Commands
- `/ban [user] [reason]` - Ban users with DM notifications
- `/kick [user] [reason]` - Kick users with DM notifications  
- `/mute [user] [duration] [reason]` - Timeout users with custom durations
- `/warn [user] [reason]` - Warn users with DM notifications
- `/purge [amount] [user] [reason]` - Bulk delete messages

### 🎟️ Ticket System
- `/ticket setup` - Setup ticket system with embed and button
- `/ticket create` - Create private support channels
- `/ticket close` - Close tickets with confirmation
- **Ticket Management Buttons:**
  - 🧍‍♂️ Claim Ticket - Staff can claim tickets
  - ➕ Add User - Add users to tickets
  - ➖ Remove User - Remove users from tickets
  - 🔒 Close Ticket - Close and archive tickets
- Automatic role permissions and channel management
- Transcript logging to logs channel

### 🎵 Music System
- `/play [song]` - Play music from YouTube
- `/skip` - Skip current song
- `/queue` - Show music queue
- `/stop` - Stop music and clear queue
- Rich embeds for music information

### ⚙️ General Commands
- `/ping` - Check bot latency and status
- `/announce [title] [message]` - Send server announcements
- `/profile [user]` - Show user profile information

### 📋 Moderation Logs
- `/modlogs [user]` - View moderation history for a user
- SQLite database storage for all moderation actions
- Detailed action tracking with timestamps and reasons

### 🎁 Giveaway System
- `/giveaway start [duration] [prize] [winners]` - Start giveaways with embed
- `/giveaway end [message_id]` - End giveaways early
- `/giveaway reroll [message_id]` - Reroll winners
- Automatic winner selection and announcement
- Participant tracking and management

## 📋 Requirements

- Node.js 16.9.0 or higher
- Discord.js v14
- A Discord bot token
- Bot permissions in your Discord server

## 🛠️ Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd discord-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the bot**
   - Copy `config.json` and fill in your bot details:
   ```json
   {
     "token": "YOUR_BOT_TOKEN_HERE",
     "clientId": "YOUR_CLIENT_ID_HERE", 
     "guildId": "YOUR_GUILD_ID_HERE",
     "channels": {
       "logs": "CHANNEL_ID_FOR_LOGS",
       "tickets": "CHANNEL_ID_FOR_TICKETS"
     },
     "roles": {
       "moderator": "MODERATOR_ROLE_ID",
       "admin": "ADMIN_ROLE_ID",
       "owner": "OWNER_ROLE_ID"
     },
     "developer": {
       "userId": "YOUR_USER_ID_FOR_ERROR_DMS"
     }
   }
   ```

4. **Deploy slash commands**
   ```bash
   node deploy-commands.js
   ```

5. **Set up your Discord bot**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to "Bot" section and create a bot
   - Copy the token and paste it in `config.json`
   - Enable required intents: Server Members, Message Content, Voice States

6. **Invite the bot to your server**
   - Go to OAuth2 > URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Administrator` (or specific permissions)
   - Use the generated URL to invite the bot

## 🚀 Running the Bot

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📁 Project Structure

```
discord-bot/
├── commands/           # Slash command files
│   ├── ban.js
│   ├── kick.js
│   ├── mute.js
│   ├── warn.js
│   ├── purge.js
│   ├── ticket.js
│   ├── play.js
│   ├── skip.js
│   ├── queue.js
│   ├── stop.js
│   ├── ping.js
│   ├── announce.js
│   └── profile.js
├── events/            # Event handler files
│   ├── ready.js
│   ├── interactionCreate.js
│   ├── messageCreate.js
│   └── buttonInteraction.js
├── utils/             # Utility functions
│   ├── embeds.js
│   ├── permissions.js
│   └── errorHandler.js
├── config.json        # Bot configuration
├── package.json       # Dependencies
├── index.js          # Main bot file
└── README.md         # This file
```

## 🔧 Configuration

### Required Bot Permissions
- Send Messages
- Use Slash Commands
- Manage Messages
- Ban Members
- Kick Members
- Moderate Members
- Manage Channels
- Connect (for music)
- Speak (for music)

### Required Intents
- Guilds
- Guild Messages
- Guild Voice States
- Guild Members
- Message Content
- Direct Messages

## 🎵 Music Features

The bot supports YouTube music playback with:
- Queue management
- Rich embeds showing current song
- Automatic disconnection after inactivity
- Error handling for invalid URLs

## 🎫 Ticket System

The ticket system creates private channels with:
- Automatic role permissions
- Staff notifications
- Transcript logging
- Confirmation dialogs

## 🛡️ Moderation Features

All moderation actions include:
- DM notifications to users
- Logging to designated channels
- Permission checks and role hierarchy
- Error handling for failed DMs

## 📝 Error Handling

The bot includes comprehensive error handling:
- Graceful error responses
- Developer notifications for critical errors
- DM failure logging
- Automatic error recovery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:
1. Check the console for error messages
2. Verify your bot permissions
3. Ensure all configuration values are correct
4. Check Discord.js documentation for API changes

## 🔄 Updates

To update the bot:
1. Pull the latest changes
2. Run `npm install` to update dependencies
3. Restart the bot

---

**Note**: Make sure to keep your bot token secure and never commit it to version control!
