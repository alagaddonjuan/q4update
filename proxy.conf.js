const fs = require('fs');
const path = require('path');

/**
 * Custom middleware for History API fallback
 * Routes requests for Angular routes to index.html
 */
function historyApiFallback(req, res, next) {
  // List of file extensions to ignore
  const extensions = ['.js', '.css', '.png', '.jpg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map', '.ico'];
  
  // Check if URL is for a static file or API
  const isStaticFile = extensions.some(ext => req.url.includes(ext));
  const isApiCall = req.url.startsWith('/api') || req.url.startsWith('/auth');
  const isAsset = req.url.startsWith('/assets');
  const isExact = req.url === '/' || req.url === '/index.html';
  
  // If it's not a static file, API call, asset, or exact route, it's an Angular route
  if (!isStaticFile && !isApiCall && !isAsset && !isExact) {
    console.log(`[History API Fallback] Routing ${req.url} to index.html`);
    
    // Read index.html and serve it
    try {
      const indexPath = path.join(__dirname, 'dist/q4-web/browser/index.html');
      // For dev server, we just need to rewrite the path
      req.url = '/index.html';
    } catch (err) {
      console.error('Error in history API fallback:', err);
    }
  }
  
  next();
}

const PROXY_CONFIG = [
  {
    context: ['/api'],
    target: 'http://coms.q4globalltd.com',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    pathRewrite: {
      '^/api': ''
    },
    headers: {
      'Connection': 'keep-alive'
    },
    timeout: 30000
  }
];

// Add middleware to the proxy config for history API fallback
PROXY_CONFIG.middlewares = [historyApiFallback];

module.exports = PROXY_CONFIG;