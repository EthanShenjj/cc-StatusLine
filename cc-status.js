#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Using CC-StatusLine for storage paths as well
const CONFIG_PATH = path.join(os.homedir(), '.CC-StatusLine-config.json');
const CACHE_PATH = path.join(os.homedir(), '.CC-StatusLine-cache.json');
const CACHE_TTL = 600 * 1000; // 10 minutes

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
    if (!config.url) {
      reject(new Error('API URL is not configured. Run "node cc-status.js setup" first.'));
      return;
    }
    const url = new URL(config.url);
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


async function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve(null);
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf8');
    const timeout = setTimeout(() => {
      resolve(null);
    }, 100); // Short timeout for non-piped usage

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        resolve(null);
      }
    });

    process.stdin.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

async function getStatus() {
  const config = readConfig();
  if (!config || !config.token || !config.url) {
    process.stdout.write(`${COLORS.yellow}[CC-StatusLine] run 'setup' to configure token and url${COLORS.reset}\n`);
    return;
  }

  const stdinPromise = readStdin();

  let cache = null;
  if (fs.existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    } catch (e) {}
  }

  let apiData = null;
  let isStale = false;

  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    apiData = cache.data;
  } else {
    try {
      const response = await fetchStatus(config);
      if (response.code === 0 && response.data) {
        apiData = response.data;
        fs.writeFileSync(CACHE_PATH, JSON.stringify({
          timestamp: Date.now(),
          data: apiData
        }));
      } else if (cache) {
        apiData = cache.data;
        isStale = true;
      }
    } catch (e) {
      if (cache) {
        apiData = cache.data;
        isStale = true;
      }
    }
  }

  const sessionData = await stdinPromise;
  render(apiData, sessionData, isStale);
}

function getGhost(percent) {
  const buddyBase = '\x1b[38;5;242m'; // Dark Gray
  const reset = COLORS.reset;
  
  let eyes = '·   ·';
  if (percent >= 95) eyes = '╥   ╥';
  else if (percent >= 80) eyes = '；· ·';
  else if (percent >= 50) eyes = '・   ・';

  const body = [
    `   .---.   `,
    ` /  ${eyes}  \\ `,
    ` ~ ~ ~ ~   `
  ];

  return body.map(line => `${buddyBase}${line}${reset}`);
}

function render(apiData, sessionData = null, isStale = false) {
  if (!apiData) {
    process.stdout.write(`${COLORS.red}[CC-StatusLine] No usage data available${COLORS.reset}\n`);
    return;
  }

  const { total_used, total_available, total_granted } = apiData;
  const usedPercent = total_granted > 0 ? ((total_used / total_granted) * 100).toFixed(1) : '0';
  const balance = ((total_available / 1000000) * 2).toFixed(2);

  let budgetColor = COLORS.green;
  if (usedPercent > 80) budgetColor = COLORS.yellow;
  if (usedPercent > 95) budgetColor = COLORS.red;

  const staleInfo = isStale ? ` ${COLORS.yellow}(stale)${COLORS.reset}` : '';

  let ctxPercentNum = 0;
  let sessionInfo = '';
  if (sessionData && sessionData.context_window) {
    const { total_input_tokens, total_output_tokens, context_window_size } = sessionData.context_window;
    const sessionUsed = (total_input_tokens || 0) + (total_output_tokens || 0);
    ctxPercentNum = context_window_size > 0 ? (sessionUsed / context_window_size) * 100 : 0;
    
    let ctxColor = COLORS.cyan;
    if (ctxPercentNum > 70) ctxColor = COLORS.yellow;
    if (ctxPercentNum > 90) ctxColor = COLORS.red;

    sessionInfo = `${COLORS.dim}Ctx:${COLORS.reset} ${ctxColor}${formatTokens(sessionUsed)}/${formatTokens(context_window_size)}${COLORS.reset}`;
  } else {
    sessionInfo = `${COLORS.dim}Ctx:${COLORS.reset} ${COLORS.green}No Session${COLORS.reset}`;
  }

  const ghostLines = getGhost(ctxPercentNum);

  // Consolidated single line for status data
  const statusLine = `${sessionInfo}${staleInfo} ${COLORS.magenta}|${COLORS.reset} ` +
                     `${COLORS.dim}Used:${COLORS.reset} ${budgetColor}${formatTokens(total_used)}${COLORS.reset} ${COLORS.magenta}|${COLORS.reset} ` +
                     `${COLORS.dim}Avail:${COLORS.reset} ${COLORS.green}${formatTokens(total_available)}${COLORS.reset} ` +
                     `${COLORS.dim}($${balance})${COLORS.reset}`;

  // Strip ANSI codes to calculate visible length for padding
  const visibleLength = statusLine.replace(/\x1b\[[0-9;]*m/g, '').length;
  const padding = ' '.repeat(visibleLength);

  // Output 3 lines: Ghost on the right, status text on middle line
  process.stdout.write(`${padding}  ${ghostLines[0]}\n`);
  process.stdout.write(`${statusLine}  ${ghostLines[1]}\n`);
  process.stdout.write(`${padding}  ${ghostLines[2]}\n`);
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
  
  const url = await ask(`Enter API URL ${config.url ? `(current: ${config.url})` : ''}: `);
  if (url) {
    config.url = url;
  }

  if (config.token && config.url) {
    writeConfig(config);
    console.log(`\n${COLORS.green}✓ Configuration saved to ${CONFIG_PATH}${COLORS.reset}`);
    if (fs.existsSync(CACHE_PATH)) fs.unlinkSync(CACHE_PATH);
    console.log(`${COLORS.dim}Testing connection...${COLORS.reset}`);
    try {
      const test = await fetchStatus(config);
      if (test.code) {
        console.log(`${COLORS.green}✓ Success! Welcome, ${test.data.name}.${COLORS.reset}\n`);
      } else {
        console.log(`${COLORS.red}✗ API Error: ${test.message || 'Unknown'}${COLORS.reset}\n`);
      }
    } catch (e) {
      console.log(`${COLORS.yellow}! Saved, but connection failed: ${e.message}${COLORS.reset}\n`);
    }
  } else {
    console.log(`${COLORS.red}Error: Both Token and URL are required for setup.${COLORS.reset}\n`);
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
