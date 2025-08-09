import os
import json
from datetime import datetime, timedelta
import pytz

def clean_old_news():
    """Xóa tin tức cũ hơn 7 ngày"""
    data_dir = "data/news"
    js_dir = "static/js/data"
    timezone = pytz.timezone('Asia/Ho_Chi_Minh')
    cutoff_date = datetime.now(timezone) - timedelta(days=7)
    
    removed_files = []
    
    # Xóa JSON files cũ
    if os.path.exists(data_dir):
        for filename in os.listdir(data_dir):
            if filename.endswith('.json'):
                try:
                    date_str = filename.replace('.json', '')
                    file_date = datetime.strptime(date_str, '%Y-%m-%d')
                    file_date = timezone.localize(file_date)
                    
                    if file_date < cutoff_date:
                        file_path = os.path.join(data_dir, filename)
                        os.remove(file_path)
                        removed_files.append(filename)
                        
                except ValueError:
                    continue
    
    # Xóa JS files cũ
    if os.path.exists(js_dir):
        for filename in os.listdir(js_dir):
            if filename.endswith('.js') and filename != 'index.js':
                try:
                    date_str = filename.replace('.js', '')
                    file_date = datetime.strptime(date_str, '%Y-%m-%d')
                    file_date = timezone.localize(file_date)
                    
                    if file_date < cutoff_date:
                        file_path = os.path.join(js_dir, filename)
                        os.remove(file_path)
                        removed_files.append(filename)
                        
                except ValueError:
                    continue
    
    if removed_files:
        print(f"Đã xóa {len(removed_files)} file tin cũ: {', '.join(removed_files)}")
    else:
        print("Không có file tin cũ nào cần xóa")

if __name__ == "__main__":
    clean_old_news()
