# MongoDB Query to Calculate Users per Category

## Query to get user count per category (matching dashboard data)

```javascript
db.media_clicks.aggregate([
  // Unwind the categories array
  { $unwind: "$categories" },
  
  // Filter out invalid categoryIds
  { 
    $match: { 
      "categories.categoryId": { $ne: null, $exists: true }
    } 
  },
  
  // Group by categoryId and collect unique user IDs
  {
    $group: {
      _id: "$categories.categoryId",
      uniqueUsers: { $addToSet: "$userId" }
    }
  },
  
  // Count the number of unique users
  {
    $project: {
      _id: 1,
      userCount: { $size: "$uniqueUsers" }
    }
  },
  
  // Join with categories to get category name
  {
    $lookup: {
      from: "categories",
      localField: "_id",
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
      categoryId: "$_id",
      categoryName: "$category.name",
      userCount: 1
    }
  },
  
  // Sort by user count descending
  { $sort: { userCount: -1 } },
  
  // Limit to top 5
  { $limit: 5 }
])
```

## Where to Run This Query:

### Option 1: MongoDB Compass (Recommended - GUI)
1. Open MongoDB Compass
2. Connect to your database
3. Click on your database name
4. Click on "Aggregations" tab
5. Paste the query above
6. Click "Run" button

### Option 2: MongoDB Shell (mongosh)
1. Open terminal/command prompt
2. Run: `mongosh "your-connection-string"`
3. Select your database: `use your-database-name`
4. Paste the query
5. Press Enter

### Option 3: VS Code MongoDB Extension
1. Install "MongoDB for VS Code" extension
2. Connect to your database
3. Open MongoDB Playground
4. Paste the query
5. Run it

## Simplified Query (without category names):

If you just want the counts without category names:

```javascript
db.media_clicks.aggregate([
  { $unwind: "$categories" },
  { 
    $match: { 
      "categories.categoryId": { $ne: null, $exists: true }
    } 
  },
  {
    $group: {
      _id: "$categories.categoryId",
      userCount: { $addToSet: "$userId" }
    }
  },
  {
    $project: {
      _id: 1,
      userCount: { $size: "$userCount" }
    }
  },
  { $sort: { userCount: -1 } },
  { $limit: 5 }
])
```

## Expected Output:

```javascript
[
  {
    categoryId: ObjectId('69368fbb2e46bd68ae18899e'),
    categoryName: "3D Model",
    userCount: 40
  },
  {
    categoryId: ObjectId('69368d62b95a6c2a75920505'),
    categoryName: "Descratch",
    userCount: 20
  },
  // ... etc
]
```

