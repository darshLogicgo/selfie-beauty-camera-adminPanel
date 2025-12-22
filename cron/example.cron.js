import moment from "moment";
import { agenda } from "../config/agenda.js";
import { cronNameEnum } from "../config/enum.config.js";
import { logger } from "../config/logger.config.js";

// Example cron job function
export const runExampleCron = async () => {
  logger.info("CRON START >> Example cron job");
  
  try {
    // Add your cron job logic here
    logger.info(`Example cron job executed at: ${moment().format("YYYY-MM-DD HH:mm:ss")}`);
    
    logger.info("CRON COMPLETE >> Example cron job");
    return { success: true, message: "Example cron job completed" };
  } catch (error) {
    logger.error("Error in example cron job:", error);
    return { success: false, error: error.message };
  }
};

// Define the cron job with agenda
agenda.define(cronNameEnum.EXAMPLE_CRON, async () => {
  try {
    await runExampleCron();
  } catch (error) {
    logger.error("Error executing example cron:", error);
  }
});

