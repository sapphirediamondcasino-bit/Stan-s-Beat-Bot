require('dotenv').config();

module.exports = {
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID
    },
    youtube: {
        apiKey: process.env.YOUTUBE_API_KEY
    },
    database: {
        url: process.env.DATABASE_URL || './data/bot.db'
    },
    premium: {
        paypal: {
            clientId: process.env.PAYPAL_CLIENT_ID,
            secret: process.env.PAYPAL_SECRET
        },
        prices: {
            monthly: parseFloat(process.env.PREMIUM_PRICE_MONTHLY) || 4.99,
            yearly: parseFloat(process.env.PREMIUM_PRICE_YEARLY) || 49.99
        }
    },
    api: {
        enabled: process.env.API_ENABLED === 'true',
        port: parseInt(process.env.API_PORT) || 3001,
        httpsPort: parseInt(process.env.API_HTTPS_PORT) || 443,
        host: process.env.API_HOST || '0.0.0.0',
        secret: process.env.API_SECRET
    },
    novaFrame: {
        enabled: process.env.NOVA_FRAME_ENABLED === 'true',
        
        // NEW Nova Frame API Settings (from your screenshots)
        // From Image 2 (API Key Generated) - This is the main API key
        apiKey: process.env.NOVA_API_KEY,
        
        // From Image 1 (Bot Token Generated)
        novaFrameAPI: process.env.NOVA_FRAME_API || 'https://0.0.0.0:25724',
        novaToken: process.env.NOVA_TOKEN,
        discordApplicationId: process.env.DISCORD_APPLICATION_ID || '1049861443111112744',
        
        // Legacy settings (kept for backward compatibility)
        url: process.env.NOVA_FRAME_URL || 'https://novaframe.kurraschsystems.com',
        botId: process.env.NOVA_FRAME_BOT_ID,
        token: process.env.NOVA_FRAME_TOKEN,
        
        syncInterval: 300000 // 5 minutes
    },
    kurrasch: {
        siteUrl: process.env.KURRASCH_SITE_URL || 'https://kurraschsystems.com',
        supportServer: process.env.SUPPORT_SERVER_INVITE
    },
    bot: {
        defaultVolume: parseInt(process.env.DEFAULT_VOLUME) || 50,
        maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE) || 100,
        maxQueueSizePremium: parseInt(process.env.MAX_QUEUE_SIZE_PREMIUM) || 500,
        bitrate: parseInt(process.env.BITRATE) || 320
    },
    botOwnerId: process.env.BOT_OWNER_ID // For premium manager
};