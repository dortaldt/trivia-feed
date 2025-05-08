# Avatar Upload Feature

This document explains how the avatar upload feature works and how to set it up.

## Overview

The avatar upload feature allows users to:
- Upload a profile picture from their device
- See their avatar instantly after upload
- Remove their avatar if desired

Images are stored in Supabase Storage in the `userimages` bucket.

### Platform Support

This feature works on:
- **iOS/Android** - using Expo Image Picker
- **Web** - using browser's file input

## Setup Instructions

### 1. Supabase Storage Setup

The app requires a Supabase bucket named `userimages` with appropriate permissions:

#### Manual Setup (Supabase Dashboard)
1. Go to your Supabase dashboard
2. Navigate to Storage > Buckets
3. Create a new bucket named `userimages`
4. Set the bucket to public
5. Add the following policies to the bucket:
   - **SELECT** policy for PUBLIC (anyone can view avatars)
   - **INSERT** policy for AUTHENTICATED (any authenticated user can upload)
   - **UPDATE** policy for AUTHENTICATED with CHECK `(owner = auth.uid())`
   - **DELETE** policy for AUTHENTICATED with CHECK `(owner = auth.uid())`

#### Automated Setup (Script)
You can also use the provided setup script:

```bash
# Set your Supabase credentials
export SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_KEY=your_service_key  # This needs to be the service_role key, not anon key

# Run the setup script
node scripts/setup-storage-bucket.js
```

### 2. Required Dependencies

The feature relies on these packages:
- `expo-image-picker`: For selecting images from the device
- `@supabase/supabase-js`: For interacting with Supabase storage

Install them with:
```bash
npm install expo-image-picker
```

## How It Works

1. User visits their profile page
2. In edit mode, they can tap "Upload Image" to select an image
3. The image is uploaded to Supabase Storage with a unique filename
4. The public URL is retrieved and saved to the user's profile
5. The avatar is immediately displayed on the profile

## Implementation Details

### Filename Format

Images are named using this format:
```
{user_id}-{timestamp}.{extension}
```

This ensures uniqueness and allows for permission controls based on user ID.

### Storage Path

Images are stored in the root of the `userimages` bucket.

### File Size Limits

The maximum file size is set to 2MB to ensure reasonable performance.

### Web Platform Implementation

For web platforms, the avatar upload process works differently:
1. When the user clicks "Upload Image", a hidden file input is created and triggered
2. After selecting a file, the browser provides a File object
3. This File object is uploaded directly to Supabase storage
4. If the main upload method fails, an alternative direct API call is made as a fallback

Web uploads have the same file size limits and generate the same URL format as mobile uploads.

## Troubleshooting

### Error: "Failed to fetch" or "Error uploading avatar"

This is a common error that can have several causes:

#### Network Connectivity Issues
- **Check if your device has internet access**: Make sure you're connected to a working internet connection.
- **Verify Supabase endpoint is accessible**: Try accessing your Supabase URL in a browser or run `scripts/check-bucket.js` to test connectivity.
- **Check for network restrictions**: Some networks (corporate, school, etc.) might block certain API requests.

#### Authentication Problems
- **Check if you're logged in**: The upload feature requires authentication. Try logging out and back in.
- **Verify session validity**: Your session might have expired. Try refreshing the app or restarting it.
- **Check Supabase auth configuration**: Make sure your Supabase project has authentication properly set up.

#### Storage Configuration Issues
- **Verify bucket exists**: The 'userimages' bucket must exist in your Supabase project.
- **Check bucket permissions**: The bucket must be set to public and have proper RLS policies.
- **Verify storage policies**: Policies must allow uploads for authenticated users.
- **Check CORS settings**: Make sure CORS is properly configured to allow uploads from your app's origin.

#### Specific Mobile Issues
- **Large image size**: If your selected image is very large, try selecting a smaller image.
- **Expo Go limitations**: If testing in Expo Go, there might be additional network restrictions.
- **OS-specific permissions**: Make sure your app has the necessary permissions for file access.

#### How to Fix

1. **Run diagnostic check**:
```bash
cd scripts
node check-bucket.js
```

2. **Recreate storage bucket with proper configuration**:
```bash
cd scripts
node setup-storage-bucket.js
```

3. **Check the app logs**:
   - Look for any red error messages in the console logs
   - Pay attention to response status codes (403 = permission denied, 404 = not found)

4. **Enable detailed logging in the app**:
   The app now includes more detailed logging to help diagnose issues. Look for logs related to:
   - Session status and authentication
   - Image blob creation
   - Fetch response details
   - Supabase client status

5. **Try alternate upload method**:
   If the regular upload method fails, the app will automatically attempt a direct fetch-based upload,
   which might work in some cases where the Supabase client has connectivity issues.

6. **Check your Supabase configuration in .env**:
   Make sure your SUPABASE_URL and SUPABASE_ANON_KEY are correctly set in your .env file.

### Error: "Cannot access image URL" after successful upload

If the upload succeeds but the image doesn't appear:

1. **Check public URL access**: The bucket must be set to public, and the RLS policy must allow public SELECT.
2. **Verify image format**: Some image formats might not be properly displayed. Try with a standard JPEG or PNG.
3. **Check image size**: Very large images might time out during download.

### Debug Logging

To help diagnose issues with avatar uploads, detailed logging has been added to the `uploadAvatar` function. Check the console logs for error messages that include:
- File details (name, size, type)
- Fetch response information
- Supabase storage error messages

### Testing the Storage Bucket

You can test if your storage bucket is correctly configured by running:

```bash
# Replace with your actual URL and key
curl -X POST \
  "https://your-project-id.supabase.co/storage/v1/object/userimages/test.jpg" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@/path/to/test-image.jpg"
```

If successful, you'll receive a JSON response with the upload details. 