#!/usr/bin/env python3
"""
Image Conversion Script for Tiny Tales Big Ideas
Converts PNG/JPG images to WebP format for better web performance
"""

import os
import json
from PIL import Image
import argparse
from pathlib import Path

def convert_image_to_webp(input_path, output_path, quality=85):
    """
    Convert an image to WebP format
    
    Args:
        input_path (str): Path to input image
        output_path (str): Path to output WebP image
        quality (int): WebP quality (0-100, default 85)
    
    Returns:
        tuple: (success, original_size, new_size)
    """
    try:
        # Open and convert image
        with Image.open(input_path) as img:
            # Convert RGBA to RGB if necessary (WebP supports RGBA but this can reduce file size)
            if img.mode in ('RGBA', 'LA'):
                # Create a white background
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'RGBA':
                    background.paste(img, mask=img.split()[-1])  # Use alpha channel as mask
                else:
                    background.paste(img)
                img = background
            elif img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            
            # Get original file size
            original_size = os.path.getsize(input_path)
            
            # Save as WebP
            img.save(output_path, 'WebP', quality=quality, optimize=True)
            
            # Get new file size
            new_size = os.path.getsize(output_path)
            
            return True, original_size, new_size
            
    except Exception as e:
        print(f"Error converting {input_path}: {e}")
        return False, 0, 0

def find_images_in_directory(directory, extensions=('.png', '.jpg', '.jpeg')):
    """
    Find all image files in a directory and subdirectories
    
    Args:
        directory (str): Directory to search
        extensions (tuple): File extensions to look for
    
    Returns:
        list: List of image file paths
    """
    image_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(extensions):
                image_files.append(os.path.join(root, file))
    return image_files

def update_json_files(base_dir, conversion_map):
    """
    Update JSON data files to reference new WebP images
    
    Args:
        base_dir (str): Base directory containing data files
        conversion_map (dict): Mapping of old paths to new paths
    """
    data_dir = os.path.join(base_dir, 'tinytalesbigideas.com', 'public_html', 'data')
    
    if not os.path.exists(data_dir):
        print(f"Data directory not found: {data_dir}")
        return
    
    # Find all JSON files
    json_files = []
    for file in os.listdir(data_dir):
        if file.endswith('.json'):
            json_files.append(os.path.join(data_dir, file))
    
    print(f"\nUpdating {len(json_files)} JSON files...")
    
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            updated = False
            
            # Update image paths in pages
            if 'pages' in data:
                for page in data['pages']:
                    if 'image' in page and page['image']:
                        old_path = page['image']
                        # Look for matching conversion
                        for old_file, new_file in conversion_map.items():
                            if old_path in old_file or old_file.endswith(old_path):
                                # Update to new WebP path
                                new_path = old_path.rsplit('.', 1)[0] + '.webp'
                                page['image'] = new_path
                                updated = True
                                print(f"  Updated {old_path} -> {new_path}")
                                break
            
            # Save updated JSON
            if updated:
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f"✓ Updated {os.path.basename(json_file)}")
        
        except Exception as e:
            print(f"Error updating {json_file}: {e}")

def main():
    parser = argparse.ArgumentParser(description='Convert images to WebP format')
    parser.add_argument('--quality', type=int, default=85, help='WebP quality (0-100, default: 85)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be converted without actually converting')
    parser.add_argument('--update-json', action='store_true', help='Update JSON data files to reference new WebP images')
    
    args = parser.parse_args()
    
    # Set up paths
    base_dir = os.getcwd()
    images_dir = os.path.join(base_dir, 'tinytalesbigideas.com', 'public_html', 'images')
    
    if not os.path.exists(images_dir):
        print(f"Images directory not found: {images_dir}")
        return
    
    # Find all images
    print(f"Searching for images in: {images_dir}")
    image_files = find_images_in_directory(images_dir)
    
    if not image_files:
        print("No PNG/JPG images found.")
        return
    
    print(f"Found {len(image_files)} images to convert")
    
    # Convert images
    total_original_size = 0
    total_new_size = 0
    successful_conversions = 0
    conversion_map = {}
    
    for image_file in image_files:
        # Create output path (same location, .webp extension)
        output_file = os.path.splitext(image_file)[0] + '.webp'
        
        # Skip if WebP already exists
        if os.path.exists(output_file):
            print(f"⚠ Skipping {image_file} (WebP already exists)")
            continue
        
        # Get file size info
        original_size = os.path.getsize(image_file)
        total_original_size += original_size
        
        if args.dry_run:
            print(f"Would convert: {image_file} -> {output_file}")
            print(f"  Original size: {original_size / (1024*1024):.1f} MB")
            continue
        
        print(f"Converting: {os.path.basename(image_file)}")
        success, orig_size, new_size = convert_image_to_webp(image_file, output_file, args.quality)
        
        if success:
            total_new_size += new_size
            successful_conversions += 1
            conversion_map[image_file] = output_file
            
            # Show size reduction
            reduction = ((orig_size - new_size) / orig_size) * 100
            print(f"  ✓ {orig_size / (1024*1024):.1f} MB -> {new_size / (1024*1024):.1f} MB ({reduction:.1f}% reduction)")
            
            # Optionally remove original file (commented out for safety)
            # os.remove(image_file)
            # print(f"  Removed original: {image_file}")
        else:
            print(f"  ✗ Failed to convert {image_file}")
    
    # Summary
    if not args.dry_run:
        print(f"\n--- Conversion Summary ---")
        print(f"Successfully converted: {successful_conversions}/{len(image_files)} images")
        print(f"Total size reduction: {total_original_size / (1024*1024):.1f} MB -> {total_new_size / (1024*1024):.1f} MB")
        
        if total_original_size > 0:
            overall_reduction = ((total_original_size - total_new_size) / total_original_size) * 100
            print(f"Overall reduction: {overall_reduction:.1f}%")
        
        # Update JSON files if requested
        if args.update_json and conversion_map:
            update_json_files(base_dir, conversion_map)
    
    print("\nNote: Original files are preserved. You can manually delete them after verifying the WebP versions work correctly.")

if __name__ == "__main__":
    main()
