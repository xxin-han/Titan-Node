require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { HttpsProxyAgent } = require('https-proxy-agent');
const randomUseragent = require('random-useragent');

const refreshToken = process.env.REFRESH_TOKEN;

// 🎨 Logger warna-warni
const colors = {
    reset: "\x1b[0m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    white: "\x1b[37m",
    bold: "\x1b[1m",
    magenta: "\x1b[35m",
};

const logger = {
    info: (msg) => console.log(`${colors.cyan}[i] ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
    loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
    step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
    point: (msg) => console.log(`${colors.white}[💰] ${msg}${colors.reset}`),
    proxy: (msg) => console.log(`${colors.yellow}[🌐] ${msg}${colors.reset}`),
    reconnect: (msg) => console.log(`${colors.magenta}[🔁] ${msg}${colors.reset}`),
    banner: () => {
        console.log(`${colors.cyan}${colors.bold}`);
        console.log(`---------------------------------------------`);
        console.log(`   Titan Node Auto Bot - by. xXin98  `);
        console.log(`---------------------------------------------${colors.reset}`);
        console.log();
    },
};

// 🔍 Membaca proxy dari file proxies.txt
function readProxies() {
    const proxyFilePath = path.join(__dirname, 'proxies.txt');
    try {
        if (fs.existsSync(proxyFilePath)) {
            const proxies = fs.readFileSync(proxyFilePath, 'utf-8')
                .split('\n')
                .map(p => p.trim())
                .filter(p => p);
            return proxies;
        }
    } catch (error) {
        logger.error(`Error reading proxies.txt: ${error.message}`);
    }
    return [];
}

class TitanNode {
    constructor(refreshToken, proxy = null) {
        this.refreshToken = refreshToken;
        this.proxy = proxy;
        this.accessToken = null;
        this.userId = null;
        this.deviceId = uuidv4();
        this.ws = null;
        this.pingInterval = null;

        const agent = this.proxy ? new HttpsProxyAgent(this.proxy) : null;

        this.api = axios.create({
            httpsAgent: agent,
            headers: {
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Content-Type': 'application/json',
                'User-Agent': randomUseragent.getRandom(),
            }
        });
    }

    async refreshAccessToken() {
        logger.loading('Attempting to refresh access token...');
        try {
            const response = await this.api.post('https://task.titannet.info/api/auth/refresh-token', {
                refresh_token: this.refreshToken,
            });

            if (response.data && response.data.code === 0) {
                this.accessToken = response.data.data.access_token;
                this.userId = response.data.data.user_id;
                this.api.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
                logger.success('Access token refreshed successfully!');
                return true;
            } else {
                logger.error(`Failed to refresh token: ${response.data.msg || 'Unknown error'}`);
                return false;
            }
        } catch (error) {
            logger.error(`Error refreshing access token: ${error.message}`);
            return false;
        }
    }

    async registerNode() {
        logger.loading('Registering node...');
        try {
            const payload = {
                ext_version: "0.0.4",
                language: "en",
                user_script_enabled: true,
                device_id: this.deviceId,
                install_time: new Date().toISOString(),
            };
            const response = await this.api.post('https://task.titannet.info/api/webnodes/register', payload);

            if (response.data && response.data.code === 0) {
                logger.success('Node registered successfully.');
                logger.info(`Initial Points: ${JSON.stringify(response.data.data)}`);
            } else {
                logger.error(`Node registration failed: ${response.data.msg || 'Unknown error'}`);
            }
        } catch (error) {
            logger.error(`Error registering node: ${error.message}`);
        }
    }

    // ⚙️ Versi gabungan — Reconnect cepat + aman
    connectWebSocket() {
        logger.loading('Connecting to WebSocket...');
        const wsUrl = `wss://task.titannet.info/api/public/webnodes/ws?token=${this.accessToken}&device_id=${this.deviceId}`;
        const agent = this.proxy ? new HttpsProxyAgent(this.proxy) : null;

        this.ws = new WebSocket(wsUrl, {
            agent: agent,
            headers: { 'User-Agent': this.api.defaults.headers['User-Agent'] },
        });

        this.ws.on('open', () => {
            logger.success('WebSocket connection established ✅');
            clearInterval(this.pingInterval);
            this.pingInterval = setInterval(() => {
                if (this.ws.readyState === WebSocket.OPEN) {
                    const echoMessage = JSON.stringify({
                        cmd: 1,
                        echo: "echo me",
                        jobReport: { cfgcnt: 2, jobcnt: 0 }
                    });
                    this.ws.send(echoMessage);
                }
            }, 30 * 1000);
        });

        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                if (message.cmd === 1) {
                    const response = { cmd: 2, echo: message.echo };
                    this.ws.send(JSON.stringify(response));
                }
                if (message.userDataUpdate) {
                    logger.point(`Points Update - Today: ${message.userDataUpdate.today_points}, Total: ${message.userDataUpdate.total_points}`);
                }
            } catch {
                logger.warn(`Could not parse message: ${data}`);
            }
        });

        this.ws.on('error', (error) => {
            logger.error(`WebSocket error: ${error.message}`);
            this.ws.close();
        });

        // 🧰 Reconnect cepat & aman
        this.ws.on('close', async () => {
            clearInterval(this.pingInterval);
            logger.warn('WebSocket closed. Trying fast reconnect...');

            for (let delay = 5; delay <= 60; delay *= 2) {
                logger.reconnect(`Reconnecting in ${delay}s...`);
                await new Promise(r => setTimeout(r, delay * 1000));
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    logger.reconnect('Reconnected successfully.');
                    this.connectWebSocket();
                    return;
                }
            }

            logger.error('⚠️ All reconnect attempts failed. Restarting bot...');
            this.start(); // fallback terakhir
        });
    }

    async start() {
        logger.banner();
        if (this.proxy) {
            logger.proxy(`Using Proxy: ${this.proxy}`);
        } else {
            logger.proxy('Running in Direct Mode (No Proxy)');
        }
        logger.step(`Using Device ID: ${this.deviceId}`);

        const tokenRefreshed = await this.refreshAccessToken();
        if (tokenRefreshed) {
            await this.registerNode();
            this.connectWebSocket();
        } else {
            logger.error('Could not start bot due to token refresh failure.');
        }
    }
}

// 🚀 Main function
function main() {
    if (!refreshToken) {
        logger.error('Error: REFRESH_TOKEN is not set in the .env file.');
        logger.warn('Please create a .env file and add your REFRESH_TOKEN to it.');
        return;
    }

    const proxies = readProxies();

    if (proxies.length > 0) {
        logger.info(`Found ${proxies.length} proxies. Starting a bot for each one.`);
        proxies.forEach((proxy, index) => {
            setTimeout(() => {
                const bot = new TitanNode(refreshToken, proxy);
                bot.start();
            }, index * 10000);
        });
    } else {
        logger.info('No proxies found in proxies.txt. Running in direct mode.');
        const bot = new TitanNode(refreshToken);
        bot.start();
    }
}

main();
