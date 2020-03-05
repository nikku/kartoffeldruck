#!/usr/bin/env node

var Kartoffeldruck = require('../');

var argv = process.argv;

if (argv[2] === '--help') {
  console.log('generate a static site using the ancient kartoffeldruck principles');
  process.exit(0);
}

if (process.argv.length > 2) {
  console.error('no arguments required');
  process.exit(1);
}

Kartoffeldruck.run({ logger: console }).catch((err) => {
  console.error(err);
  process.exit(1);
});