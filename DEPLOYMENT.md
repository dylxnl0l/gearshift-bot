# 🚀 Discord Bot Deployment Guide

## Environment Variables Setup

Your Discord bot requires the following environment variables to run properly:

### Required Variables
```bash
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_guild_id_here
LOGS_CHANNEL_ID=your_logs_channel_id_here
TICKETS_CHANNEL_ID=your_tickets_channel_id_here
MODERATOR_ROLE_ID=your_moderator_role_id_here
ADMIN_ROLE_ID=your_admin_role_id_here
OWNER_ROLE_ID=your_owner_role_id_here
DEVELOPER_USER_ID=your_user_id_here
```

### Optional Variables
```bash
MAX_QUEUE_SIZE=50
DEFAULT_VOLUME=0.5
```

## How to Get These Values

### 1. Discord Bot Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to "Bot" section
4. Click "Reset Token" and copy the token

### 2. Client ID (Application ID)
1. In the same Discord Developer Portal
2. Go to "General Information"
3. Copy the "Application ID"

### 3. Guild ID (Server ID)
1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click your server name
3. Click "Copy ID"

### 4. Channel IDs
1. Right-click on the channel
2. Click "Copy ID"

### 5. Role IDs
1. Right-click on the role in server settings
2. Click "Copy ID"

### 6. User ID
1. Right-click on your username
2. Click "Copy ID"

## Hosting Platform Setup

### For Pterodactyl Panel
1. Set environment variables in the panel
2. Upload your bot files
3. Install dependencies: `npm install`
4. Start the bot: `npm start`

### For Railway/Heroku/Vercel
1. Set environment variables in the platform dashboard
2. Connect your GitHub repository
3. Deploy automatically

## Troubleshooting

### "Cannot find module './config.json'" Error
This error occurs when the bot can't find the config file. The bot now automatically uses environment variables in production. Make sure all required environment variables are set.

### Bot Not Responding
1. Check if the bot token is correct
2. Verify the bot has proper permissions in your server
3. Check the console for error messages

### Commands Not Working
1. Make sure to deploy slash commands: `node deploy-commands.js`
2. Check if the bot has the required permissions
3. Verify the guild ID is correct

## Security Notes

- Never commit your `.env` file or `config.json` with real tokens
- Use environment variables in production
- Keep your bot token secret
- Regularly rotate your bot token if compromised
