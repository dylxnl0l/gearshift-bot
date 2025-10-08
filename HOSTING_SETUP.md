# 🚀 Hosting Setup Guide

## For Local Testing (Right Now)
I've created a `config.json` file for you. You can now test the bot locally:

```bash
npm start
```

## For Production Hosting

### **Pterodactyl Panel:**
1. Go to your server dashboard
2. Click "Startup" or "Environment Variables"
3. Add these variables one by one:

| Variable Name | Variable Value |
|---------------|----------------|
| `DISCORD_TOKEN` | `YOUR_BOT_TOKEN_HERE` |
| `CLIENT_ID` | `1424490534491127993` |
| `GUILD_ID` | `1407091501850431708` |
| `LOGS_CHANNEL_ID` | `1425322663836127263` |
| `TICKETS_CHANNEL_ID` | `1407498823298842685` |
| `MODERATOR_ROLE_ID` | `1421279984634560622` |
| `ADMIN_ROLE_ID` | `1407192703019516091` |
| `OWNER_ROLE_ID` | `1407091540752466051` |
| `DEVELOPER_USER_ID` | `698234989560725575` |
| `MAX_QUEUE_SIZE` | `50` |
| `DEFAULT_VOLUME` | `0.5` |

4. Save and restart the server

### **Railway:**
1. Go to your project dashboard
2. Click "Variables" tab
3. Add each variable with the name and value from the table above

### **Heroku:**
1. Go to your app dashboard
2. Click "Settings" → "Config Vars"
3. Add each variable with the name and value from the table above

### **Vercel:**
1. Go to your project dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable with the name and value from the table above

## After Setting Variables

1. **Restart your server/hosting service**
2. **Check the logs** - you should see the bot start successfully
3. **Test with `/ping`** in your Discord server
4. **Setup tickets** with `/ticket setup`
5. **Configure settings** with `/settings`

## Troubleshooting

- **Still getting config error?** Make sure all variables are set correctly
- **Bot not responding?** Check if the bot token is correct
- **Commands not working?** Run `node deploy-commands.js` to register slash commands
