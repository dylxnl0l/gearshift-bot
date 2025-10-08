# 🚀 Quick Setup Guide

## Your Bot Information

### Discord Token
```
YOUR_BOT_TOKEN_HERE
```

### Client ID (Application ID)
```
1424490534491127993
```

### Guild ID (Server ID)
**To get this:**
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your server name
3. Click "Copy ID"

## Environment Variables for Hosting

Set these in your hosting panel:

```bash
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
CLIENT_ID=1424490534491127993
GUILD_ID=your_server_id_here
LOGS_CHANNEL_ID=your_logs_channel_id_here
TICKETS_CHANNEL_ID=your_tickets_channel_id_here
MODERATOR_ROLE_ID=your_moderator_role_id_here
ADMIN_ROLE_ID=your_admin_role_id_here
OWNER_ROLE_ID=your_owner_role_id_here
DEVELOPER_USER_ID=your_user_id_here
```

## How to Get Channel and Role IDs

### Channel IDs
1. Right-click on any channel
2. Click "Copy ID"

### Role IDs
1. Go to Server Settings → Roles
2. Right-click on any role
3. Click "Copy ID"

### User ID
1. Right-click on your username
2. Click "Copy ID"

## Ticket System Features

✅ **Automatic Category Creation** - Creates "Tickets" category if it doesn't exist
✅ **Numbered Tickets** - Creates channels like "ticket-01", "ticket-02", etc.
✅ **User Tracking** - Each ticket tracks the user who created it
✅ **Private Channels** - Only the user and staff can see tickets
✅ **Automatic Cleanup** - Tickets are deleted after closing

## After Setup

1. Deploy your bot with the environment variables
2. Run `/ticket setup` in your server
3. Users can click the "🎫 Create Ticket" button to create tickets
4. Staff can manage tickets with the interactive buttons
