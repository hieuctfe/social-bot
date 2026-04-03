# Fixing Facebook Permissions Error

## The Error

```
Invalid Scopes: pages_manage_posts, pages_manage_engagement, read_insights
```

**What this means:** Your Facebook App exists, but it doesn't have the required permissions configured yet.

---

## Solution: Configure Facebook App Permissions

### Step 1: Add Your Facebook Account as a Test User

Since your app is in Development Mode, only you and designated testers can use it.

1. Go to your Facebook App: https://developers.facebook.com/apps/794514546639803/
2. In left sidebar, click **Roles** → **Test Users** (or **Roles** → **Administrators**)
3. **Option A:** Add yourself as Admin
   - Click **Add Administrators**
   - Enter your Facebook user ID or name
   - Click **Submit**
4. **Option B:** Use your developer account (you're already added as the app creator)

---

### Step 2: Add Facebook Pages Product

Your app needs to have the Facebook Pages product enabled.

1. In your Facebook App dashboard
2. Click **Add Product** (in left sidebar or center)
3. Find **Facebook Pages** product
4. Click **Set Up** or **Configure**
5. This will enable Pages-related permissions

---

### Step 3: Request Required Permissions (Development Mode)

For development/testing, you can use these permissions without review:

**Required Permissions for Postiz:**
- `pages_show_list` - To see your Pages
- `pages_read_engagement` - To read engagement data
- `pages_manage_posts` - To create/publish posts
- `pages_read_user_content` - To read Page content

**How to enable for development:**

1. Go to **App Settings** → **Basic**
2. Scroll to **App Mode**
3. Make sure it's in **Development** mode (not Live)
4. In Development mode, you (the app developer) can use these permissions without Facebook review

---

### Step 4: Configure App Review Settings (For Development)

1. Go to **App Review** in left sidebar
2. Go to **Permissions and Features**
3. Look for these permissions:
   - `pages_show_list` - Should be available by default
   - `pages_read_engagement` - Click **Request** if needed
   - `pages_manage_posts` - Click **Request** if needed
   - `read_insights` - Click **Request** if needed

**Note:** In Development mode, these are automatically available to you (the developer) without formal approval.

---

### Step 5: Add Specific Permissions to Your OAuth Request

The issue might be that Postiz is requesting permissions your app doesn't support yet.

**Quick Fix Option:**

1. Go to **Use Cases** in your Facebook App
2. Click **Customize** or **Add Use Case**
3. Select **Authenticate and request data from users**
4. Add these permissions:
   - pages_show_list
   - pages_manage_posts
   - pages_read_engagement
   - read_insights

---

### Step 6: Ensure Facebook Login is Properly Configured

1. Go to **Facebook Login** → **Settings**
2. Verify these settings:
   - **Client OAuth Login:** ON
   - **Web OAuth Login:** ON
   - **Valid OAuth Redirect URIs:**
     ```
     http://localhost:3001/integrations/social/facebook/connect/callback
     http://localhost:4200/integrations/social/facebook/connect/callback
     ```
3. **Allowed Domains for the JavaScript SDK:**
   ```
   localhost
   ```
4. Save Changes

---

## Alternative Solution: Use Basic Permissions Only

If you're having trouble with advanced permissions, try with basic setup first:

### Minimal Facebook App Setup

1. **Product:** Only **Facebook Login** (not Pages)
2. **Permissions:** Only basic login (email, public_profile)
3. **Test:** Try connecting again

This won't allow posting, but it will let you test the OAuth flow.

---

## Step 7: Clear Cache and Retry

After making changes:

1. **Clear browser cookies** for localhost:4200 and localhost:3001
2. **Try in Incognito/Private window**
3. Go to http://localhost:4200
4. Click **Add Channel** → **Facebook**

---

## If Still Not Working: Use Business Integration Type

Some permissions are only available to certain app types.

1. Go to **App Settings** → **Basic**
2. Check **App Type**
3. If needed, you might need to convert to:
   - **Business** type (best for posting to Pages)
   - Not "Consumer" or "Gaming"

To change app type:
1. You may need to create a **new app**
2. Choose **Business** as the type
3. Then follow steps above

---

## Alternative: Try Instagram Basic Display First

Instagram might be easier to set up initially:

1. In your Facebook App, add **Instagram Basic Display** product
2. Configure it (simpler than Pages)
3. Test with Instagram first
4. Then tackle Facebook Pages

---

## Quick Debug: Check What Permissions Are Available

Run this to see what your app can do:

1. Go to **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
2. Select your app from dropdown
3. Click **Generate Access Token**
4. See what permissions are available

---

## Common Issues

### "This app is in development mode"

**Solution:** This is fine! In development mode, only you (and added testers) can use the app. This is expected for local development.

**To add testers:**
- **Roles** → **Test Users** → Add Facebook accounts

### "pages_manage_posts is not approved"

**Solution:** In Development mode, you don't need approval. Make sure:
1. Your Facebook account is the app creator/admin
2. You're logged in with that same Facebook account when testing
3. The app is definitely in Development mode (not trying to go Live)

### "Invalid redirect_uri"

**Solution:** Make sure the redirect URI is EXACTLY:
```
http://localhost:3001/integrations/social/facebook/connect/callback
```
- No trailing slash
- Exact match required

---

## Fastest Fix: Create a New Test App

If you're stuck, sometimes it's faster to start fresh:

1. Go to https://developers.facebook.com/apps/
2. Click **Create App**
3. Choose **Business** type
4. App name: "Social Bot Test v2"
5. Add products:
   - **Facebook Login** → Set up
   - **Facebook Pages** → Set up (this is key!)
6. Configure OAuth redirect:
   ```
   http://localhost:3001/integrations/social/facebook/connect/callback
   ```
7. Get new App ID and Secret
8. Update `.env` with new credentials
9. Restart Postiz

---

## What Should Work in Development Mode

In Development mode, you CAN:
- ✅ Connect YOUR Facebook Pages
- ✅ Post to YOUR Pages (that you admin)
- ✅ Test all features with your account
- ✅ Add specific test users

You CANNOT (until you submit for App Review):
- ❌ Have other users use your app
- ❌ Post to Pages you don't admin
- ❌ Use in production

**This is fine for development and testing!**

---

## Summary

The most common fix:

1. ✅ Make sure your Facebook account is the app creator
2. ✅ Add **Facebook Login** product
3. ✅ Add **Facebook Pages** product (this is crucial!)
4. ✅ Configure OAuth redirect URI
5. ✅ Keep app in Development mode
6. ✅ Try connecting again

If you're still stuck, create a new app and make sure to add **both** Facebook Login AND Facebook Pages products.

---

## Still Having Issues?

Let me know and I can help you:
1. Check your Facebook App configuration
2. Create a new app with correct setup
3. Debug the specific error message

The key is making sure **Facebook Pages** product is added to your app!
