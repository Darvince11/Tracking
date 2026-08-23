const SLAService = require('../services/slaService');

class SLACronJob {
  static initialize() {
    if (this.initialized) return;
    this.initialized = true;
    this.running = false;

    const runChecks = async () => {
      if (this.running) {
        console.warn('SLA check skipped because the previous run is still active');
        return;
      }
      this.running = true;
      try {
        await SLAService.runNotificationChecks();
      } catch (error) {
        console.error('SLA notification check failed:', error);
      } finally {
        this.running = false;
      }
    };

    void runChecks();
    this.timer = setInterval(runChecks, 5 * 60 * 1000);
    console.log('SLA monitoring initialized (startup + every 5 minutes)');
  }
}

module.exports = SLACronJob;
