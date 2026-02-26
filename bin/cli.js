#!/usr/bin/env node

import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function printHelp() {
  console.log(`
📅 calendar365 - A year-at-a-glance planner

Usage:
  calendar365 [command] [options]

Commands:
  start, serve    Start the calendar server (default)
  dev             Start development server with hot reload
  build           Build for production
  help            Show this help message

Options:
  -p, --port <port>    Port to run the server on (default: 3650)
  -h, --host <host>    Host to bind to (default: localhost)
  --open               Open browser automatically
  -v, --version        Show version number

Examples:
  calendar365                    # Start server on port 3650
  calendar365 start -p 8080      # Start server on port 8080
  calendar365 --open             # Start and open in browser
  calendar365 dev                # Start dev server with hot reload
`);
}

function printVersion() {
  try {
    const packagePath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    console.log(`calendar365 v${pkg.version}`);
  } catch {
    console.log('calendar365 v1.0.0');
  }
}

function parseArgs(args) {
  const options = {
    command: 'start',
    port: parseInt(process.env.CALENDAR365_PORT, 10) || 3650,
    host: process.env.CALENDAR365_HOST || 'localhost',
    open: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === 'start' || arg === 'serve' || arg === 'dev' || arg === 'build' || arg === 'help') {
      options.command = arg;
    } else if (arg === '-p' || arg === '--port') {
      options.port = parseInt(args[++i], 10);
    } else if (arg === '-h' || arg === '--host') {
      options.host = args[++i];
    } else if (arg === '--open') {
      options.open = true;
    } else if (arg === '-v' || arg === '--version') {
      printVersion();
      process.exit(0);
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function openBrowser(url) {
  const platform = process.platform;
  let command;
  
  if (platform === 'darwin') {
    command = 'open';
  } else if (platform === 'win32') {
    command = 'start';
  } else {
    command = 'xdg-open';
  }

  spawn(command, [url], { detached: true, stdio: 'ignore' }).unref();
}

function findDistDir() {
  // Check multiple possible locations
  const possiblePaths = [
    join(__dirname, '..', 'dist'),
    join(__dirname, '..', '..', 'dist'),
    join(process.cwd(), 'dist'),
    join(process.cwd(), 'node_modules', 'calendar365', 'dist'),
  ];

  for (const p of possiblePaths) {
    if (existsSync(p) && existsSync(join(p, 'index.html'))) {
      return p;
    }
  }

  return null;
}

function startServer(options) {
  const distDir = findDistDir();

  if (!distDir) {
    console.error(`
❌ Error: Built files not found!

The calendar365 distribution files are missing. This can happen if:
1. The package wasn't built yet
2. The package was installed incorrectly

Try running:
  cd ${join(__dirname, '..')} && npm run build

Or reinstall the package:
  npm install -g calendar365
`);
    process.exit(1);
  }

  console.log(`
📅 calendar365 - Year Calendar Planner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Starting server...
`);

  const server = createServer((req, res) => {
    let filePath = join(distDir, req.url === '/' ? 'index.html' : req.url);
    
    // Remove query strings
    filePath = filePath.split('?')[0];

    // Check if file exists
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      // For SPA routing, serve index.html for non-file requests
      if (!extname(filePath) || !existsSync(filePath)) {
        filePath = join(distDir, 'index.html');
      }
    }

    try {
      const content = readFileSync(filePath);
      const mimeType = getMimeType(filePath);
      
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'max-age=31536000',
      });
      res.end(content);
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });

  server.listen(options.port, options.host, () => {
    const url = `http://${options.host}:${options.port}`;
    
    console.log(`  🌐 Local:   ${url}`);
    if (options.host === '0.0.0.0') {
      console.log(`  🌍 Network: http://<your-ip>:${options.port}`);
    }
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Controls:
  • Pinch/scroll to zoom
  • Drag to pan
  • Click a day to add notes

Press Ctrl+C to stop the server.
`);

    if (options.open) {
      openBrowser(url);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${options.port} is already in use. Try a different port with -p <port>`);
    } else {
      console.error(`❌ Server error: ${err.message}`);
    }
    process.exit(1);
  });
}

function runDev(options) {
  console.log('Starting development server...\n');
  
  const packageDir = join(__dirname, '..');
  const vite = spawn('npx', ['vite', '--port', options.port.toString(), '--host', options.host], {
    cwd: packageDir,
    stdio: 'inherit',
    shell: true,
  });

  vite.on('error', (err) => {
    console.error(`❌ Failed to start dev server: ${err.message}`);
    console.error('Make sure you have the package source and dependencies installed.');
    process.exit(1);
  });
}

function runBuild() {
  console.log('Building calendar365...\n');
  
  const packageDir = join(__dirname, '..');
  const build = spawn('npx', ['vite', 'build'], {
    cwd: packageDir,
    stdio: 'inherit',
    shell: true,
  });

  build.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Build complete! Run `calendar365` to start the server.');
    } else {
      console.error('\n❌ Build failed.');
      process.exit(code);
    }
  });
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'start' || args[0] === 'serve' || args[0].startsWith('-')) {
  const options = parseArgs(args);
  startServer(options);
} else if (args[0] === 'dev') {
  const options = parseArgs(args);
  runDev(options);
} else if (args[0] === 'build') {
  runBuild();
} else if (args[0] === 'help' || args[0] === '--help') {
  printHelp();
} else {
  console.error(`Unknown command: ${args[0]}`);
  printHelp();
  process.exit(1);
}

