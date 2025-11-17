/**
 * Simple wrapper for ng serve that adds history API fallback
 * This ensures that direct URL navigation works properly
 */

const { spawn } = require('child_process');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

// Start the Angular dev server
const ngServe = spawn('ng', ['serve', '--proxy-config', 'proxy.conf.js'], {
  stdio: 'inherit',
  shell: true
});

ngServe.on('close', (code: number) => {
  process.exit(code);
});
