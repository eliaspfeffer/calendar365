#!/usr/bin/env node

/**
 * Postinstall script for calendar365
 * Shows a welcome message after installation
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   📅  calendar365 installed successfully!                     ║
║                                                               ║
║   Get started:                                                ║
║     calendar365              Start the calendar server        ║
║     calendar365 --help       Show all commands                ║
║     calendar365 --open       Start & open in browser          ║
║                                                               ║
║   Default port: 3650                                          ║
║   Change with: calendar365 -p 8080                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

