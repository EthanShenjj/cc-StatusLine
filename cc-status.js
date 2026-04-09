#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Using CC-StatusLine for storage paths as well
const CONFIG_PATH = path.join(os.homedir(), '.CC-StatusLine-config.json');
const CACHE_PATH = path.join(os.homedir(), '.CC-StatusLine-cache.json');
const CACHE_TTL = 120 * 1000; // 2 minutes

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function formatTokens(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

async function fetchStatus(config) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.url || 'http://10.206.32.57:3003/api/usage/token/');
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/json'
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

async function getStatus() {
  const config = readConfig();
  if (!config || !config.token) {
    process.stdout.write(`${COLORS.yellow}[CC-StatusLine] run 'setup' to configure${COLORS.reset}\n`);
    return;
  }

  let cache = null;
  if (fs.existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      if (Date.now() - cache.timestamp < CACHE_TTL) {
        render(cache.data);
        return;
      }
    } catch (e) {}
  }

  try {
    const response = await fetchStatus(config);
    if (response.code && response.data) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify({
        timestamp: Date.now(),
        data: response.data
      }));
      render(response.data);
    } else {
      process.stdout.write(`${COLORS.red}[CC-StatusLine] API Error: ${response.message || 'Unknown'}${COLORS.reset}\n`);
    }
  } catch (e) {
    if (cache) {
      render(cache.data, true);
    } else {
      process.stdout.write(`${COLORS.red}[CC-StatusLine] Offline: ${e.message}${COLORS.reset}\n`);
    }
  }
}

function render(data, isStale = false) {
  const { total_used, total_available, total_granted } = data;
  const usedStr = formatTokens(total_used);
  const availStr = formatTokens(total_available);
  const grantedStr = formatTokens(total_granted);
  
  const percent = total_granted > 0 ? ((total_used / total_granted) * 100).toFixed(1) : '0';
  let percentColor = COLORS.green;
  if (percent > 80) percentColor = COLORS.yellow;
  if (percent > 95) percentColor = COLORS.red;

  const staleMark = isStale ? ` ${COLORS.yellow}(stale)${COLORS.reset}` : '';
  
  process.stdout.write(
    `${COLORS.dim}Usage:${COLORS.reset} ${percentColor}${usedStr}${COLORS.reset} / ${grantedStr} (${percentColor}${percent}%${COLORS.reset}) ` +
    `${COLORS.magenta}|${COLORS.reset} ` +
    `${COLORS.dim}Avail:${COLORS.reset} ${COLORS.green}${availStr}${COLORS.reset}${staleMark}\n`
  );
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function handleSetup() {
  console.log(`\n${COLORS.bold}${COLORS.cyan}=== CC-StatusLine Setup ===${COLORS.reset}\n`);
  
  const config = readConfig() || {};
  
  const token = await ask(`Enter your API Bearer Token ${config.token ? `(leave empty to keep current)` : ''}: `);
  if (token) config.token = token;
  
  const url = await ask(`Enter API URL ${config.url ? `(current: ${config.url})` : '(default: http://10.206.32.57:3003/api/usage/token/)'}: `);
  if (url) {
    config.url = url;
  } else if (!config.url) {
    config.url = 'http://10.206.32.57:3003/api/usage/token/';
  }

  if (config.token) {
    writeConfig(config);
    console.log(`\n${COLORS.green}✓ Configuration saved to ${CONFIG_PATH}${COLORS.reset}`);
    if (fs.existsSync(CACHE_PATH)) fs.unlinkSync(CACHE_PATH);
    console.log(`${COLORS.dim}Testing connection...${COLORS.reset}`);
    try {
      const test = await fetchStatus(config);
      if (test.code) {
        console.log(`${COLORS.green}✓ Success! Welcome, ${test.data.name}.${COLORS.reset}\n`);
      }
    } catch (e) {
      console.log(`${COLORS.yellow}! Saved, but connection failed: ${e.message}${COLORS.reset}\n`);
    }
  } else {
    console.log(`${COLORS.red}Error: Token is required for setup.${COLORS.reset}\n`);
  }
}

function handleConfig() {
  const args = process.argv.slice(3);
  const config = readConfig() || {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--token' && args[i + 1]) {
      config.token = args[i + 1];
      i++;
    } else if (args[i] === '--url' && args[i + 1]) {
      config.url = args[i + 1];
      i++;
    }
  }

  if (config.token) {
    writeConfig(config);
    console.log(`${COLORS.green}Configuration updated.${COLORS.reset}`);
    if (fs.existsSync(CACHE_PATH)) fs.unlinkSync(CACHE_PATH);
  } else {
    console.log(`Usage: node cc-status.js config --token <TOKEN> [--url <URL>]`);
  }
}

const command = process.argv[2];
if (command === 'setup' || command === 'install') {
  handleSetup();
} else if (command === 'config') {
  handleConfig();
} else {
  getStatus();
}
