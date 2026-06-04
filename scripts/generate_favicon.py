import os
from PIL import Image, ImageDraw

def run():
    # 1. Load the original leaf icon image from the data folder
    leaf_path = r"C:\Users\User\.gemini\antigravity\brain\4f785610-10d4-4b67-ba45-9472652ec1db\media__1780570341818.png"
    if not os.path.exists(leaf_path):
        print("Leaf path not found")
        return
        
    leaf = Image.open(leaf_path).convert("RGBA")
    
    # Let's inspect leaf pixels. The leaf is green on a white background.
    # We want to extract only the green/non-white pixels and make white transparent.
    width, height = leaf.size
    
    # Create a new transparent image of the same size
    clean_leaf = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    
    for x in range(width):
        for y in range(height):
            r, g, b, a = leaf.getpixel((x, y))
            # If the pixel is not close to white, keep it (which is the green leaf)
            if r < 200 or g < 200 or b < 200:
                # Keep original color
                clean_leaf.putpixel((x, y), (r, g, b, a))
                
    # Now create a high-resolution favicon canvas (e.g. 256x256)
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a dark circular background (matches chrome/dark tabs perfectly)
    circle_color = (43, 48, 53, 255) # Dark gray #2b3035
    padding = 12
    draw.ellipse(
        [padding, padding, size - padding, size - padding], 
        fill=circle_color
    )
    
    # Scale clean_leaf to fit inside the circle nicely (e.g. 200x200)
    leaf_size = 200
    scaled_leaf = clean_leaf.resize((leaf_size, leaf_size), Image.Resampling.LANCZOS)
    
    # Paste clean leaf outline onto the circular canvas, centered
    offset = (size - leaf_size) // 2
    img.paste(scaled_leaf, (offset, offset), scaled_leaf)
    
    # Save the output images
    dest_public = r"d:\Knoweb\b_LFWrWoaFgEf-1774252450686\public\favicon.png"
    dest_app = r"d:\Knoweb\b_LFWrWoaFgEf-1774252450686\app\icon.png"
    
    img.save(dest_public, "PNG")
    img.save(dest_app, "PNG")
    print("Circular dark favicon generated and saved successfully!")

if __name__ == "__main__":
    run()
