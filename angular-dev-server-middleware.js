/**
 * Express middleware plugin for Angular dev-server
 * Handles History API fallback for client-side routing
 * 
 * This ensures that direct URL navigation to routes like /auth/login
 * returns index.html so Angular can handle the routing
 */

module.exports = (req, res, next) => {
  // List of paths that should NOT fallback to index.html
  const filePaths = [
    '.js',
    '.css', 
    '.png',
    '.jpg',
    '.gif',
    '.svg',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.json',
    '.map'
  ];

  // Check if the request is for a static file
  const isStaticFile = filePaths.some(ext => req.url.includes(ext));
  
  // Check if the request is for an API/proxy endpoint
  const isApiRequest = req.url.startsWith('/api') || req.url.startsWith('/auth');
  
  // Check if the request is for assets
  const isAssetRequest = req.url.startsWith('/assets');

  // If it's a static file, API request, or asset, let it pass through
  if (isStaticFile || isApiRequest || isAssetRequest) {
    next();
    return;
  }

  // For all other requests (routes), serve index.html
  // This allows Angular's router to handle the navigation
  req.url = '/index.html';
  next();
};
