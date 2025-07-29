#!/usr/bin/env python3
"""
Update JSON files to use WebP images instead of PNG
"""

import json
import os
import glob

def update_json_file(file_path):
    """Update a single JSON file to use WebP images"""
    print(f"Updating {os.path.basename(file_path)}...")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        updated_count = 0
        
        # Update image paths in pages
        if 'pages' in data:
            for page in data['pages']:
                if 'image' in page and page['image']:
                    old_path = page['image']
                    if old_path.endswith('.png'):
                        new_path = old_path.replace('.png', '.webp')
                        page['image'] = new_path
                        print(f"  {old_path} -> {new_path}")
                        updated_count += 1
        
        # Save updated JSON
        if updated_count > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"✓ Updated {updated_count} image references in {os.path.basename(file_path)}")
        else:
            print(f"No updates needed for {os.path.basename(file_path)}")
    
    except Exception as e:
        print(f"Error updating {file_path}: {e}")

def main():
    # Set up paths
    base_dir = os.getcwd()
    data_dir = os.path.join(base_dir, 'tinytalesbigideas.com', 'public_html', 'data')
    
    if not os.path.exists(data_dir):
        print(f"Data directory not found: {data_dir}")
        return
    
    # Find all JSON files
    json_pattern = os.path.join(data_dir, '*.json')
    json_files = glob.glob(json_pattern)
    
    if not json_files:
        print("No JSON files found.")
        return
    
    print(f"Found {len(json_files)} JSON files to update:")
    
    for json_file in json_files:
        update_json_file(json_file)
    
    print("\nAll JSON files have been updated to use WebP images!")

if __name__ == "__main__":
    main()
