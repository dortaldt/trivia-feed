#!/bin/bash
echo "Cleaning Expo cache and restarting..."
rm -rf node_modules/.cache
rm -rf .expo
npm start -- --clear
