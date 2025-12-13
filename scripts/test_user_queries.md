# MongoDB Queries to Test Users in Collections

## 1. Get all users from users collection
```javascript
db.users.find().pretty()
```

## 2. Count total users (excluding deleted)
```javascript
db.users.countDocuments({ isDeleted: false })
```

## 3. Get sample user document
```javascript
db.users.findOne({ isDeleted: false })
```

## 4. Get users from media_clicks collection (see which users have clicked)
```javascript
db.media_clicks.find().pretty()
```

## 5. Get unique user IDs from media_clicks
```javascript
db.media_clicks.distinct("userId")
```

## 6. Count unique users in media_clicks
```javascript
db.media_clicks.distinct("userId").length
```

## 7. Test the complete aggregation (same as backend)
```javascript
db.media_clicks.aggregate([
  // Step 1: Join with users to filter deleted users
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  // Step 2: Filter out deleted users
  {
    $match: {
      "user.isDeleted": { $ne: true },
      "user.0": { $exists: true }
    }
  },
  // Step 3: Unwind categories
  { $unwind: "$categories" },
  // Step 4: Filter valid categoryIds
  { 
    $match: { 
      "categories.categoryId": { $ne: null, $exists: true }
    } 
  },
  // Step 5: Group by categoryId and collect unique users
  {
    $group: {
      _id: "$categories.categoryId",
      totalUsers: { $addToSet: "$userId" },
      userList: { $push: "$userId" } // For debugging - see all users
    }
  },
  // Step 6: Count users
  {
    $project: {
      _id: 1,
      totalUsers: { $size: "$totalUsers" },
      userList: 1 // Show the actual user IDs
    }
  },
  // Step 7: Join with categories
  {
    $lookup: {
      from: "categories",
      localField: "_id",
      foreignField: "_id",
      as: "category"
    }
  },
  { $unwind: "$category" },
  // Step 8: Filter deleted categories
  { $match: { "category.isDeleted": { $ne: true } } },
  // Step 9: Final projection
  {
    $project: {
      categoryId: "$_id",
      categoryName: "$category.name",
      userCount: "$totalUsers",
      userList: 1 // Keep for debugging
    }
  },
  // Step 10: Sort and limit
  { $sort: { userCount: -1 } },
  { $limit: 5 }
])
```

## 8. Check specific category (e.g., Bikini) - see which users clicked it
```javascript
// First, find the category ID
db.categories.findOne({ name: "Bikini" })

// Then use that ID to find users
db.media_clicks.aggregate([
  { $unwind: "$categories" },
  { 
    $match: { 
      "categories.categoryId": ObjectId("YOUR_BIKINI_CATEGORY_ID_HERE")
    } 
  },
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  {
    $match: {
      "user.isDeleted": { $ne: true }
    }
  },
  {
    $group: {
      _id: "$userId",
      userInfo: { $first: "$user" }
    }
  },
  {
    $project: {
      userId: "$_id",
      username: { $arrayElemAt: ["$userInfo.username", 0] },
      email: { $arrayElemAt: ["$userInfo.email", 0] }
    }
  }
])
```

## 9. Compare: Total users vs Users in media_clicks
```javascript
// Total users in users collection
db.users.countDocuments({ isDeleted: false })

// Unique users in media_clicks
db.media_clicks.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  {
    $match: {
      "user.isDeleted": { $ne: true },
      "user.0": { $exists: true }
    }
  },
  {
    $group: {
      _id: "$userId"
    }
  },
  { $count: "uniqueUsers" }
])
```

## 10. See user distribution per category (detailed)
```javascript
db.media_clicks.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  {
    $match: {
      "user.isDeleted": { $ne: true },
      "user.0": { $exists: true }
    }
  },
  { $unwind: "$categories" },
  { 
    $match: { 
      "categories.categoryId": { $ne: null, $exists: true }
    } 
  },
  {
    $lookup: {
      from: "categories",
      localField: "categories.categoryId",
      foreignField: "_id",
      as: "category"
    }
  },
  { $unwind: "$category" },
  {
    $group: {
      _id: {
        categoryId: "$categories.categoryId",
        categoryName: "$category.name"
      },
      uniqueUsers: { $addToSet: "$userId" },
      userCount: { $addToSet: "$userId" }
    }
  },
  {
    $project: {
      categoryName: "$_id.categoryName",
      userCount: { $size: "$userCount" },
      uniqueUserIds: "$uniqueUsers"
    }
  },
  { $sort: { userCount: -1 } }
])
```

