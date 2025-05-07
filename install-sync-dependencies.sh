#!/bin/bash

# Install dependencies for User Tracking Sync feature

echo "Installing dependencies for User Tracking Sync feature..."

# Install NetInfo for network connectivity checking
npm install @react-native-community/netinfo --save

# Install expo-device for device information
npm install expo-device --save

echo "Dependencies installed successfully!"
echo "You may need to restart your development server for the changes to take effect." 