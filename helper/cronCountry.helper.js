import moment from "moment-timezone";
import { logger } from "../config/logger.config.js";

// Country configuration with timezone and optimal notification time
export const COUNTRY_CONFIG = {
  India: {
    timezone: "Asia/Kolkata",
    targetTime: "20:30", // 8:30 PM
    targetHour: 20,
    targetMinute: 30,
  },
  USA: {
    timezone: "America/New_York", // Eastern Time
    targetTime: "21:00", // 9:00 PM
    targetHour: 21,
    targetMinute: 0,
  },
  Peru: {
    timezone: "America/Lima",
    targetTime: "20:30", // 8:30 PM
    targetHour: 20,
    targetMinute: 30,
  },
  "Saudi Arabia": {
    timezone: "Asia/Riyadh",
    targetTime: "21:00", // 9:00 PM
    targetHour: 21,
    targetMinute: 0,
  },
  Brazil: {
    timezone: "America/Sao_Paulo", // Brasília Time
    targetTime: "21:00", // 9:00 PM
    targetHour: 21,
    targetMinute: 0,
  },
};

/**
 * Check if current time in a timezone matches the target time window
 * @param {string} timezone - IANA timezone string
 * @param {number} targetHour - Target hour (0-23)
 * @param {number} targetMinute - Target minute (0-59)
 * @returns {boolean} - True if within notification window
 */
export const isInNotificationWindow = (timezone, targetHour, targetMinute) => {
  const now = moment.tz(timezone);
  const currentHour = now.hour();
  const currentMinute = now.minute();

  // Check if we're within 30 minutes of the target time
  // For example, if target is 20:30, we check between 20:30-21:00
  if (currentHour === targetHour) {
    // Same hour - check if we're at or after target minute
    return currentMinute >= targetMinute;
  } else if (currentHour === targetHour + 1) {
    // Next hour - check if we're within first 30 minutes
    return currentMinute < 30;
  }

  return false;
};

/**
 * Get list of countries currently in their notification window
 * @returns {string[]} - Array of country names
 */
export const getCountriesInNotificationWindow = () => {
  const activeCountries = [];

  for (const [countryName, config] of Object.entries(COUNTRY_CONFIG)) {
    const shouldNotify = isInNotificationWindow(
      config.timezone,
      config.targetHour,
      config.targetMinute
    );

    const currentTime = moment.tz(config.timezone).format("HH:mm");
    
    if (shouldNotify) {
      logger.info(
        `[CronHelper] ${countryName} is in notification window (Local: ${currentTime}, Target: ${config.targetTime})`
      );
      activeCountries.push(countryName);
    }
  }

  if (activeCountries.length === 0) {
    logger.info("[CronHelper] No countries in notification window at this time");
  } else {
    logger.info(`[CronHelper] Active countries: ${activeCountries.join(", ")}`);
  }

  return activeCountries;
};

/**
 * Check if notification should be sent for a specific country
 * @param {string} countryName - Name of the country
 * @returns {boolean} - True if should send notification
 */
export const shouldSendNotificationForCountry = (countryName) => {
  const config = COUNTRY_CONFIG[countryName];
  
  if (!config) {
    logger.warn(`[CronHelper] Unknown country: ${countryName}`);
    return false;
  }

  return isInNotificationWindow(
    config.timezone,
    config.targetHour,
    config.targetMinute
  );
};

/**
 * Get all supported countries
 * @returns {string[]} - Array of country names
 */
export const getSupportedCountries = () => {
  return Object.keys(COUNTRY_CONFIG);
};

export default {
  COUNTRY_CONFIG,
  isInNotificationWindow,
  getCountriesInNotificationWindow,
  shouldSendNotificationForCountry,
  getSupportedCountries,
};
