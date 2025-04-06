#!/bin/bash
set -euo pipefail
cd apps/backend-contract
Check if deployForce flag is given
if [[ "${1:-}" == "--deployForce" ]]; then
    echo "deployForce flag detected. Deploying contracts without checks..."
    if ! pnpm run deploy; then
        echo "Error: Contract deployment failed."
        exit 1
    fi
    echo "Contracts deployed successfully with deployForce flag."
    exit 0
fi
# Clear the .env file
env_file="../../.env"
required_vars=("ASSET_CONTRACT_ADDRESS" "LIABILITIES_CONTRACT_ADDRESS" "SOLVENCY_CONTRACT_ADDRESS")

# Check if all required variables are already present in the .env file
all_vars_present=true
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" "$env_file"; then
        all_vars_present=false
        break
    fi
done

if $all_vars_present; then
    echo "All required variables are already present in the .env file. Skipping contract deployment."
    exit 0
fi

echo "Checking if contract addresses already exist in the key directory..."
files=("assetVerifier.json" "liabilitiesVerifier.json" "solvencyVerifier.json")
key_dir="keys/"
addresses_exist=true
for file in "${files[@]}"; do
    if [[ ! -f "$key_dir/$file" ]]; then
        addresses_exist=false
        break
    fi
done

if $addresses_exist; then
    echo "Contract addresses already exist in the key directory. Skipping deployment."
else
    echo "Deploying contracts..."
    if ! pnpm run deploy; then
        echo "Error: Contract deployment failed."
        exit 1
    fi
    echo "Copying contracts addresses... to the env file"
fi

pwd

# List of known files

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