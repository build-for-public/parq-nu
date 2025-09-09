#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Download and combine parking data from Gothenburg's parking APIs
"""

import json
import random
import requests
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fetch_parking_data():
    """Fetch data from all three parking API endpoints"""
    
    # Get API key from environment
    api_key = os.getenv('GOTHENBURG_API_KEY')
    if not api_key:
        print("Error: GOTHENBURG_API_KEY not found in .env file")
        return False
    
    # Create data directory if it doesn't exist
    data_dir = Path('./data')
    data_dir.mkdir(exist_ok=True)
    
    # API endpoints and their corresponding file names
    endpoints = [
        {
            'url': f'https://data.goteborg.se/ParkingService/v2.3/PublicTimeParkings/{api_key}?format=json',
            'file': 'public_time_parking.json',
            'name': 'Public Time Parkings'
        },
        {
            'url': f'https://data.goteborg.se/ParkingService/v2.3/PublicTollParkings/{api_key}?format=json',
            'file': 'public_parking.json',
            'name': 'Public Toll Parkings'
        },
        {
            'url': f'https://data.goteborg.se/ParkingService/v2.3/PrivateTollParkings/{api_key}?format=json',
            'file': 'private_parking.json',
            'name': 'Private Toll Parkings'
        }
    ]
    
    # Fetch data from each endpoint
    for endpoint in endpoints:
        print(f"Fetching {endpoint['name']}...")
        try:
            response = requests.get(endpoint['url'], timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Save to data directory
            file_path = data_dir / endpoint['file']
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"  Saved {len(data) if isinstance(data, list) else 1} records to {file_path}")
            
        except requests.exceptions.RequestException as e:
            print(f"  Error fetching data: {e}")
            return False
        except json.JSONDecodeError as e:
            print(f"  Error parsing JSON: {e}")
            return False
    
    return True

def convert_parking_record(original_record, new_id):
    """Convert original parking record to new format"""
    
    # Extract parking spaces (default to random if not specified)
    total_spaces = original_record.get('ParkingSpaces', random.randint(10, 100))
    if isinstance(total_spaces, str):
        try:
            total_spaces = int(total_spaces)
        except ValueError:
            total_spaces = random.randint(10, 100)
    
    # Generate available spaces (random between 0 and total)
    available_spaces = random.randint(0, total_spaces)
    
    # Determine hourly rate based on area and type
    hourly_rate = round(random.uniform(2.0, 8.0), 1)
    
    # Convert max parking time
    max_time = original_record.get('MaxParkingTime', '2 tim')
    max_time_limit = convert_time_limit(max_time)
    
    # Determine type based on owner and name
    parking_type = determine_type(original_record)
    
    # Generate amenities based on type and random factors
    amenities = generate_amenities(parking_type)
    
    return {
        "id": str(new_id),
        "name": original_record.get('Name', f"Parking Area {new_id}"),
        "lat": float(original_record.get('Lat', 0)),
        "lng": float(original_record.get('Long', 0)),
        "totalSpaces": total_spaces,
        "availableSpaces": available_spaces,
        "hourlyRate": hourly_rate,
        "maxTimeLimit": max_time_limit,
        "type": parking_type,
        "amenities": amenities
    }

def convert_time_limit(time_str):
    """Convert Swedish time format to English"""
    if not time_str:
        return "2 hours"
    
    time_str = time_str.lower()
    
    # Convert Swedish time units
    if 'min' in time_str:
        return time_str.replace('min', 'minutes')
    elif 'tim' in time_str:
        return time_str.replace('tim', 'hours')
    elif '24 tim' in time_str:
        return "24 hours"
    else:
        return time_str

def determine_type(record):
    """Determine parking type based on record data"""
    name = record.get('Name', '').lower()
    owner = record.get('Owner', '').lower()
    
    if 'garage' in name or 'parking' in name:
        return "garage"
    elif 'privat' in owner or 'private' in name:
        return "private"
    elif any(keyword in name for keyword in ['plan', 'plats', 'gata', 'vag']):
        return "street"
    else:
        return "lot"

def generate_amenities(parking_type):
    """Generate realistic amenities based on parking type"""
    all_amenities = ["covered", "security", "ev_charging", "handicap_accessible", "payment_station", "lighting"]
    
    if parking_type == "garage":
        # Garages typically have more amenities
        base_amenities = ["covered", "security", "lighting"]
        additional = random.sample(["ev_charging", "handicap_accessible", "payment_station"], 
                                 random.randint(1, 3))
    elif parking_type == "private":
        base_amenities = ["security"]
        additional = random.sample(["covered", "ev_charging", "handicap_accessible"], 
                                 random.randint(0, 2))
    else:
        # Street/lot parking
        base_amenities = ["payment_station"]
        additional = random.sample(["lighting", "handicap_accessible"], 
                                 random.randint(0, 2))
    
    return list(set(base_amenities + additional))

def combine_parking_data():
    """Combine all parking JSON files into one with new format"""
    
    data_dir = Path('./data')
    
    # File names to combine
    files = [
        'public_parking.json',
        'private_parking.json', 
        'public_time_parking.json'
    ]
    
    combined_data = []
    record_id = 1
    
    # Read each file and add to combined data
    for file_name in files:
        file_path = data_dir / file_name
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
                print(f"Processing {len(data)} records from {file_name}")
                
                for original_record in data:
                    converted_record = convert_parking_record(original_record, record_id)
                    combined_data.append(converted_record)
                    record_id += 1
                    
        except FileNotFoundError:
            print(f"Warning: {file_path} not found, skipping...")
        except json.JSONDecodeError:
            print(f"Error: Could not parse {file_path}, skipping...")
    
    # Write combined data to new file
    output_file = data_dir / 'combined_parking_data.json'
    with open(output_file, 'w', encoding='utf-8') as file:
        json.dump(combined_data, file, indent=2, ensure_ascii=False)
    
    print(f"\nConverted and combined {len(combined_data)} total parking records")
    print(f"Output saved to: {output_file}")
    
    # Show a sample record
    if combined_data:
        print(f"\nSample converted record:")
        print(json.dumps(combined_data[0], indent=2))

def main():
    """Main function to download and combine parking data"""
    print("Parking Data Downloader and Combiner")
    print("=" * 50)
    
    # Step 1: Fetch data from APIs
    print("\nStep 1: Fetching data from APIs...")
    if not fetch_parking_data():
        print("Failed to fetch data. Exiting.")
        return
    
    # Step 2: Combine and convert data
    print("\nStep 2: Combining and converting data...")
    combine_parking_data()
    
    print("\nProcess completed successfully!")

if __name__ == "__main__":
    main()