# Subscription API Testing Guide

## Base URL
```
http://localhost:8081/api/v1/subscription
```
*(Replace 8081 with your server port)*

---

## Prerequisites

1. **Server must be running**
2. **User must be authenticated** (get token from login)
3. **RevenueCat API Key** must be configured in controller

---

## Step 1: Get Authentication Token

### Login by Email
```
POST http://localhost:8081/api/v1/auth/login-by-email

Headers:
Content-Type: application/json

Body:
{
  "email": "minal.logicgo@gmail.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

**Save the `token`** - You'll need it for authenticated endpoints.

---

## Step 2: Test Subscription APIs

### API 1: Add Subscription App User ID

**Purpose:** Link a RevenueCat app user ID to your user account

```
POST http://localhost:8081/api/v1/subscription/add-subscription-appId

Headers:
Authorization: Bearer {YOUR_TOKEN}
Content-Type: application/json

Body:
{
  "appUserId": "test_user_123"
}
```

**Expected Response (Success - 200):**
```json
{
  "message": "SubscriptionAppUserId updated successfully.",
  "data": null
}
```

**Expected Response (Conflict - 409):**
```json
{
  "message": "This appUserId is already assigned to another user.",
  "statusCode": 409
}
```

**Test Cases:**
- ✅ Valid appUserId (should succeed)
- ❌ Duplicate appUserId (should return 409)
- ❌ Missing appUserId (should return validation error)
- ❌ Invalid token (should return 401)

---

### API 2: Check Subscription Status

**Purpose:** Check if user has an active subscription

```
GET http://localhost:8081/api/v1/subscription/check-subscription

Headers:
Authorization: Bearer {YOUR_TOKEN}
```

**Expected Response (No subscriptionAppUserId - 200):**
```json
{
  "message": "fetch scubscription check successfully.",
  "data": {
    "isSubscribe": false
  }
}
```

**Expected Response (With subscriptionAppUserId - 200):**
```json
{
  "message": "fetch scubscription check successfully.",
  "data": {
    "isSubscribe": true
  }
}
```

**Expected Response (No subscription - 200):**
```json
{
  "message": "User is not subscribed",
  "data": null
}
```

**Test Cases:**
- ✅ User without subscriptionAppUserId (returns isSubscribe: false)
- ✅ User with subscriptionAppUserId but no active subscription
- ✅ User with active subscription (returns isSubscribe: true)
- ❌ Invalid token (should return 401)
- ❌ User not found (should return 404)

---

### API 3: RevenueCat Webhook

**Purpose:** Receive subscription events from RevenueCat

```
POST http://localhost:8081/api/v1/subscription/webhook

Headers:
Content-Type: application/json
Authorization: Bearer {WEBHOOK_SECRET_HASH} (optional)

Body:
{
  "event": {
    "id": "event-123",
    "type": "INITIAL_PURCHASE",
    "app_user_id": "test_user_123",
    "original_app_user_id": "test_user_123",
    "product_id": "premium_monthly",
    "period_type": "NORMAL",
    "purchase_date": "2024-01-15T10:30:00Z",
    "expires_date": "2024-02-15T10:30:00Z",
    "environment": "SANDBOX",
    "store": "APP_STORE",
    "price": 9.99,
    "currency": "USD"
  }
}
```

**Expected Response (Success - 200):**
```json
{
  "message": "Webhook processed successfully",
  "data": {
    "event": "INITIAL_PURCHASE",
    "processed": true
  }
}
```

**Test Event Types:**
- `INITIAL_PURCHASE` - First subscription purchase
- `RENEWAL` - Subscription renewed
- `CANCELLATION` - Subscription cancelled
- `EXPIRATION` - Subscription expired
- `BILLING_ISSUE` - Payment problem
- `PRODUCT_CHANGE` - Subscription product changed

---

## Complete Testing Flow

### Test Scenario 1: New User Subscription Flow

1. **Login** → Get token
2. **Check Subscription** → Should return `isSubscribe: false`
3. **Add App User ID** → Set `subscriptionAppUserId`
4. **Check Subscription Again** → Should call RevenueCat API and return status

### Test Scenario 2: Webhook Testing

1. **Send INITIAL_PURCHASE webhook** → Should process successfully
2. **Check server logs** → Should see Firebase Analytics logs
3. **Verify response** → Should return 200 with processed: true

---

## Postman Collection Setup

### Environment Variables

Create these in Postman:

| Variable | Value |
|----------|-------|
| `base_url` | `http://localhost:8081` |
| `auth_token` | (will be set after login) |
| `app_user_id` | `test_user_123` |

### Auto-Save Token Script

In Login request → **Tests** tab:

```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    if (jsonData.data && jsonData.data.token) {
        pm.environment.set("auth_token", jsonData.data.token);
        console.log("Token saved");
    }
}
```

### Auto-Set Authorization Header

In authenticated requests → **Pre-request Script**:

```javascript
if (pm.environment.get("auth_token")) {
    pm.request.headers.add({
        key: "Authorization",
        value: "Bearer " + pm.environment.get("auth_token")
    });
}
```

---

## Common Issues & Solutions

### Issue 1: 404 Not Found
**Problem:** Wrong URL path
**Solution:** Make sure URL includes `/v1`: `/api/v1/subscription/...`

### Issue 2: 401 Unauthorized
**Problem:** Missing or invalid token
**Solution:** 
- Login again to get fresh token
- Check Authorization header format: `Bearer {token}`

### Issue 3: 500 Internal Server Error
**Problem:** RevenueCat API key not configured or invalid
**Solution:** 
- Check controller has API key: `test_QPxWPLYkfpAeonpNcRfAkvMNSdc`
- Check server logs for error details

### Issue 4: isSubscribe field not showing
**Problem:** Field missing in database
**Solution:** 
- Run migration: `npm run migrate:subscription`
- Or call check-subscription API (auto-adds fields)

---

## Testing Checklist

- [ ] Server is running on correct port
- [ ] User account exists and is verified
- [ ] Login endpoint returns valid token
- [ ] Token is saved in Postman environment
- [ ] Add subscription app user ID works
- [ ] Check subscription returns correct status
- [ ] Webhook endpoint accepts RevenueCat format
- [ ] Server logs show webhook processing
- [ ] MongoDB shows subscription fields updated

---

## Quick Test Commands

### Using curl (if you prefer command line):

```bash
# 1. Login
curl -X POST http://localhost:8081/api/v1/auth/login-by-email \
  -H "Content-Type: application/json" \
  -d '{"email":"minal.logicgo@gmail.com","password":"your-password"}'

# 2. Add App User ID (replace TOKEN)
curl -X POST http://localhost:8081/api/v1/subscription/add-subscription-appId \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appUserId":"test_user_123"}'

# 3. Check Subscription (replace TOKEN)
curl -X GET http://localhost:8081/api/v1/subscription/check-subscription \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Expected Database Changes

After testing, check MongoDB:

```javascript
// User should have these fields:
{
  "subscriptionAppUserId": "test_user_123",
  "isSubscribe": true/false,
  "subscriptionType": "NORMAL" or null,
  "subscriptionStart": Date or null,
  "subscriptionEnd": Date or null
}
```

---

## Server Logs to Watch

When testing, check your server console for:

- ✅ `fetch scubscription check successfully.`
- ✅ `=== RevenueCat Webhook Received ===`
- ✅ `🚀 Sending event to Firebase Analytics...`
- ❌ Any error messages

---

## Need Help?

If APIs are not working:
1. Check server is running
2. Check MongoDB connection
3. Check RevenueCat API key in controller
4. Check server logs for errors
5. Verify user exists and is verified


