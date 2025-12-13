# MongoDB Query: Users with Clicks per Category

## Query to get: User → Clicks → Category Name

```javascript
db.media_clicks.aggregate([
  // Unwind categories array
  { $unwind: "$categories" },
  
  // Filter valid categoryIds
  { 
    $match: { 
      "categories.categoryId": { $ne: null, $exists: true }
    } 
  },
  
  // Join with users to get user info
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  
  // Filter out deleted users
  {
    $match: {
      "user.isDeleted": { $ne: true },
      "user.0": { $exists: true }
    }
  },
  
  // Join with categories to get category name
  {
    $lookup: {
      from: "categories",
      localField: "categories.categoryId",
      foreignField: "_id",
      as: "category"
    }
  },
  
  // Unwind category array
  { $unwind: "$category" },
  
  // Filter out deleted categories
  { $match: { "category.isDeleted": { $ne: true } } },
  
  // Project final fields
  {
    $project: {
      userId: "$userId",
      username: { $arrayElemAt: ["$user.username", 0] },
      email: { $arrayElemAt: ["$user.email", 0] },
      categoryName: "$category.name",
      clicks: "$categories.click_count",
      categoryId: "$categories.categoryId"
    }
  },
  
  // Sort by category name, then by clicks
  { $sort: { categoryName: 1, clicks: -1 } }
])
```

## Query for specific category (e.g., "3D Model"):

```javascript
db.media_clicks.aggregate([
  { $unwind: "$categories" },
  
  // Join with categories first to filter by name
  {
    $lookup: {
      from: "categories",
      localField: "categories.categoryId",
      foreignField: "_id",
      as: "category"
    }
  },
  { $unwind: "$category" },
  
  // Filter for specific category
  { 
    $match: { 
      "category.name": "3D Model",
      "category.isDeleted": { $ne: true }
    } 
  },
  
  // Join with users
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
  
  // Project final result
  {
    $project: {
      userId: "$userId",
      username: { $arrayElemAt: ["$user.username", 0] },
      email: { $arrayElemAt: ["$user.email", 0] },
      categoryName: "$category.name",
      clicks: "$categories.click_count"
    }
  },
  
  // Sort by clicks descending
  { $sort: { clicks: -1 } }
])
```

## Grouped by User and Category (Summary):

```javascript
db.media_clicks.aggregate([
  { $unwind: "$categories" },
  { 
    $match: { 
      "categories.categoryId": { $ne: null, $exists: true }
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
      "user.isDeleted": { $ne: true },
      "user.0": { $exists: true }
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
  { $match: { "category.isDeleted": { $ne: true } } },
  {
    $group: {
      _id: {
        userId: "$userId",
        categoryId: "$categories.categoryId",
        categoryName: "$category.name"
      },
      totalClicks: { $sum: "$categories.click_count" },
      username: { $first: { $arrayElemAt: ["$user.username", 0] } },
      email: { $first: { $arrayElemAt: ["$user.email", 0] } }
    }
  },
  {
    $project: {
      _id: 0,
      userId: "$_id.userId",
      username: 1,
      email: 1,
      categoryName: "$_id.categoryName",
      clicks: "$totalClicks"
    }
  },
  { $sort: { categoryName: 1, clicks: -1 } }
])
```

