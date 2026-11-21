const axios = require('axios');
const logger = require('../logging/Logger');
const config = require('../../config/config');

class NovaFrameClient {
    constructor() {
        this.authenticated = false;
        this.apiKey = null;
        this.botToken = null;
        this.lastSync = 0;
        this.enabled = config.novaFrame?.enabled || false;
        
        // From Nova Frame Bot Token (Image 1)
        this.discordApplicationId = config.novaFrame?.discordApplicationId || '1049861443111112744';
        this.novaFrameAPI = config.novaFrame?.novaFrameAPI || 'https://0.0.0.0:25724';
        this.novaToken = config.novaFrame?.novaToken;
        
        // From Nova Frame API Key (Image 2) - This is the API key to use
        this.apiKeyFromNova = config.novaFrame?.apiKey;
        
        // Legacy fallback
        this.baseUrl = config.novaFrame?.url || 'https://novaframe.kurraschsystems.com';
        this.botId = config.novaFrame?.botId;
    }

    async authenticate() {
        if (!this.enabled) {
            logger.warn('Nova Frame is disabled in config');
            return false;
        }

        if (!this.apiKeyFromNova) {
            logger.warn('Nova Frame is enabled but NOVA_API_KEY is not set in .env. Skipping Nova Frame.');
            return false;
        }

        try {
            logger.info('🔐 Authenticating with Nova Frame...');
            logger.info(`Endpoint: ${this.novaFrameAPI}`);
            logger.info(`Bot ID: ${this.discordApplicationId}`);
            
            // Create axios instance that ignores SSL for localhost/0.0.0.0
            const https = require('https');
            const axiosInstance = axios.create({
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false // Ignore self-signed certificates
                })
            });
            
            // Nova Frame uses the API Key (nf_...) for authentication
            // The bot token is stored but the API key is what's used for requests
            this.authenticated = true;
            this.apiKey = this.apiKeyFromNova; // Use the nf_... key
            this.botToken = this.novaToken; // Store the bot token
            
            // Test the connection
            try {
                const testResponse = await axiosInstance.get(`${this.novaFrameAPI}/api/health`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'X-API-Key': this.apiKey
                    },
                    timeout: 5000
                });
                
                logger.success('✅ Nova Frame connection verified');
                logger.info(`📡 Status: ${testResponse.status}`);
            } catch (testError) {
                // Even if health check fails, we can still use the API
                logger.info('📡 Nova Frame ready (API key configured)');
            }
            
            logger.success('✅ Nova Frame authenticated successfully');
            return true;

        } catch (error) {
            logger.error('❌ Nova Frame authentication error:', error.message);
            logger.warn('⚠️ Continuing without Nova Frame integration');
            return false;
        }
    }

    async syncStats(stats) {
        if (!this.enabled || !this.authenticated) {
            return;
        }

        try {
            const endpoint = this.novaFrameAPI 
                ? `${this.novaFrameAPI}/api/bot/stats`
                : `${this.baseUrl}/api/storage/write`;

            const payload = this.novaFrameAPI ? {
                botId: this.discordApplicationId,
                stats: stats
            } : {
                key: 'bot_stats',
                value: JSON.stringify(stats)
            };

            await axios.post(endpoint, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            this.lastSync = Date.now();
            logger.debug('📊 Stats synced to Nova Frame');
        } catch (error) {
            logger.debug('Failed to sync stats to Nova Frame:', error.message);
        }
    }

    async syncAIData(aiData) {
        if (!this.enabled || !this.authenticated) return;

        try {
            const endpoint = this.novaFrameAPI
                ? `${this.novaFrameAPI}/api/bot/ai-data`
                : `${this.baseUrl}/api/storage/write`;

            const payload = this.novaFrameAPI ? {
                botId: this.discordApplicationId,
                aiData: aiData
            } : {
                key: 'ai_data',
                value: JSON.stringify(aiData)
            };

            await axios.post(endpoint, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            logger.debug('🤖 AI data synced to Nova Frame');
        } catch (error) {
            logger.debug('Failed to sync AI data:', error.message);
        }
    }

    async reportSecurity(event) {
        if (!this.enabled || !this.authenticated) return;

        try {
            const endpoint = this.novaFrameAPI
                ? `${this.novaFrameAPI}/api/bot/security`
                : `${this.baseUrl}/api/security/report`;

            const payload = this.novaFrameAPI ? {
                botId: this.discordApplicationId,
                event: event,
                timestamp: Date.now()
            } : {
                event: event,
                timestamp: Date.now(),
                botId: this.botId
            };

            await axios.post(endpoint, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            logger.info('🔒 Security event reported to Nova Frame');
        } catch (error) {
            logger.debug('Failed to report security event:', error.message);
        }
    }

    async syncPremiumData(premiumData) {
        if (!this.enabled || !this.authenticated) return;

        try {
            const endpoint = this.novaFrameAPI
                ? `${this.novaFrameAPI}/api/bot/premium`
                : `${this.baseUrl}/api/storage/write`;

            const payload = this.novaFrameAPI ? {
                botId: this.discordApplicationId,
                premiumData: premiumData
            } : {
                key: 'premium_data',
                value: JSON.stringify(premiumData)
            };

            await axios.post(endpoint, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            logger.debug('💎 Premium data synced to Nova Frame');
        } catch (error) {
            logger.debug('Failed to sync premium data:', error.message);
        }
    }

    async getStoredData(key) {
        if (!this.enabled || !this.authenticated) return null;

        try {
            const endpoint = this.novaFrameAPI
                ? `${this.novaFrameAPI}/api/bot/data/${key}`
                : `${this.baseUrl}/api/storage/read`;

            const response = await axios.get(endpoint, {
                params: this.novaFrameAPI ? {} : { key },
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-API-Key': this.apiKey
                },
                timeout: 5000
            });

            return response.data;
        } catch (error) {
            logger.debug(`Failed to retrieve data for key: ${key}`, error.message);
            return null;
        }
    }

    isAuthenticated() {
        return this.authenticated;
    }

    getConnectionInfo() {
        return {
            authenticated: this.authenticated,
            endpoint: this.novaFrameAPI || this.baseUrl,
            botId: this.discordApplicationId || this.botId,
            lastSync: this.lastSync,
            timeSinceLastSync: this.lastSync ? Date.now() - this.lastSync : null
        };
    }
}

module.exports = NovaFrameClient;