import csv
import random
from eth_account import Account

# Function to generate Ethereum key pairs and save to keypair.csv
def generate_key_pairs(num_addresses, keypair_filename="keypair.csv"):
    key_data = []

    for _ in range(num_addresses):  # Double the number of addresses
        account = Account.create()
        secret_key = account.key.hex()
        public_address = account.address
        key_data.append([secret_key, public_address])

    # Save to keypair.csv
    with open(keypair_filename, mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["Secret Key", "Public Address"])
        writer.writerows(key_data)

    return key_data

# Function to generate asset balances and save to assets_data.csv
def generate_asset_data(key_data, asset_names, asset_filename="assets_data.csv"):
    asset_data = []

    for secret_key, public_address in key_data:
        # Generate random balances for each asset
        asset_balances = {asset: round(random.uniform(0.1, 1000), 4) for asset in asset_names}
        row = [public_address] + list(asset_balances.values())
        asset_data.append(row)

    # Save to assets_data.csv
    with open(asset_filename, mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["Public Address"] + asset_names)
        writer.writerows(asset_data)

# Main function
def main():
    
    # Get number of addresses
    num_addresses = 1000

    # Get asset names as comma-separated values
    asset_names = [
        "POL",
        "LINK",
        "MINA",
        "USDT",
        "ETH",
        "AVX",
        "USDC"
    ]
    # Generate key pairs (double the addresses) and save
    key_data = generate_key_pairs(num_addresses)

    # Generate asset data and save
    generate_asset_data(key_data, asset_names)

    print(f"Generated {num_addresses} addresses with assets and saved to 'assets_data.csv'.")

if __name__ == "__main__":
    main()
