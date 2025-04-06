#!/bin/bash
# This script is used to start a round of the protocol
set -euo pipefail

# Parse command line arguments
LOAD_STORE_FLAG=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --load-store)
            LOAD_STORE_FLAG="--load-store true"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Build the project
echo "Building the project..."
if ! pnpm build --force; then
        echo "Error: Failed to build the project."
        exit 1
fi

# Check if the .env file exists
if [ ! -f ".env" ]; then
        echo "Error: .env file not found!"
        exit 1
fi

# Build the user tree
echo "Building the user tree..."
if ! node --env-file ".env" packages/interaction_scripts/dist/src/liabilities.js $LOAD_STORE_FLAG; then
        echo "Error: Failed to build the user tree."
        exit 1
fi
echo "User tree built successfully."

# Sum up assets
echo "Summing up assets..."
if ! node --env-file ".env" packages/interaction_scripts/dist/src/assets.js; then
        echo "Error: Failed to sum up assets."
        exit 1
fi
echo "Assets summed up successfully and posted on chain."
sleep 5m

# Verify solvency
echo "Verifying solvency..."
if ! node --env-file .env packages/interaction_scripts/dist/src/solvency.js proof-of-solvency; then
        echo "Error: Failed to verify solvency."
        exit 1
fi
echo "Solvency verified successfully and posted on chain."