# Home API Testing Guide - User Preferences & Click Counts

## 📋 Overview
This guide explains how to test the Home API endpoint (`GET /api/v1/home`) with user preferences and click count sorting for Section 2 (Category Showcase).

**Base URL:** `http://localhost:8082/api/v1`

---

## 🎯 Section 2 Priority Order

Section 2 (Category Showcase) follows this priority order:

1. **First Priority:** Categories with deeplink (`categoryId` query parameter)
2. **Second Priority:** Categories in user preferences (sorted by user's selected order)
3. **Third Priority:** Categories sorted by click count (descending - higher clicks first)
4. **Fourth Priority:** Categories sorted by admin order (`section2Order`)

---

## 🧪 Step-by-Step Testing Guide

### Step 1: Login and Get Authentication Token

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```bash
POST http://localhost:8082/api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "status": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      ...
    }
  }
}
```

**Save the token** - You'll need it for all subsequent requests.

---

### Step 2: Get Available Categories (Optional)

**Endpoint:** `GET /api/v1/user-preference/list`

**Request:**
```bash
GET http://localhost:8082/api/v1/user-preference/list
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "status": true,
  "statusCode": 200,
  "message": "Categories fetched successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "3D Model",
      "img_sqr": "...",
      ...
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Face Swap",
      ...
    }
  ]
}
```

**Note the category IDs** - You'll use them in the next steps.

---

### Step 3: Set User Preferences

**Endpoint:** `POST /api/v1/user-preference`

**Request:**
```bash
POST http://localhost:8082/api/v1/user-preference
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "categoryId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "status": true,
  "statusCode": 201,
  "message": "User preference added successfully",
  "data": {
    "_id": "...",
    "userId": "507f1f77bcf86cd799439011",
    "categoryId": "507f1f77bcf86cd799439011",
    "order": 0,
    ...
  }
}
```

**To set multiple preferences with order:**

You can add multiple preferences by calling the API multiple times, or use the reorder endpoint:

**Endpoint:** `PUT /api/v1/user-preference/reorder`

**Request:**
```bash
PUT http://localhost:8082/api/v1/user-preference/reorder
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "preferences": [
    {
      "_id": "PREFERENCE_ID_1",
      "order": 1
    },
    {
      "_id": "PREFERENCE_ID_2",
      "order": 2
    }
  ]
}
```

---

### Step 4: Simulate Click Counts (Optional)

Click counts are typically recorded when users interact with categories in the app. For testing, you can:

**Option A: Direct Database Update (For Testing Only)**
```javascript
// In MongoDB
db.media_clicks.updateOne(
  { userId: ObjectId("6948df18ed602446734c3a19") },
  {
    $set: {
      "categories": [
        {
          categoryId: ObjectId("69368f722e46bd68ae188984"),
          click_count: 5,
          lastClickedAt: new Date()
        },
        {
          categoryId: ObjectId("69368e421224bcb6bdb98063"),
          click_count: 3,
          lastClickedAt: new Date()
        }
      ]
    }
  },
  { upsert: true }
);
```

**Option B: Use Your App's Click Tracking**
- Navigate to categories in your app
- Each click should increment the `click_count` in the `media_clicks` collection

---

### Step 5: Test Home API

**Endpoint:** `GET /api/v1/home`

**Request:**
```bash
GET http://localhost:8082/api/v1/home
Authorization: Bearer YOUR_TOKEN
```

**Response Structure:**
```json
{
  "status": true,
  "statusCode": 200,
  "message": "Home data fetched successfully",
  "data": {
    "section1": {
      "title": "image",
      "categories": [...]
    },
    "section2": {
      "title": "AI Face Swap",
      "categories": [
        {
          "_id": "507f1f77bcf86cd799439011",
          "name": "3D Model",
          ...
        },
        ...
      ]
    },
    "section3": {...},
    "section4": {...},
    "section5": {...},
    "section6": {...},
    "section7": {...}
  }
}
```

---

## ✅ Verification Steps

### Verify Section 2 Ordering

1. **Check User Preferences:**
   - Your preferred categories should appear first in Section 2
   - They should be sorted by the order you set (1, 2, 3...)

2. **Check Click Counts:**
   - After user preferences, categories should be sorted by click count
   - Category with 3 clicks should come before category with 2 clicks
   - Category with 2 clicks should come before category with 1 click

3. **Check Admin Order:**
   - Categories with same click count should be sorted by `section2Order`

4. **Check Deeplink:**
   - If you add `?categoryId=CATEGORY_ID` to the URL, that category should appear first

---

## 🧪 Test Scenarios

### Scenario 1: User with Preferences Only

**Setup:**
- User has 2 preferences: "3D Model" (order 1), "Face Swap" (order 2)
- No click counts

**Expected Result:**
- Section 2 shows: "3D Model" first, then "Face Swap", then other categories by admin order

---

### Scenario 2: User with Click Counts Only

**Setup:**
- User has no preferences
- Category A: 3 clicks
- Category B: 2 clicks
- Category C: 1 click

**Expected Result:**
- Section 2 shows: Category A (3 clicks), Category B (2 clicks), Category C (1 click), then others

---

### Scenario 3: User with Preferences + Click Counts

**Setup:**
- User preference: "3D Model" (order 1)
- Category A: 5 clicks (no preference)
- Category B: 3 clicks (no preference)
- Category C: 2 clicks (no preference)

**Expected Result:**
- Section 2 shows: "3D Model" (preference), then Category A (5 clicks), Category B (3 clicks), Category C (2 clicks), then others

---

### Scenario 4: With Deeplink

**Request:**
```bash
GET http://localhost:8082/api/v1/home?categoryId=507f1f77bcf86cd799439011
Authorization: Bearer YOUR_TOKEN
```

**Expected Result:**
- The category with the deeplink ID appears first
- Then user preferences
- Then click counts
- Then admin order

---

## 📝 Postman Collection Example

### Environment Variables
```
baseUrl: http://localhost:8082/api/v1
token: YOUR_JWT_TOKEN
categoryId1: 507f1f77bcf86cd799439011
categoryId2: 507f1f77bcf86cd799439012
```

### Request 1: Login
```
POST {{baseUrl}}/auth/login
Body: {
  "email": "user@example.com",
  "password": "password"
}
```

### Request 2: Set Preference
```
POST {{baseUrl}}/user-preference
Authorization: Bearer {{token}}
Body: {
  "categoryId": "{{categoryId1}}"
}
```

### Request 3: Get Home Data
```
GET {{baseUrl}}/home
Authorization: Bearer {{token}}
```

### Request 4: Get Home Data with Deeplink
```
GET {{baseUrl}}/home?categoryId={{categoryId1}}
Authorization: Bearer {{token}}
```

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized
**Solution:** Make sure you're sending a valid token in the Authorization header:
```
Authorization: Bearer YOUR_TOKEN
```

### Issue: Preferences Not Showing
**Solution:** 
- Verify preferences are saved: `GET /api/v1/user-preference`
- Check server logs for `[Home API] User ... has X preferences`
- Ensure category IDs are valid ObjectIds

### Issue: Click Counts Not Working
**Solution:**
- Verify click data exists in `media_clicks` collection
- Check that `userId` matches in both `UserPreference` and `MediaClick`
- Check server logs for click count map size

### Issue: Wrong Order
**Solution:**
- Check server logs for sorting information
- Verify preference orders are set correctly
- Verify click counts are correct in database

---

## 📊 Expected Console Logs

When testing, you should see these logs in your server console:

```
[Home API] Request received. User ID: 507f1f77bcf86cd799439011
[Home API] User 507f1f77bcf86cd799439011 has 2 preferences: 507f1f77bcf86cd799439011:1, 507f1f77bcf86cd799439012:2
[Home API] Sorting Section 2 categories. Total: 10, User preferences: 2, Click data: 3
[Home API] Section 2 sorted. First 3 categories: [
  { name: '3D Model', id: '507f1f77bcf86cd799439011', hasPreference: true, order: 1 },
  { name: 'Face Swap', id: '507f1f77bcf86cd799439012', hasPreference: true, order: 2 },
  { name: 'Category A', id: '507f1f77bcf86cd799439013', hasPreference: false, order: undefined }
]
```

---

## 🎯 Quick Test Checklist

- [ ] Login successful and token received
- [ ] User preferences set successfully
- [ ] Click counts recorded (if testing click sorting)
- [ ] Home API returns 200 status
- [ ] Section 2 categories ordered correctly:
  - [ ] Deeplink category first (if provided)
  - [ ] User preferences next (sorted by order)
  - [ ] Click counts next (descending order)
  - [ ] Admin order last

---

## 📞 Need Help?

If you encounter issues:
1. Check server console logs for detailed error messages
2. Verify all IDs are valid MongoDB ObjectIds
3. Ensure user is authenticated (token is valid)
4. Check database collections: `user_preferences`, `media_clicks`, `categories`

