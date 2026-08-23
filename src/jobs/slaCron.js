const SLAService = require('../services/slaService');

class SLACronJob {
  static initialize() {
    // Check SLAs every 1 minute for near real-time accuracy
    setInterval(async () => {
      try {
        await SLAService.checkAllSLAs();
      } catch (error) {
        console.error('SLA check failed:', error.message);
      }
    }, 1 * 60 * 1000); // Changed from 15 minutes to 1 minute

    // Check deadlines every hour
    setInterval(async () => {
      try {
        await SLAService.checkDeadlines();
      } catch (error) {
        console.error('Deadline check failed:', error.message);
      }
    }, 60 * 60 * 1000);

    console.log('✅ SLA monitoring initialized (SLA: 1min, Deadlines: 60min)');
  }
}

module.exports = SLACronJob;