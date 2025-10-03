import { glob } from 'glob';
import path from 'path';

export async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        // Try to parse as JSON
        if (req.headers['content-type']?.includes('application/json')) {
          resolve(JSON.parse(body));
        } else {
          resolve(body);
        }
      } catch (e) {
        reject(e);
      }
    });
    
    req.on('error', reject);
  });
}

export default {
  name: 'file-based-api-routes',
  async configureServer(server) {
    const apiFiles = glob.sync('api/**/*.{js,ts}');
    const routes = [];

    for (const file of apiFiles) {
      const routePath = '/' + file
        .replace(/\.(js|ts)$/, '')
        .replace(/\[([^\]]+)\]/g, ':$1')
        .replace(/\/index$/, '');

      routes.push({ path: routePath, file: '/' + file });
    }

    server.middlewares.use(async (req, res, next) => {
      const urlPath = req.url.split('?')[0];
      const urlParts = urlPath.split('/').filter(Boolean);

      for (const route of routes) {
        const pattern = route.path.split('/').filter(Boolean);
        
        if (urlParts.length !== pattern.length) continue;

        const params = {};
        let matches = true;

        for (let i = 0; i < pattern.length; i++) {
          if (pattern[i].startsWith(':')) {
            params[pattern[i].slice(1)] = urlParts[i];
          } else if (pattern[i] !== urlParts[i]) {
            matches = false;
            break;
          }
        }

        if (matches) {
          try {
            // Vite's SSR module loader handles TypeScript
            const module = await server.ssrLoadModule(route.file);
            const handler = module.default || module.handler;

            if (typeof handler === 'function') {
              const url = new URL(req.url, `http://${req.headers.host}`);
              req.params = params;
              req.query = Object.fromEntries(url.searchParams);

              return handler(req, res, next);
            }
          } catch (error) {
            console.error(`Error loading ${route.file}:`, error);
            res.statusCode = 500;
            res.end('Internal Server Error');
            return;
          }
        }
      }

      next();
    });
  }
}
