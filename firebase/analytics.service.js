import admin from "./config.firebase.js";

class FirebaseAnalyticsService {
  /**
   * Send RevenueCat event to Firebase Analytics
   * @param {Object} event - RevenueCat webhook event object
   * @param {String} appUserId - RevenueCat app user ID
   * @returns {Promise<Boolean>} - Returns true if successful, false otherwise
   */
  static async sendRevenueCatEvent(event, appUserId) {
    try {
      if (!event || !appUserId) {
        console.log("⚠️ Missing event or appUserId for Firebase Analytics");
        return false;
      }

      // Map RevenueCat event types to Firebase Analytics event names
      const eventName = this.mapRevenueCatEventToFirebase(event.type);

      if (!eventName) {
        console.log(`⚠️ Unknown RevenueCat event type: ${event.type}`);
        return false;
      }

      // Prepare event parameters
      const eventParams = {
        event_type: event.type || "UNKNOWN",
        product_id: event.product_id || null,
        period_type: event.period_type || null,
        price: event.price || 0,
        currency: event.currency || null,
        store: event.store || null,
        environment: event.environment || null,
        app_user_id: appUserId,
      };

      // Add purchase_date and expires_date if available
      if (event.purchase_date) {
        eventParams.purchase_date = event.purchase_date;
      }
      if (event.expires_date) {
        eventParams.expires_date = event.expires_date;
      }

      // Log the event (Firebase Analytics logging)
      console.log(`📊 Firebase Analytics Event: ${eventName}`, eventParams);

      // Note: Firebase Admin SDK doesn't directly send analytics events
      // You would typically use the Firebase Analytics REST API or client SDK
      // For now, we'll log the event. You can integrate with Firebase Analytics API if needed.
      
      // Example: If you want to use Firebase Analytics Measurement Protocol
      // You would make an HTTP request to:
      // https://www.google-analytics.com/mp/collect?measurement_id=YOUR_MEASUREMENT_ID&api_secret=YOUR_API_SECRET

      return true;
    } catch (error) {
      console.error("❌ Error sending RevenueCat event to Firebase Analytics:", error);
      return false;
    }
  }

  /**
   * Map RevenueCat event types to Firebase Analytics event names
   * @param {String} revenueCatEventType - RevenueCat event type
   * @returns {String|null} - Firebase Analytics event name or null
   */
  static mapRevenueCatEventToFirebase(revenueCatEventType) {
    const eventMap = {
      INITIAL_PURCHASE: "revenuecat_initial_purchase",
      RENEWAL: "revenuecat_renewal",
      CANCELLATION: "revenuecat_cancellation",
      UNCANCELLATION: "revenuecat_uncancellation",
      NON_RENEWING_PURCHASE: "revenuecat_non_renewing_purchase",
      SUBSCRIPTION_PAUSED: "revenuecat_subscription_paused",
      EXPIRATION: "revenuecat_expiration",
      BILLING_ISSUE: "revenuecat_billing_issue",
      PRODUCT_CHANGE: "revenuecat_product_change",
      SUBSCRIPTION_EXTENDED: "revenuecat_subscription_extended",
    };

    return eventMap[revenueCatEventType] || null;
  }
}

export default FirebaseAnalyticsService;

