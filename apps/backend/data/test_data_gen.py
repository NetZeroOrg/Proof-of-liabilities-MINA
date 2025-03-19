import csv
import random
import string
import sys

# List of real cryptocurrency names
CRYPTO_ASSETS = [
    "MINA", "BTC", "ETH", "SOL", "XRP", "Cardano", "DOGE", "POL",
    "AVX", "POL", "LITE", "LINK", "UNI", "S", "USDC", "USDT"
]

# List of common first and last names for email generation
FIRST_NAMES = ["john", "jane", "alex", "chris", "michael", "emily", "david", "sarah", "robert", "lisa"]
LAST_NAMES = ["smith", "johnson", "williams", "brown", "jones", "miller", "davis", "garcia", "rodriguez", "wilson"]
DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "protonmail.com"]

def generate_realistic_email():
    """
    Generates a realistic-looking email address.
    """
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    number = random.randint(1, 99)  # Adds some variation
    domain = random.choice(DOMAINS)
    return f"{first}.{last}{number}@{domain}"

def generate_asset_data(num_users: int, num_assets: int, output_file: str = "data.csv"):
    """
    Generates a CSV file with random user emails and asset values.

    :param num_users: Number of user rows to generate
    :param num_assets: Number of assets per user
    :param output_file: Name of the CSV file to write data
    """
    asset_names = random.sample(CRYPTO_ASSETS, num_assets)  # Pick random crypto assets

    with open(output_file, mode="w", newline="") as file:
        writer = csv.writer(file)
        
        writer.writerow(["UserEmail"] + asset_names)

        for _ in range(num_users):
            user_email = generate_realistic_email()
            asset_values = [round(random.uniform(10, 50000), 2) for _ in range(num_assets)]  # More realistic range
            writer.writerow([user_email] + asset_values)

    print(f"Data generation complete. File saved as '{output_file}'.")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script.py <num_users> <num_assets>")
        sys.exit(1)

    try:
        num_users = int(sys.argv[1])
        num_assets = int(sys.argv[2])
    except ValueError:
        print("Error: num_users and num_assets must be integers.")
        sys.exit(1)

    generate_asset_data(num_users, num_assets, "data.csv")
