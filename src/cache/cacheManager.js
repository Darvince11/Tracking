class CacheManager {
  constructor() {
    this.cache = new Map();
    this.isConnected = false;
  }

  async connect() {
    this.isConnected = true;
    console.log('Memory cache connected');
  }

  async get(key) {
    if (!this.isConnected) return null;
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ttl = 300) {
    if (!this.isConnected) return;
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttl * 1000)
    });
  }

  async del(key) {
    this.cache.delete(key);
  }

  async delPattern(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) this.cache.delete(key);
    }
  }
}

module.exports = new CacheManager();
