import { BetaAnalyticsDataClient } from "@google-analytics/data";
import config from "../config/config.js";

class GA4Service {
  /**
   * Get service account credentials for Google APIs
   * Reuses the same credentials structure as Firebase Admin SDK
   * @returns {Object} - Service account credentials
   */
  static getServiceAccountCredentials() {
    // Service account credentials (same as Firebase config)
    // In production, these should be moved to environment variables
    return {
      type: "service_account",
      project_id: "selfie-camera-short",
      private_key_id: "fc8a3ce0f99c57ee4fc3652189931ad3abd02609",
      private_key:
        "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6OcZ4u7zzld08\nTbTkSVTstvQVhxCDk2uD7KyuVf7CMA1/NBsa8wDv/bLOxrHOtQpr1uIAnCNpTkB/\nqzqMCtuW/LO/L80lkz+hhecDJWovDsckBNlubG/UifbqItHnHJ80y2cH2p5ZBqYs\nZ7oiHV9KTmjS6waStjz/Szao4z9GDvPtFjOYbEucxdVC/n30rdYyCysq8pXBtrtS\nGpMVoYztZ88nslI+mLq2m4ntgv2+o++NkoF21Pi6K+Y6cQzxIVGZ95x5TVR59k2q\n50y2oOCECNlkD5ornoMi1vwl+R+ghhSiE86YqSnqJoAm2R0C32ITuHxYVCsuZyPQ\n2MA9+dctAgMBAAECggEAAY0trB/USSs8dp4nHafGv1oe2ncPmikGQkkcfy9UOgXw\ndtjWSPkxTs6MSNC69n/noFJf+6VRXjU6sFWa3UPR5IYicTtSuDdr1kqpTAtpwQ6c\ndh5cOWFJ5TlpBzZXDVfds7DmINifbRpzE/ehQ1t/Sb0xfmBa46oFBBN6VxndkxXV\nJSivRg5GrKtUk5EjR5l6Iq2JLUG5Hb0eO59781JDv1T/N/ZvT/c7ZeeIYKl4QaP2\n6cAFj0iAu/oJ0hym1kgtiq8PwCncIpiImC7n6v0WzU1zgmb/Cdnm9/sNATfufdro\nXvokgbCTzgAgaQHgpKNhpPPIpzSPxjxInJ4ECsS9AQKBgQD0T5RVHZCKcyNbJXvv\n7ftf58FuaTY62MOTNusU6rwMym9BFKPU9KzcfeVGk9eSEKZH4Kqqr0M9ZbmyesUV\nwSAtTrAshonSFIP4eE2W0fFhA5uJRX8il1RlKQRbpGbRjFuZjU6nBcW1EsfCHFQ+\ncmm7ZAaZxT0G2T8hlDv0QpaL4QKBgQDDIr6eXf/7y9wIOrarsBI8FA3Kc3t6G3oz\n8v7uUT4VbLPXtIIrhL43te5lBGhpSJzPMZ/1HN+OGBG2BcenCvUIsiV5sF4YOB9B\nK1U1eU/yqKFx8kEFt3turOt7zvbHJVOihQ6KHSoF6xg4WhdRqcRJsdakOH+1TpCj\nGo9cBkZUzQKBgBY/aPKXTqJM+dtC/pZKxalmIWc8jYOuWaD+T0oIVjeT962lg4XR\nAizSCh7zN55Fhd7lxqTkcOsWaGKoa2ofvB5kHAbx+Xr4A0yNKAOj+qcq/O7zNTCh\nNz4/DfaKchKDBZRmGdN74xUqMKasjb9iC97UrQUzwOruvaEBLrR/m9YBAoGBAJ4O\nmo/0W9A8g/E2fZf7egmnxLPjbnStpQJHJS8sJzl7XwCteXJ+hwThHEQ+mcQNyNYa\nwBHuXTXfURk6/UjUmz177tbugIjljItg6hfyN0u6Q2rkar6SrCwtbGBQd5s/JMtT\nMz+z98HrdybN8m13MULwBYfnK6pUBNvYO56yhm1RAoGBAIbnUzRPYKwzVm013afF\n64IrQ4NgUyPxNNZB/K0dBSvGIZN/J9ANv6dcvAMhoS9iZ0fhscM7VwnYBGfE4nuw\nLagk5Al1S3v6cfQ5h8EZyWir2DnP4lUkUnNc7xXFfN8rqs9NldeVD7yi+RlYoKZY\nvyrYiSp5kTXHWKDLcFhqqo88\n-----END PRIVATE KEY-----\n",
      client_email:
        "firebase-adminsdk-t28tr@selfie-camera-short.iam.gserviceaccount.com",
      client_id: "109873916324778050020",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url:
        "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-t28tr%40selfie-camera-short.iam.gserviceaccount.com",
      universe_domain: "googleapis.com",
    };
  }

  /**
   * Get authenticated Analytics Data client
   * @returns {BetaAnalyticsDataClient}
   */
  static getAnalyticsClient() {
    try {
      const serviceAccount = this.getServiceAccountCredentials();

      // Create Analytics Data client with service account credentials
      const analyticsDataClient = new BetaAnalyticsDataClient({
        credentials: serviceAccount,
      });

      return analyticsDataClient;
    } catch (error) {
      console.error("❌ Error creating Analytics Data client:", error);
      throw new Error("Failed to initialize GA4 client");
    }
  }

  /**
   * Get total active users from GA4
   * @param {String} propertyId - GA4 Property ID
   * @param {String} startDate - Start date in YYYY-MM-DD format
   * @param {String} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} - User data with metrics
   */
  static async getActiveUsers(propertyId, startDate = null, endDate = null) {
    try {
      const client = this.getAnalyticsClient();

      // Default to last 30 days if dates not provided
      const today = new Date();
      const defaultEndDate = endDate || this.formatDate(today);
      const defaultStartDate =
        startDate ||
        this.formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));

      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: defaultStartDate,
            endDate: defaultEndDate,
          },
        ],
        dimensions: [
          { name: "date" },
          { name: "country" },
          { name: "deviceCategory" },
        ],
        metrics: [
          { name: "activeUsers" },
          { name: "newUsers" },
          { name: "sessions" },
        ],
      });

      // Process and format the response
      const formattedData = this.formatReportResponse(response);

      return {
        success: true,
        data: formattedData,
        summary: {
          totalActiveUsers: formattedData.totalActiveUsers || 0,
          totalNewUsers: formattedData.totalNewUsers || 0,
          totalSessions: formattedData.totalSessions || 0,
          dateRange: {
            startDate: defaultStartDate,
            endDate: defaultEndDate,
          },
        },
      };
    } catch (error) {
      console.error("❌ Error fetching active users from GA4:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  /**
   * Get user demographics and behavior data
   * @param {String} propertyId - GA4 Property ID
   * @param {String} startDate - Start date in YYYY-MM-DD format
   * @param {String} endDate - End date in YYYY-MM-DD format
   * @param {String} period - Period type: 'daily', 'weekly', 'monthly'
   * @returns {Promise<Object>} - Geography based usage data (country wise)
   */
  static async getUserDemographics(
    propertyId,
    startDate = null,
    endDate = null,
    period = "weekly"
  ) {
    try {
      const client = this.getAnalyticsClient();

      const today = new Date();

      // Calculate date range based on period if dates not provided
      let defaultStartDate, defaultEndDate;

      if (startDate && endDate) {
        // Use provided dates
        defaultStartDate = startDate;
        defaultEndDate = endDate;
      } else {
        // Calculate based on period
        defaultEndDate = endDate || this.formatDate(today);

        switch (period) {
          case "daily":
            // Last 1 day
            defaultStartDate =
              startDate ||
              this.formatDate(
                new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
              );
            break;
          case "weekly":
            // Last 7 days
            defaultStartDate =
              startDate ||
              this.formatDate(
                new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              );
            break;
          case "monthly":
            // Last 30 days
            defaultStartDate =
              startDate ||
              this.formatDate(
                new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
              );
            break;
          default:
            // Default to weekly (7 days)
            defaultStartDate =
              startDate ||
              this.formatDate(
                new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              );
        }
      }

      // Fetch country wise users
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: defaultStartDate,
            endDate: defaultEndDate,
          },
        ],
        dimensions: [
          { name: "country" }, // Country name (e.g. United States)
          { name: "countryId" }, // Country code (e.g. US)
        ],
        metrics: [{ name: "totalUsers" }, { name: "activeUsers" }],
      });

      if (!response || !response.rows) {
        return {
          success: true,
          data: {
            totalUsers: 0,
            countries: [],
          },
          dateRange: {
            startDate: defaultStartDate,
            endDate: defaultEndDate,
          },
        };
      }

      // Build country wise data
      let totalUsers = 0;
      const countryMap = new Map();

      response.rows.forEach((row) => {
        const dimensions = row.dimensionValues || [];
        const metrics = row.metricValues || [];

        const countryName = dimensions[0]?.value || "Unknown";
        const countryCode = dimensions[1]?.value || "";
        const totalUsersCount = parseInt(metrics[0]?.value || "0", 10);
        const activeUsersCount = parseInt(metrics[1]?.value || "0", 10);

        totalUsers += totalUsersCount;

        // totalUsers += users;

        const key = countryCode || countryName;
        // const existing = countryMap.get(key) || {
        //   country: countryName,
        //   countryCode: countryCode,
        //   users: 0,
        // };

        const existing = countryMap.get(key) || {
          country: countryName,
          countryCode: countryCode,
          total_users: 0,
          active_users: 0,
        };

        existing.total_users += totalUsersCount;
        existing.active_users += activeUsersCount;

        countryMap.set(key, existing);

        // existing.users += users;
        // countryMap.set(key, existing);
      });

      // Convert map to sorted array
      const countries = Array.from(countryMap.values()).sort(
        (a, b) => b.users - a.users
      );

      // Calculate percentage share for each country
      const countriesWithPercentage = countries.map((item) => ({
        ...item,
        percentage:
          totalUsers > 0
            ? parseFloat(((item.total_users / totalUsers) * 100).toFixed(2))
            : 0,
      }));

      return {
        success: true,
        data: {
          totalUsers,
          countries: countriesWithPercentage,
        },
        period: period,
        dateRange: {
          startDate: defaultStartDate,
          endDate: defaultEndDate,
        },
      };
    } catch (error) {
      console.error("❌ Error fetching user demographics from GA4:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  /**
   * Get app version usage data
   * @param {String} propertyId - GA4 Property ID
   * @param {String} startDate - Start date in YYYY-MM-DD format
   * @param {String} endDate - End date in YYYY-MM-DD format
   * @param {String} period - Period type: 'daily', 'weekly', 'monthly'
   * @returns {Promise<Object>} - App version based usage data
   */
  static async getAppVersions(
    propertyId,
    startDate = null,
    endDate = null,
    period = "weekly"
  ) {
    try {
      const client = this.getAnalyticsClient();

      const today = new Date();

      // Calculate date range based on period if dates not provided
      let defaultStartDate, defaultEndDate;

      if (startDate && endDate) {
        // Use provided dates
        defaultStartDate = startDate;
        defaultEndDate = endDate;
      } else {
        // Calculate based on period
        defaultEndDate = endDate || this.formatDate(today);

        switch (period) {
          case "daily":
            // Last 1 day
            defaultStartDate =
              startDate ||
              this.formatDate(
                new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
              );
            break;
          case "weekly":
            // Last 7 days
            defaultStartDate =
              startDate ||
              this.formatDate(
                new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              );
            break;
          case "monthly":
            // Last 30 days
            defaultStartDate =
              startDate ||
              this.formatDate(
                new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
              );
            break;
          default:
            // Default to weekly (7 days)
            defaultStartDate =
              startDate ||
              this.formatDate(
                new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              );
        }
      }

      // Fetch app version wise users
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: defaultStartDate,
            endDate: defaultEndDate,
          },
        ],
        dimensions: [
          { name: "appVersion" }, // App version (e.g. 1.0.0)
        ],
        metrics: [{ name: "totalUsers" }, { name: "activeUsers" }],
      });

      if (!response || !response.rows) {
        return {
          success: true,
          data: {
            totalUsers: 0,
            versions: [],
          },
          dateRange: {
            startDate: defaultStartDate,
            endDate: defaultEndDate,
          },
        };
      }

      // Build app version wise data
      let totalUsers = 0;
      const versionMap = new Map();

      response.rows.forEach((row) => {
        const dimensions = row.dimensionValues || [];
        const metrics = row.metricValues || [];

        const version = dimensions[0]?.value || "Unknown";
        const totalUsersCount = parseInt(metrics[0]?.value || "0", 10);
        const activeUsersCount = parseInt(metrics[1]?.value || "0", 10);

        totalUsers += totalUsersCount;

        const key = version;
        const existing = versionMap.get(key) || {
          version,
          total_users: 0,
          active_users: 0,
        };

        existing.total_users += totalUsersCount;
        existing.active_users += activeUsersCount;

        versionMap.set(key, existing);
      });

      // Convert map to sorted array
      const versions = Array.from(versionMap.values()).sort(
        (a, b) => b.total_users - a.total_users
      );

      // Calculate percentage share for each version
      const versionsWithPercentage = versions.map((item) => ({
        ...item,
        percentage:
          totalUsers > 0
            ? parseFloat(((item.total_users / totalUsers) * 100).toFixed(2))
            : 0,
      }));

      return {
        success: true,
        data: {
          totalUsers,
          versions: versionsWithPercentage,
        },
        period: period,
        dateRange: {
          startDate: defaultStartDate,
          endDate: defaultEndDate,
        },
      };
    } catch (error) {
      console.error("❌ Error fetching app versions from GA4:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  /**
   * Get revenue trend data
   * @param {String} propertyId - GA4 Property ID
   * @param {String} startDate - Start date in YYYY-MM-DD format
   * @param {String} endDate - End date in YYYY-MM-DD format
   * @param {String} period - Period type: 'daily', 'weekly', 'monthly'
   * @returns {Promise<Object>} - Revenue trend data with summary
   */
  static async getRevenueTrend(
    propertyId,
    startDate = null,
    endDate = null,
    period = "weekly"
  ) {
    try {
      const client = this.getAnalyticsClient();

      const today = new Date();

      // Calculate date range based on period if dates not provided
      let defaultStartDate, defaultEndDate;

      if (startDate && endDate) {
        // Use provided dates
        defaultStartDate = startDate;
        defaultEndDate = endDate;
      } else {
        defaultEndDate = endDate || this.formatDate(today);

        switch (period) {
          case "daily":
            // Last 7 days (current day + last 6 days)
            defaultStartDate = this.formatDate(
              new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
            );
            break;
          case "weekly": {
            // Current week (Monday to today)
            const current = new Date(today);
            const day = current.getDay(); // 0 (Sun) - 6 (Sat)
            const diff = day === 0 ? 6 : day - 1; // days since Monday
            const monday = new Date(current);
            monday.setDate(current.getDate() - diff);
            defaultStartDate = this.formatDate(monday);
            break;
          }
          case "monthly": {
            // Current month (1st to today)
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            defaultStartDate = this.formatDate(firstDay);
            break;
          }
          case "yearly": {
            // Current year (Jan 1st to today)
            const firstJan = new Date(today.getFullYear(), 0, 1);
            defaultStartDate = this.formatDate(firstJan);
            break;
          }
          default:
            // Fallback: last 30 days
            defaultStartDate = this.formatDate(
              new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            );
        }
      }

      // Choose date dimension based on period
      let dateDimension;
      switch (period) {
        case "daily":
        case "weekly":
        case "monthly":
          // One point per day
          dateDimension = { name: "date" };
          break;
        case "yearly":
          // One point per month (first day of month)
          dateDimension = { name: "month" };
          break;
        default:
          dateDimension = { name: "date" };
      }

      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: defaultStartDate,
            endDate: defaultEndDate,
          },
        ],
        dimensions: [dateDimension],
        metrics: [
          // GA4 purchase revenue metric
          { name: "totalRevenue" },
        ],
      });

      if (!response || !response.rows) {
        return {
          success: true,
          data: {
            totalRevenue: 0,
            points: [],
          },
          period,
          dateRange: {
            startDate: defaultStartDate,
            endDate: defaultEndDate,
          },
        };
      }

      let totalRevenue = 0;
      const points = [];

      response.rows.forEach((row) => {
        const dimValue = row.dimensionValues?.[0]?.value || "";
        const revenue = parseFloat(row.metricValues?.[0]?.value || "0");

        totalRevenue += revenue;

        points.push({
          period: dimValue, // raw GA4 key (date/week/month)
          date: this.formatGa4DateLabel(period, dimValue),
          revenue,
        });
      });

      // Sort points chronologically if needed (GA4 usually returns sorted)
      // For safety, we'll sort by period string
      points.sort((a, b) => (a.period > b.period ? 1 : -1));

      return {
        success: true,
        data: {
          totalRevenue,
          points,
        },
        period,
        dateRange: {
          startDate: defaultStartDate,
          endDate: defaultEndDate,
        },
      };
    } catch (error) {
      console.error("❌ Error fetching revenue trend from GA4:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  /**
   * Get average engagement time trend data
   * @param {String} propertyId - GA4 Property ID
   * @param {String} startDate - Start date in YYYY-MM-DD format
   * @param {String} endDate - End date in YYYY-MM-DD format
   * @param {String} period - Period type: 'daily', 'weekly', 'monthly', 'yearly'
   * @returns {Promise<Object>} - Average engagement time trend data with summary
   */
  static async getAverageEngagementTime(
    propertyId,
    startDate = null,
    endDate = null,
    period = "weekly"
  ) {
    try {
      const client = this.getAnalyticsClient();

      const today = new Date();

      // Calculate date range based on period if dates not provided
      let defaultStartDate, defaultEndDate;

      if (startDate && endDate) {
        // Use provided dates
        defaultStartDate = startDate;
        defaultEndDate = endDate;
      } else {
        defaultEndDate = endDate || this.formatDate(today);

        switch (period) {
          case "daily":
            // Last 7 days (current day + last 6 days)
            defaultStartDate = this.formatDate(
              new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
            );
            break;
          case "weekly": {
            // Current week (Monday to today)
            const current = new Date(today);
            const day = current.getDay(); // 0 (Sun) - 6 (Sat)
            const diff = day === 0 ? 6 : day - 1; // days since Monday
            const monday = new Date(current);
            monday.setDate(current.getDate() - diff);
            defaultStartDate = this.formatDate(monday);
            break;
          }
          case "monthly": {
            // Current month (1st to today)
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            defaultStartDate = this.formatDate(firstDay);
            break;
          }
          case "yearly": {
            // Current year (Jan 1st to today)
            const firstJan = new Date(today.getFullYear(), 0, 1);
            defaultStartDate = this.formatDate(firstJan);
            break;
          }
          default:
            // Fallback: last 30 days
            defaultStartDate = this.formatDate(
              new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            );
        }
      }

      // Choose date dimension based on period
      let dateDimension;
      switch (period) {
        case "daily":
        case "weekly":
        case "monthly":
          // One point per day
          dateDimension = { name: "date" };
          break;
        case "yearly":
          // One point per month (first day of month)
          dateDimension = { name: "date" };
          break;
        default:
          dateDimension = { name: "date" };
      }

      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: defaultStartDate,
            endDate: defaultEndDate,
          },
        ],
        dimensions: [dateDimension],
        metrics: [
          // GA4 metrics to calculate average engagement time
          { name: "userEngagementDuration" }, // Total engagement duration in seconds
          { name: "activeUsers" }, // Active users count
          { name: "engagedSessions" }, // Number of engaged sessions
          { name: "sessions" }, // Total sessions count
        ],
      });

      if (!response || !response.rows) {
        return {
          success: true,
          data: {
            averageEngagementTime: "0s",
            points: [],
          },
          period,
          dateRange: {
            startDate: defaultStartDate,
            endDate: defaultEndDate,
          },
        };
      }

      let totalEngagementTime = 0;
      let totalActiveUsers = 0;
      let totalEngagedSessions = 0;
      let totalSessions = 0;
      const points = [];

      response.rows.forEach((row) => {
        const dimValue = row.dimensionValues?.[0]?.value || "";
        const engagementDuration = parseFloat(
          row.metricValues?.[0]?.value || "0"
        ); // userEngagementDuration in seconds
        const activeUsers = parseFloat(row.metricValues?.[1]?.value || "0");
        const engagedSessions = parseFloat(row.metricValues?.[2]?.value || "0");
        const sessions = parseFloat(row.metricValues?.[3]?.value || "0");

        // Calculate metrics for this period
        // Average engagement time per user
        const avgEngagementTimePerUser =
          activeUsers > 0 ? engagementDuration / activeUsers : 0;

        // Engaged sessions per active user
        const engagedSessionsPerUser =
          activeUsers > 0 ? engagedSessions / activeUsers : 0;

        // Average engagement time per session
        const avgEngagementTimePerSession =
          sessions > 0 ? engagementDuration / sessions : 0;

        totalEngagementTime += engagementDuration;
        totalActiveUsers += activeUsers;
        totalEngagedSessions += engagedSessions;
        totalSessions += sessions;

        points.push({
          period: dimValue, // raw GA4 key (date/week/month)
          date: this.formatGa4DateLabel(period, dimValue),
          engagementTime: this.formatEngagementTime(
            avgEngagementTimePerUser
          ), // average engagement time per user
          engagementSessionPerUser: engagedSessionsPerUser.toFixed(2), // engaged sessions per active user (as number)
          engagementTimePerSession: this.formatEngagementTime(
            avgEngagementTimePerSession
          ), // average engagement time per session
        });
      });

      // Calculate overall averages
      const averageEngagementTime =
        totalActiveUsers > 0 ? totalEngagementTime / totalActiveUsers : 0;
      const overallEngagedSessionsPerUser =
        totalActiveUsers > 0 ? totalEngagedSessions / totalActiveUsers : 0;
      const overallEngagementTimePerSession =
        totalSessions > 0 ? totalEngagementTime / totalSessions : 0;

      // Sort points chronologically
      points.sort((a, b) => (a.period > b.period ? 1 : -1));

      return {
        success: true,
        data: {
          averageEngagementTime: this.formatEngagementTime(
            averageEngagementTime
          ),
          averageEngagedSessionsPerUser: overallEngagedSessionsPerUser.toFixed(
            2
          ),
          averageEngagementTimePerSession: this.formatEngagementTime(
            overallEngagementTimePerSession
          ),
          points,
        },
        period,
        dateRange: {
          startDate: defaultStartDate,
          endDate: defaultEndDate,
        },
      };
    } catch (error) {
      console.error("❌ Error fetching average engagement time from GA4:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  /**
   * Format engagement time in seconds to human-readable format (e.g., "2m 30s")
   * @param {Number} seconds - Engagement time in seconds
   * @returns {String} - Formatted time string
   */
  static formatEngagementTime(seconds) {
    if (!seconds || seconds === 0) return "0s";

    const totalSeconds = Math.round(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Get user funnel data (App Opens -> Photo Uploads -> Feature Used -> Paywall Shown -> Purchases)
   * @param {String} propertyId - GA4 Property ID
   * @param {String} startDate - Start date in YYYY-MM-DD format
   * @param {String} endDate - End date in YYYY-MM-DD format
   * @param {String} period - Period type: 'daily', 'weekly', 'monthly'
   * @returns {Promise<Object>} - Funnel data with conversion rates
   */
  static async getUserFunnel(
    propertyId,
    startDate = null,
    endDate = null,
    period = "weekly"
  ) {
    try {
      const client = this.getAnalyticsClient();

      const today = new Date();

      // Calculate date range based on period if dates not provided
      let defaultStartDate, defaultEndDate;

      if (startDate && endDate) {
        // Use provided dates
        defaultStartDate = startDate;
        defaultEndDate = endDate;
      } else {
        // Calculate based on period
        defaultEndDate = endDate || this.formatDate(today);

        switch (period) {
          case "daily":
            // Last 1 day
            defaultStartDate =
              startDate ||
              this.formatDate(
                new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
              );
            break;
          case "weekly":
            // Last 7 days
            defaultStartDate =
              startDate ||
              this.formatDate(
                new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              );
            break;
          case "monthly":
            // Last 30 days
            defaultStartDate =
              startDate ||
              this.formatDate(
                new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
              );
            break;
          default:
            // Default to weekly (7 days)
            defaultStartDate =
              startDate ||
              this.formatDate(
                new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              );
        }
      }

      // Define funnel stages with their corresponding events
      // Match the chart stages: App Opens -> Photo Uploads -> Feature Used -> Paywall Shown -> Purchases
      const funnelStages = [
        {
          name: "App Opens",
          eventNames: ["first_open", "first_visit"], // App open events
          label: "app_opens",
        },
        {
          name: "Session Start",
          eventNames: ["session_start"], // Single event as array for consistency
          label: "session_start",
        },
        {
          name: "Screen/Page View",
          eventNames: ["screen_view", "page_view"],
          label: "screen_page_view",
        },
        {
          name: "Purchase",
          eventNames: ["purchase", "in_app_purchase"],
          label: "purchase",
        },
      ];

      /**
       * Build dimension filter for event names
       * @param {Array|String} eventNames - Event name(s) to filter
       * @returns {Object} - Dimension filter object
       */
      const buildEventFilter = (eventNames) => {
        const events = Array.isArray(eventNames) ? eventNames : [eventNames];

        if (events.length === 1) {
          // Single event - use simple filter
          return {
            filter: {
              fieldName: "eventName",
              stringFilter: {
                matchType: "EXACT",
                value: events[0],
              },
            },
          };
        } else {
          // Multiple events - use OR group
          return {
            orGroup: {
              expressions: events.map((eventName) => ({
                filter: {
                  fieldName: "eventName",
                  stringFilter: {
                    matchType: "EXACT",
                    value: eventName,
                  },
                },
              })),
            },
          };
        }
      };

      // Fetch data for each funnel stage (total counts without date breakdown)
      const funnelPromises = funnelStages.map(async (stage) => {
        try {
          // Build proper dimension filter for this stage
          const dimensionFilter = buildEventFilter(stage.eventNames);

          // Always query without eventName dimension when using dimensionFilter
          // This ensures we get unique users who triggered ANY of the filtered events
          const dimensions = []; // No dimensions - gives us aggregate across filtered events

          // Query for total unique users for this event/events
          const [response] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [
              {
                startDate: defaultStartDate,
                endDate: defaultEndDate,
              },
            ],
            dimensions: dimensions,
            metrics: [
              { name: "eventCount" }, // Total count of events
              { name: "totalUsers" }, // Unique users who triggered the event(s)
            ],
            dimensionFilter: dimensionFilter,
          });

          // Calculate totals
          let totalEventCount = 0;
          let totalUsers = 0;

          if (response.rows && response.rows.length > 0) {
            // When no dimensions, we get aggregate data in first row
            const row = response.rows[0];
            totalEventCount = parseInt(row.metricValues[0]?.value || "0", 10);
            totalUsers = parseInt(row.metricValues[1]?.value || "0", 10);
          }

          console.log(`📊 ${stage.name} (${stage.eventNames.join(", ")}):`, {
            totalUsers,
            totalEventCount,
            filter: JSON.stringify(dimensionFilter),
          });

          return {
            stage: stage.name,
            label: stage.label,
            eventNames: stage.eventNames,
            count: totalUsers, // Unique users who triggered any of the events
            eventCount: totalEventCount,
          };
        } catch (error) {
          console.error(`❌ Error fetching ${stage.name} data:`, error);
          return {
            stage: stage.name,
            label: stage.label,
            eventNames: stage.eventNames,
            count: 0,
            eventCount: 0,
            error: error.message,
          };
        }
      });

      const funnelData = await Promise.all(funnelPromises);

      // Calculate conversion rates
      const funnelWithRates = funnelData.map((stage, index) => {
        const previousStage = index > 0 ? funnelData[index - 1] : null;
        const conversionRate =
          previousStage && previousStage.count > 0
            ? ((stage.count / previousStage.count) * 100).toFixed(2)
            : "100.00";

        const dropOffRate =
          previousStage && previousStage.count > 0
            ? (
                ((previousStage.count - stage.count) / previousStage.count) *
                100
              ).toFixed(2)
            : "0.00";

        return {
          ...stage,
          conversionRate: parseFloat(conversionRate),
          dropOffRate: parseFloat(dropOffRate),
          order: index + 1,
        };
      });

      // Calculate overall conversion rate (from first to last stage)
      const overallConversionRate =
        funnelData.length > 0 && funnelData[0].count > 0
          ? (
              (funnelData[funnelData.length - 1].count / funnelData[0].count) *
              100
            ).toFixed(2)
          : "0.00";

      return {
        success: true,
        data: {
          stages: funnelWithRates,
          summary: {
            totalAppOpens: funnelData[0]?.count || 0,
            totalPurchases: funnelData[funnelData.length - 1]?.count || 0,
            overallConversionRate: parseFloat(overallConversionRate),
          },
          period,
          dateRange: {
            startDate: defaultStartDate,
            endDate: defaultEndDate,
          },
        },
      };
    } catch (error) {
      console.error("❌ Error fetching user funnel from GA4:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  /**
   * Get real-time active users
   * @param {String} propertyId - GA4 Property ID
   * @returns {Promise<Object>} - Real-time user data
   */
  static async getRealtimeUsers(propertyId) {
    try {
      const client = this.getAnalyticsClient();

      const [response] = await client.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [{ name: "country" }, { name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
      });

      const formattedData = this.formatRealtimeResponse(response);

      return {
        success: true,
        data: formattedData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error fetching real-time users from GA4:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  /**
   * Format date to YYYY-MM-DD
   * @param {Date} date - Date object
   * @returns {String} - Formatted date string
   */
  static formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Format GA4 report response to readable format
   * @param {Object} response - GA4 API response
   * @returns {Object} - Formatted data
   */
  static formatReportResponse(response) {
    if (!response || !response.rows) {
      return {
        rows: [],
        totalActiveUsers: 0,
        totalNewUsers: 0,
        totalSessions: 0,
      };
    }

    let totalActiveUsers = 0;
    let totalNewUsers = 0;
    let totalSessions = 0;

    const formattedRows = response.rows.map((row) => {
      const dimensions = row.dimensionValues || [];
      const metrics = row.metricValues || [];

      const activeUsers = parseInt(metrics[0]?.value || "0", 10);
      const newUsers = parseInt(metrics[1]?.value || "0", 10);
      const sessions = parseInt(metrics[2]?.value || "0", 10);

      totalActiveUsers += activeUsers;
      totalNewUsers += newUsers;
      totalSessions += sessions;

      return {
        date: dimensions[0]?.value || null,
        country: dimensions[1]?.value || null,
        deviceCategory: dimensions[2]?.value || null,
        activeUsers,
        newUsers,
        sessions,
      };
    });

    return {
      rows: formattedRows,
      totalActiveUsers,
      totalNewUsers,
      totalSessions,
    };
  }

  /**
   * Format GA4 real-time report response
   * @param {Object} response - GA4 real-time API response
   * @returns {Object} - Formatted data
   */
  static formatRealtimeResponse(response) {
    if (!response || !response.rows) {
      return {
        rows: [],
        totalActiveUsers: 0,
      };
    }

    let totalActiveUsers = 0;

    const formattedRows = response.rows.map((row) => {
      const dimensions = row.dimensionValues || [];
      const metrics = row.metricValues || [];

      const activeUsers = parseInt(metrics[0]?.value || "0", 10);
      totalActiveUsers += activeUsers;

      return {
        country: dimensions[0]?.value || null,
        deviceCategory: dimensions[1]?.value || null,
        activeUsers,
      };
    });

    return {
      rows: formattedRows,
      totalActiveUsers,
    };
  }
  /**
   * Format GA4 date / week / month dimension value into YYYY-MM-DD
   * @param {String} periodType - 'daily' | 'weekly' | 'monthly'
   * @param {String} value - GA4 dimension value (e.g. '20251230', '20251222', '20251201')
   * @returns {String} - Formatted date string YYYY-MM-DD
   */
  static formatGa4DateLabel(periodType, value) {
    if (!value) return null;

    // GA4 date/week/month dimensions are all YYYYMMDD formatted strings
    // For month, only year and month are significant; day is usually '01'
    if (value.length === 8) {
      const year = value.substring(0, 4);
      const month = value.substring(4, 6);
      const day = value.substring(6, 8);
      return `${year}-${month}-${day}`;
    }

    // Fallback: return raw value if unexpected format
    return value;
  }
}

export default GA4Service;
