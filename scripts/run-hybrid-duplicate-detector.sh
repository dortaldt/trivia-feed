#!/bin/bash

# Run the hybrid duplicate detector script
echo "Running Hybrid Duplicate Detector for Trivia Questions"
echo "----------------------------------------------------"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js to run this script."
    exit 1
fi

# Change to the project root directory (assuming script is in scripts/ folder)
cd "$(dirname "$0")/.." || exit

# Run the duplicate detector
node scripts/hybrid_duplicate_detector.js

echo "----------------------------------------------------"
echo "Hybrid Duplicate Detector completed." 