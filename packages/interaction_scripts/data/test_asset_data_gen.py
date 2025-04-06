import csv
import random
from eth_account import Account
import sys

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
        asset_balances = {asset: random.randint(1, 10000) for asset in asset_names}
        row = [public_address] + list(asset_balances.values())
        asset_data.append(row)
    
    for _ in range(len(key_data)):
        account = Account.create()
        public_address = account.address
        asset_balances = {asset: random.randint(1, 10000) for asset in asset_names}
        row = [public_address] + list(asset_balances.values())
        asset_data.append(row)
    
    random.shuffle(asset_data)

    # Save to assets_data.csv
    with open(asset_filename, mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["Public Address"] + asset_names)
        writer.writerows(asset_data)

# Main function
def main():
    
    if len(sys.argv) != 4:
        print("Usage: python script.py <num_users> <asset_names> <out_file>")
        sys.exit(1)

    try:
        num_users = int(sys.argv[1])
        asset_names = sys.argv[2].split(',')
        out_file = sys.argv[3]
        print(num_users)
        print(asset_names)
        print(out_file)
    except ValueError:
        print("Error: num_users and num_assets must be integers.")
        sys.exit(1)

    # Generate key pairs (double the addresses) and save
    key_data = generate_key_pairs(num_users,out_file + "_keypair.csv")

    # Generate asset data and save
    generate_asset_data(key_data, asset_names, out_file + "_asset.csv")

    print(f"Generated {num_users} addresses with assets and saved to 'assets_data.csv'.")

if __name__ == "__main__":
    main()
