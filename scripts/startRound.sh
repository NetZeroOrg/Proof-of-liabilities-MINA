#!/bin/bash
# This script is used to start a round of the protocol
set -euo pipefail

# Build the project
echo "Building the project..."
if ! pnpm build; then
    echo "Error: Failed to build the project."
    exit 1
fi

# Check if the .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found!"
    exit 1
fi

# Check if USER_DATA_FILE is set in the environment
if [ -z "${USER_DATA_FILE:-}" ]; then
    echo "USER_DATA_FILE is not set in the environment. Please provide the file path:"
    read -r USER_DATA_FILE
    if [ ! -f "$USER_DATA_FILE" ]; then
        echo "Error: Provided USER_DATA_FILE does not exist."
        exit 1
    fi
fi

# Build the user tree
echo "Building the user tree..."
if ! node --env-file .env packages/interaction_scripts/dist/src/liabilities.js --userDataFile "$USER_DATA_FILE"; then
    echo "Error: Failed to build the user tree."
    exit 1
fi
echo "User tree built successfully."

# Sum up assets
echo "Summing up assets..."
if ! node --env-file .env packages/interaction_scripts/dist/src/asset.js; then
    echo "Error: Failed to sum up assets."
    exit 1
fi
echo "Assets summed up successfully and posted on chain."

# Verify solvency
echo "Verifying solvency..."
if ! node --env-file .env packages/interaction_scripts/dist/src/solvency.js proof-of-solvency; then
    echo "Error: Failed to verify solvency."
    exit 1
fi
echo "Solvency verified successfully and posted on chain."