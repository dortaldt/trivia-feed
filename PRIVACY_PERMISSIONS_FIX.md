# Privacy Permissions Fix for TCC Crash

## Problem
The app was crashing with `TCC: __TCC_CRASHING_DUE_TO_PRIVACY_VIOLATION__` error when users tried to select or take images for their avatar. This happens when an iOS app tries to access the camera or photo library without proper privacy permission descriptions.

## Root Cause
The app was missing required privacy permission descriptions in the iOS configuration. iOS requires apps to declare why they need access to sensitive features like camera and photo library.

## Solution Applied

### 1. Added Privacy Permission Descriptions
Updated `app.config.js` to include the required iOS privacy permissions:

```javascript
infoPlist: {
  // ... existing config
  NSCameraUsageDescription: "This app needs access to your camera to take profile photos and capture images for your avatar.",
  NSPhotoLibraryUsageDescription: "This app needs access to your photo library to select images for your profile avatar.",
  NSPhotoLibraryAddUsageDescription: "This app needs permission to save photos to your photo library."
}
```

### 2. Added expo-image-picker Plugin
Added the expo-image-picker plugin with proper permission configurations:

```javascript
plugins: [
  // ... existing plugins
  [
    "expo-image-picker",
    {
      photosPermission: "The app accesses your photos to let you select images for your profile avatar.",
      cameraPermission: "The app accesses your camera to let you take photos for your profile avatar."
    }
  ]
]
```

## Required Actions

### 1. Rebuild the App
After making these changes, you must rebuild the iOS app for the permissions to take effect:

```bash
npx expo run:ios --clear
```

The `--clear` flag ensures that any cached configurations are cleared and the new permissions are properly applied.

### 2. Test the Avatar Feature
After rebuilding:
1. Open the app on your iOS device/simulator
2. Go to your profile
3. Try to edit your avatar by selecting "Upload photo" or "Change photo"
4. The app should now properly request camera/photo library permissions
5. Grant the permissions when prompted
6. The avatar upload should work without crashing

## What These Permissions Do

- **NSCameraUsageDescription**: Explains why the app needs camera access (for taking profile photos)
- **NSPhotoLibraryUsageDescription**: Explains why the app needs to read from photo library (for selecting existing photos)
- **NSPhotoLibraryAddUsageDescription**: Explains why the app needs to save to photo library (though this might not be needed for avatar upload, it's good to have)

## Important Notes

1. **Rebuild Required**: Configuration changes in `app.config.js` only take effect after rebuilding the native app
2. **Permission Prompts**: Users will see permission prompts with the descriptions you provided
3. **User Experience**: Clear, helpful permission descriptions improve user trust and permission grant rates
4. **Testing**: Always test on a real device after making permission changes

## Future Considerations

If you add other features that require device permissions (microphone, location, etc.), remember to:
1. Add appropriate permission descriptions to the `infoPlist` section
2. Use clear, user-friendly language explaining why the permission is needed
3. Rebuild the app after making changes
4. Test the permission flow on real devices

## Verification

To verify the fix worked:
1. Check that the app no longer crashes when accessing camera/photo library
2. Verify that permission prompts appear with your custom descriptions
3. Confirm that avatar upload functionality works end-to-end 