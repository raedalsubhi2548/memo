// Loaded with node --import before the prerender, so React's production build is used on any OS (no NODE_ENV=… shell syntax).
process.env.NODE_ENV = 'production'
