import cv2
import os

video_path = 'src/assets/Video Project.mp4'
output_dir = 'src/assets/video_frames_png'

os.makedirs(output_dir, exist_ok=True)
cap = cv2.VideoCapture(video_path)

c = 1
while True:
    ret, frame = cap.read()
    if not ret:
        break
    # Save as PNG
    out_path = os.path.join(output_dir, f'ffout{c:03d}.png')
    cv2.imwrite(out_path, frame)
    c += 1

cap.release()
print(f"Extraction complete. {c-1} frames saved as PNG.")
