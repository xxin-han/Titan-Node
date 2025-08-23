# Titan-Node

**Titan Node Auto Bot** is an automated bot designed to connect to the Titan Network node extension and continuously earn points (TNTIP) on your behalf. Built with Node.js, this bot supports proxy usage and is designed to run 24/7.
## Features

- Secure: Safely stores your refresh token in a .env file.
- Supports HTTP and SOCKS Proxy 
- Auto ping 

## Installation

1. Register [Titan-Node](https://edge.titannet.info/signup?inviteCode=UQD2W6FP)

2. Install Tools.
   ```bash
   wget https://github.com/xxin-han/Blockcast/raw/main/Auto_Setup.sh -O setup.sh && chmod +x setup.sh && ./setup.sh
   ```
3. Clone this repository:
   ```bash
   git clone https://github.com/xxin-han/Titan-Node
   ```
4. Navigate to the project directory:
   ```bash
   cd Titan-Node
   ```
5. Install the required dependencies:
   ```bash
   npm install
   ```
6. Fill the your bearer token
   ```bash
   nano .env
   ```
  - Format .env 
   ```bash
   REFRESH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

7. Fill proxy list on proxy.txt if you using a proxy then save it ctrl + x + y + enter
   ```bash
   nano proxies.txt
   ```
7. run bot
   ```bash
   npm start
   ```
   or
   ```bash
   pm2 start index.js --name ewe
   ```
   
9. Stop bot
   ```CTRL + C``` or ```using pm2 command```


## pm2 Command

```
## 📊 Monitoring & Logs

- List all processes:
pm2 ls

- View logs for a specific account:
pm2 logs acc1

## ⚡ Start / Restart / Stop / Delete

- Start one account:
pm2 start acc1/index.js --name acc1

- Restart one account:
pm2 restart acc3

- Stop one account:
pm2 stop acc5

- Remove one account from PM2:
pm2 delete acc7
```
   
