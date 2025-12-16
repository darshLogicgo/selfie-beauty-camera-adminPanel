# Deferred Deep Link Implementation Summary

## ✅ Server-Side Implementation Complete

All server-side components have been implemented and configured. Below is a complete summary of what was done.

## 📁 Files Created/Modified

### 1. **New Model: `models/deferredLink.model.js`**
   - MongoDB schema for storing deferred deep link data
   - Fields: `installRef`, `categoryId`, `tokenHash`, `featureTitle`, `imageId`, `userId`, `expiresAt`, `consumed`, `consumedAt`
   - Auto-expiration index on `expiresAt`
   - Compound index for efficient lookups

### 2. **Updated: `helper/common.helper.js`**
   - Added `hashToken()` function using SHA-256 for secure token hashing
   - Imported `crypto` module

### 3. **Updated: `controllers/share.controller.js`**
   - **Modified `handleShareDeepLink()`**:
     - Detects if app is installed via `appInstalled` query parameter
     - If app is NOT installed:
       - Generates unique `installRef` (UUID)
       - Hashes JWT token (never stores raw token)
       - Creates deferred link entry (expires in 30 minutes)
       - Redirects to Play Store with referrer: `?referrer=installRef%3D{UUID}`
     - If app IS installed: Proceeds with normal deep link flow
   
   - **New Function: `resolveInstallRef()`**:
     - Endpoint: `GET /api/share/resolve-install-ref?installRef={UUID}`
     - Validates installRef (UUID format)
     - Finds non-consumed, non-expired deferred link
     - Marks as consumed (one-time use)
     - Returns categoryId, featureTitle, imageId, and new JWT token
     - Generates fresh token for security

### 4. **Updated: `routes/share.route.js`**
   - Added new route: `GET /api/share/resolve-install-ref`
   - Includes validation middleware

### 5. **Updated: `validations/share.validation.js`**
   - Added `resolveInstallRefValidator`:
     - Validates `installRef` as required UUID v4

## 🔄 Complete Flow

### Scenario 1: App NOT Installed (Deferred Deep Link)

```
1. User clicks share link: https://your-domain.com/share/{categoryId}?token={jwt}
2. Server detects appInstalled=false (or not provided)
3. Server generates installRef (UUID)
4. Server stores deferred link:
   - installRef: UUID
   - tokenHash: SHA-256 hash of JWT
   - categoryId, featureTitle, imageId, userId
   - expiresAt: 30 minutes from now
   - consumed: false
5. Server redirects to: 
   https://play.google.com/store/apps/details?id=photo.editor.photoeditor.filtermaster&referrer=installRef%3D{UUID}
6. User installs app from Play Store
7. User opens app (first launch)
8. Android app reads install referrer using Install Referrer API
9. Android app extracts installRef from referrer
10. Android app calls: GET /api/share/resolve-install-ref?installRef={UUID}
11. Server validates and returns:
    {
      categoryId: "...",
      featureTitle: "...",
      imageId: "...",
      token: "new_jwt_token"
    }
12. Android app navigates to feature with categoryId and token
```

### Scenario 2: App IS Installed (Direct Deep Link)

```
1. User clicks share link: https://your-domain.com/share/{categoryId}?token={jwt}
2. Server detects appInstalled=true
3. Server serves HTML page with intent:// deep link
4. Android opens app directly with deep link
5. App navigates to feature immediately
```

## 🔐 Security Features

✅ **Token Hashing**: Raw JWT tokens are never stored, only SHA-256 hashes  
✅ **One-Time Use**: Each deferred link can only be consumed once  
✅ **Expiration**: Links expire after 30 minutes (configurable)  
✅ **Auto-Cleanup**: MongoDB TTL index automatically deletes expired records  
✅ **UUID Validation**: Install references must be valid UUID v4  
✅ **Token Reissuance**: Fresh JWT token generated on resolution for security  

## 📊 API Endpoints

### 1. Generate Share Link
**Endpoint**: `POST /api/share/generate-link`  
**Auth**: Required (JWT token)  
**Body**:
```json
{
  "categoryId": "507f1f77bcf86cd799439011",
  "imageId": "optional_image_id"
}
```

### 2. Handle Deep Link
**Endpoint**: `GET /api/share/:categoryId?token={jwt}&appInstalled={true|false}`  
**Auth**: Not required  
**Behavior**:
- If `appInstalled=false` or not provided → Creates deferred link and redirects to Play Store
- If `appInstalled=true` → Serves HTML page with deep link

### 3. Resolve Install Reference
**Endpoint**: `GET /api/share/resolve-install-ref?installRef={UUID}`  
**Auth**: Not required  
**Response**:
```json
{
  "status": true,
  "message": "Deferred link resolved successfully",
  "data": {
    "categoryId": "507f1f77bcf86cd799439011",
    "featureTitle": "AI Beauty Filter",
    "imageId": "optional_image_id",
    "token": "new_jwt_token_here"
  }
}
```

## 🧪 Testing

### Test Deferred Link Flow:
1. Uninstall app from device
2. Visit: `https://your-domain.com/share/{categoryId}?token={jwt}`
3. Should redirect to Play Store with referrer parameter
4. Install app
5. Open app - should automatically navigate to feature

### Test Direct Deep Link:
1. Ensure app is installed
2. Visit: `https://your-domain.com/share/{categoryId}?token={jwt}&appInstalled=true`
3. Should open app directly

### Test Resolve Endpoint:
```bash
curl "https://your-domain.com/api/share/resolve-install-ref?installRef={valid-uuid}"
```

## 📱 Android Implementation Required

See `ANDROID_IMPLEMENTATION_GUIDE.md` for complete Android implementation details.

**Key Android Requirements**:
1. Add Install Referrer library dependency
2. Create `DeferredLinkManager.kt`
3. Update `MainActivity.kt` to handle deep links
4. Configure intent filters in `AndroidManifest.xml`
5. Check for deferred link on first app launch

## ⚙️ Configuration

### Environment Variables
No new environment variables required. Uses existing:
- `BASE_URL` or `SERVER_URL` for redirect URLs
- `JWT_SECRET_KEY` for token generation

### Package Name
Current package name: `photo.editor.photoeditor.filtermaster`  
Update in `controllers/share.controller.js` if different.

### Expiration Time
Default: 30 minutes  
To change, modify in `controllers/share.controller.js`:
```javascript
const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
```

## 🐛 Troubleshooting

### Issue: Deferred links not being created
- Check if `appInstalled` parameter is being sent correctly
- Verify MongoDB connection
- Check server logs for errors

### Issue: Resolve endpoint returns 404
- Verify installRef is valid UUID
- Check if link has expired (30 minutes)
- Verify link hasn't been consumed already
- Check MongoDB for the record

### Issue: Play Store redirect not working
- Verify package name is correct
- Check URL encoding of referrer parameter
- Test Play Store URL manually

## 📝 Next Steps

1. **Review Android Implementation Guide**: See `ANDROID_IMPLEMENTATION_GUIDE.md`
2. **Update Package Name**: Verify `photo.editor.photoeditor.filtermaster` is correct
3. **Test Endpoints**: Use Postman or curl to test all endpoints
4. **Implement Android Code**: Follow the Android guide step-by-step
5. **Add Analytics**: Optional - track deferred link usage
6. **Monitor**: Set up logging/monitoring for deferred link resolution

## ✅ Checklist

- [x] DeferredLink model created
- [x] Token hashing function added
- [x] Share controller updated with deferred link logic
- [x] Resolve endpoint implemented
- [x] Routes configured
- [x] Validation added
- [x] Android implementation guide created
- [ ] Android code implemented (pending)
- [ ] Testing completed (pending)
- [ ] Production deployment (pending)

---

**Status**: Server-side implementation is **100% complete** and ready for Android integration.

