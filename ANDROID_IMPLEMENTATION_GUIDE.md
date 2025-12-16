# Android Deferred Deep Link Implementation Guide

## 📋 Overview

This guide provides complete Android implementation for deferred deep linking using Play Store Install Referrer (without Firebase).

## 🔧 Prerequisites

1. **Add Install Referrer Library** to your `build.gradle` (app level):

```gradle
dependencies {
    implementation 'com.android.installreferrer:installreferrer:2.2'
}
```

2. **Add Internet Permission** to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

3. **Configure Deep Link Intent Filters** in `AndroidManifest.xml`:

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTop">
    
    <!-- Deep Link Intent Filter -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="photoeditor"
            android:host="share" />
    </intent-filter>
    
    <!-- Standard Deep Link -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="https"
            android:host="your-domain.com"
            android:pathPrefix="/share" />
    </intent-filter>
</activity>
```

## 📱 Implementation Steps

### Step 1: Create DeferredLinkManager.kt

Create a new file `DeferredLinkManager.kt`:

```kotlin
package com.yourpackage.deeplink

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
import com.android.installreferrer.api.ReferrerDetails
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class DeferredLinkManager(private val context: Context) {
    
    private val TAG = "DeferredLinkManager"
    private val prefs: SharedPreferences = 
        context.getSharedPreferences("deferred_link_prefs", Context.MODE_PRIVATE)
    private val KEY_INSTALL_REF_CHECKED = "install_ref_checked"
    private val KEY_DEFERRED_LINK_RESOLVED = "deferred_link_resolved"
    
    // Replace with your actual backend URL
    private val BASE_URL = "https://your-backend-domain.com/api/share"
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()
    
    /**
     * Check for deferred deep link on first app launch
     * Call this in your Application class or MainActivity onCreate
     */
    fun checkDeferredLink(callback: (DeferredLinkResult?) -> Unit) {
        // Only check once per app install
        if (prefs.getBoolean(KEY_INSTALL_REF_CHECKED, false)) {
            callback(null)
            return
        }
        
        val referrerClient = InstallReferrerClient.newBuilder(context).build()
        
        referrerClient.startConnection(object : InstallReferrerStateListener {
            override fun onInstallReferrerSetupFinished(responseCode: Int) {
                when (responseCode) {
                    InstallReferrerClient.InstallReferrerResponse.OK -> {
                        try {
                            val response: ReferrerDetails = referrerClient.installReferrer
                            val referrer = response.installReferrer
                            
                            Log.d(TAG, "Install referrer: $referrer")
                            
                            // Extract installRef from referrer string
                            // Format: installRef=UUID
                            val installRef = extractInstallRef(referrer)
                            
                            if (!installRef.isNullOrEmpty()) {
                                // Mark as checked
                                prefs.edit().putBoolean(KEY_INSTALL_REF_CHECKED, true).apply()
                                
                                // Resolve deferred link from server
                                resolveDeferredLink(installRef, callback)
                            } else {
                                prefs.edit().putBoolean(KEY_INSTALL_REF_CHECKED, true).apply()
                                callback(null)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error reading install referrer", e)
                            prefs.edit().putBoolean(KEY_INSTALL_REF_CHECKED, true).apply()
                            callback(null)
                        } finally {
                            referrerClient.endConnection()
                        }
                    }
                    InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED -> {
                        Log.w(TAG, "Install referrer not supported")
                        prefs.edit().putBoolean(KEY_INSTALL_REF_CHECKED, true).apply()
                        callback(null)
                    }
                    InstallReferrerClient.InstallReferrerResponse.SERVICE_UNAVAILABLE -> {
                        Log.w(TAG, "Install referrer service unavailable")
                        prefs.edit().putBoolean(KEY_INSTALL_REF_CHECKED, true).apply()
                        callback(null)
                    }
                }
            }
            
            override fun onInstallReferrerServiceDisconnected() {
                Log.w(TAG, "Install referrer service disconnected")
                prefs.edit().putBoolean(KEY_INSTALL_REF_CHECKED, true).apply()
                callback(null)
            }
        })
    }
    
    /**
     * Extract installRef from referrer string
     * Format: installRef=UUID
     */
    private fun extractInstallRef(referrer: String?): String? {
        if (referrer.isNullOrEmpty()) return null
        
        return try {
            val params = referrer.split("&")
            for (param in params) {
                if (param.startsWith("installRef=")) {
                    return param.substring("installRef=".length)
                }
            }
            null
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting installRef", e)
            null
        }
    }
    
    /**
     * Resolve deferred link from server
     */
    private fun resolveDeferredLink(
        installRef: String,
        callback: (DeferredLinkResult?) -> Unit
    ) {
        // Check if already resolved
        if (prefs.getBoolean("$KEY_DEFERRED_LINK_RESOLVED_$installRef", false)) {
            callback(null)
            return
        }
        
        // Run network call on background thread
        Thread {
            try {
                val url = "$BASE_URL/resolve-install-ref?installRef=$installRef"
                val request = Request.Builder()
                    .url(url)
                    .get()
                    .build()
                
                val response = client.newCall(request).execute()
                
                if (response.isSuccessful) {
                    val responseBody = response.body?.string()
                    val json = JSONObject(responseBody ?: "{}")
                    
                    if (json.getBoolean("status")) {
                        val data = json.getJSONObject("data")
                        val result = DeferredLinkResult(
                            categoryId = data.getString("categoryId"),
                            featureTitle = data.getString("featureTitle"),
                            imageId = if (data.has("imageId") && !data.isNull("imageId")) {
                                data.getString("imageId")
                            } else null,
                            token = data.getString("token")
                        )
                        
                        // Mark as resolved
                        prefs.edit()
                            .putBoolean("$KEY_DEFERRED_LINK_RESOLVED_$installRef", true)
                            .apply()
                        
                        // Return result on main thread
                        android.os.Handler(android.os.Looper.getMainLooper()).post {
                            callback(result)
                        }
                        return
                    }
                }
                
                // If failed, mark as checked to prevent retries
                prefs.edit()
                    .putBoolean("$KEY_DEFERRED_LINK_RESOLVED_$installRef", true)
                    .apply()
                
                android.os.Handler(android.os.Looper.getMainLooper()).post {
                    callback(null)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error resolving deferred link", e)
                android.os.Handler(android.os.Looper.getMainLooper()).post {
                    callback(null)
                }
            }
        }.start()
    }
}

/**
 * Data class for deferred link result
 */
data class DeferredLinkResult(
    val categoryId: String,
    val featureTitle: String,
    val imageId: String?,
    val token: String
)
```

### Step 2: Update MainActivity.kt

Handle both direct deep links and deferred links:

```kotlin
package com.yourpackage

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.yourpackage.deeplink.DeferredLinkManager
import com.yourpackage.deeplink.DeferredLinkResult

class MainActivity : AppCompatActivity() {
    
    private val TAG = "MainActivity"
    private lateinit var deferredLinkManager: DeferredLinkManager
    private var isFirstLaunch = true
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        deferredLinkManager = DeferredLinkManager(this)
        
        // Check for deferred link on first launch
        if (isFirstLaunch) {
            checkDeferredLink()
            isFirstLaunch = false
        }
        
        // Handle direct deep link
        handleDeepLink(intent)
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }
    
    /**
     * Check for deferred deep link
     */
    private fun checkDeferredLink() {
        deferredLinkManager.checkDeferredLink { result ->
            if (result != null) {
                Log.d(TAG, "Deferred link resolved: ${result.categoryId}")
                navigateToFeature(result)
            } else {
                Log.d(TAG, "No deferred link found")
            }
        }
    }
    
    /**
     * Handle direct deep link (when app is already installed)
     */
    private fun handleDeepLink(intent: Intent?) {
        val data: Uri? = intent?.data
        
        if (data != null) {
            Log.d(TAG, "Deep link received: $data")
            
            // Handle photoeditor://share/{categoryId}?token={token}
            if (data.scheme == "photoeditor" && data.host == "share") {
                val categoryId = data.pathSegments?.getOrNull(0)
                val token = data.getQueryParameter("token")
                
                if (!categoryId.isNullOrEmpty() && !token.isNullOrEmpty()) {
                    navigateToFeature(
                        categoryId = categoryId,
                        token = token,
                        imageId = data.getQueryParameter("imageId")
                    )
                    return
                }
            }
            
            // Handle https://your-domain.com/share/{categoryId}?token={token}
            if (data.scheme == "https" && data.host == "your-domain.com") {
                val pathSegments = data.pathSegments
                if (pathSegments != null && pathSegments.size >= 2 && pathSegments[0] == "share") {
                    val categoryId = pathSegments[1]
                    val token = data.getQueryParameter("token")
                    
                    if (!categoryId.isEmpty() && !token.isNullOrEmpty()) {
                        navigateToFeature(
                            categoryId = categoryId,
                            token = token,
                            imageId = data.getQueryParameter("imageId")
                        )
                        return
                    }
                }
            }
        }
    }
    
    /**
     * Navigate to feature based on categoryId
     */
    private fun navigateToFeature(
        result: DeferredLinkResult? = null,
        categoryId: String? = null,
        token: String? = null,
        imageId: String? = null
    ) {
        val finalCategoryId = result?.categoryId ?: categoryId
        val finalToken = result?.token ?: token
        val finalImageId = result?.imageId ?: imageId
        
        if (finalCategoryId.isNullOrEmpty() || finalToken.isNullOrEmpty()) {
            Log.e(TAG, "Invalid deep link parameters")
            return
        }
        
        // TODO: Navigate to your feature screen
        // Example:
        // val intent = Intent(this, FeatureActivity::class.java).apply {
        //     putExtra("categoryId", finalCategoryId)
        //     putExtra("token", finalToken)
        //     if (!finalImageId.isNullOrEmpty()) {
        //         putExtra("imageId", finalImageId)
        //     }
        // }
        // startActivity(intent)
        
        Log.d(TAG, "Navigating to feature: categoryId=$finalCategoryId, imageId=$finalImageId")
    }
}
```

### Step 3: Update Application Class (Optional but Recommended)

Create or update your `Application.kt`:

```kotlin
package com.yourpackage

import android.app.Application
import com.yourpackage.deeplink.DeferredLinkManager

class MyApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Check for deferred link when app starts
        // This ensures deferred links are checked even if MainActivity is not the launcher
        val deferredLinkManager = DeferredLinkManager(this)
        deferredLinkManager.checkDeferredLink { result ->
            if (result != null) {
                // Store result to be picked up by MainActivity
                // You can use SharedPreferences or a singleton
                DeepLinkHandler.setPendingDeferredLink(result)
            }
        }
    }
}
```

### Step 4: Add Network Security Config (For HTTPS)

If your backend uses HTTPS, add `network_security_config.xml`:

```xml
<!-- res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">your-backend-domain.com</domain>
    </domain-config>
</network-security-config>
```

Update `AndroidManifest.xml`:

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

## 🔒 Security Considerations

1. **Token Validation**: Always validate the token on your backend before processing
2. **Rate Limiting**: Implement rate limiting on the resolve endpoint
3. **One-Time Use**: Deferred links are automatically marked as consumed
4. **Expiration**: Links expire after 30 minutes (configurable on backend)

## 🧪 Testing

### Test Direct Deep Link (App Installed):
```bash
adb shell am start -W -a android.intent.action.VIEW -d "photoeditor://share/CATEGORY_ID?token=YOUR_TOKEN" com.yourpackage
```

### Test Deferred Deep Link (App Not Installed):
1. Uninstall the app
2. Click a share link that redirects to Play Store
3. Install the app
4. Open the app - it should automatically navigate to the feature

## 📝 Important Notes

1. **Install Referrer is only available once** - Store the result if you need to use it later
2. **First Launch Only** - The deferred link check should only run on first app launch
3. **Network Calls** - Always handle network failures gracefully
4. **Thread Safety** - Use main thread for UI updates, background thread for network calls

## 🐛 Troubleshooting

### Issue: Install Referrer returns empty
- **Solution**: Ensure the Play Store URL includes the referrer parameter correctly
- Check that the app was installed from Play Store (not sideloaded)

### Issue: Deferred link not resolving
- **Solution**: 
  - Check network connectivity
  - Verify backend URL is correct
  - Check server logs for errors
  - Ensure installRef is valid UUID

### Issue: Deep link not opening app
- **Solution**:
  - Verify intent filters in AndroidManifest.xml
  - Test with `adb` command
  - Check app package name matches

## 📚 API Endpoints

### Backend Endpoint: Resolve Install Reference

**URL**: `GET /api/share/resolve-install-ref?installRef={UUID}`

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

**Error Response**:
```json
{
  "status": false,
  "message": "Deferred link not found or expired",
  "data": null
}
```

## ✅ Checklist

- [ ] Install Referrer library added to build.gradle
- [ ] Internet permission added to AndroidManifest.xml
- [ ] Deep link intent filters configured
- [ ] DeferredLinkManager.kt created
- [ ] MainActivity updated to handle deep links
- [ ] Network security config added (if needed)
- [ ] Backend URL updated in DeferredLinkManager
- [ ] Testing completed for both direct and deferred links

---

**Need Help?** Check the server logs and Android logcat for detailed error messages.

