#!/bin/bash
set -euo pipefail
pwd
# Clear the .env file
cd apps/backend-contract || { echo "Failed to change directory to apps/backend-contract"; exit 1; }
echo "Deploying contracts..."
if ! pnpm run deploy; then
    echo "Error: Contract deployment failed."
    exit 1
fi
echo "Copying contracts addresses... to the env file"
pwd
key_dir="keys/"
env_file="../../.env"


# List of known files
files=("assetVerifier.json" "liabilitiesVerifier.json" "solvencyVerifier.json")
names=("ASSET" "LIABILITIES" "SOLVENCY")

for i in "${!files[@]}"; do
    file="${files[$i]}"
    name="${names[$i]}"
    if [[ ! -f "$key_dir/$file" ]]; then
        echo "Error: File $key_dir/$file does not exist."
        exit 1
    fi

    public_key=$(jq -r '.publicKey' "$key_dir/$file" 2>/dev/null)
    if [[ -z "$public_key" || "$public_key" == "null" ]]; then
        echo "Error: Failed to extract publicKey from $key_dir/$file"
        exit 1
    fi

    echo "${name}_CONTRACT_ADDRESS=$public_key" >> "$env_file" || { echo "Failed to write to the .env file"; exit 1; }
done
echo "Contracts deployed successfully."

echo "Setting Params on solvency contract"
cd ../.. || { echo "Failed to change directory to project root"; exit 1; }
pwd
if ! node --env-file .env packages/interaction_scripts/dist/src/solvency.js set-contracts; then
    echo "Error: Failed to set params on solvency contract."
    exit 1
fi
echo "Setting Params on asset contract done successfully."