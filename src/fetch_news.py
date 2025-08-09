import feedparser
import json
import os
from datetime import datetime, timedelta
import pytz
import requests
from bs4 import BeautifulSoup
import hashlib

class NewsAggregator:
    def __init__(self):
        self.data_dir = "data/news"
        self.sources_file = "src/rss_sources.json"
        self.timezone = pytz.timezone('Asia/Ho_Chi_Minh')
        
        # Tạo thư mục data nếu chưa có
        os.makedirs(self.data_dir, exist_ok=True)
        
    def load_sources(self):
        """Load RSS sources từ file JSON"""
        try:
            with open(self.sources_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            # Tạo file mặc định nếu chưa có
            default_sources = {
                "sources": [
                    {
                        "name": "VnExpress",
                        "url": "https://vnexpress.net/rss/tin-moi-nhat.rss",
                        "category": "Tổng hợp"
                    },
                    {
                        "name": "Dân Trí",
                        "url": "https://dantri.com.vn/rss.rss",
                        "category": "Tổng hợp"
                    },
                    {
                        "name": "Thanh Niên",
                        "url": "https://thanhnien.vn/rss/home.rss",
                        "category": "Tổng hợp"
                    },
                    {
                        "name": "Tuổi Trẻ",
                        "url": "https://tuoitre.vn/rss/tin-moi-nhat.rss",
                        "category": "Tổng hợp"
                    }
                ]
            }
            with open(self.sources_file, 'w', encoding='utf-8') as f:
                json.dump(default_sources, f, ensure_ascii=False, indent=2)
            return default_sources
    
    def get_article_summary(self, url, max_length=200):
        """Lấy tóm tắt nội dung bài viết"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Tìm đoạn tóm tắt cho từng trang báo
            summary = ""
            
            # VnExpress
            if 'vnexpress.net' in url:
                desc = soup.find('p', class_='description')
                if desc:
                    summary = desc.get_text().strip()
                    
            # Dân Trí
            elif 'dantri.com.vn' in url:
                desc = soup.find('div', class_='singular-sapo')
                if desc:
                    summary = desc.get_text().strip()
                    
            # Thanh Niên
            elif 'thanhnien.vn' in url:
                desc = soup.find('div', class_='sapo')
                if desc:
                    summary = desc.get_text().strip()
                    
            # Tuổi Trẻ
            elif 'tuoitre.vn' in url:
                desc = soup.find('h2', class_='sapo')
                if desc:
                    summary = desc.get_text().strip()
            
            # Fallback: lấy đoạn đầu tiên
            if not summary:
                paragraphs = soup.find_all('p')
                for p in paragraphs:
                    text = p.get_text().strip()
                    if len(text) > 50:
                        summary = text
                        break
            
            # Cắt ngắn tóm tắt
            if len(summary) > max_length:
                summary = summary[:max_length] + "..."
                
            return summary
            
        except Exception as e:
            print(f"Lỗi khi lấy tóm tắt từ {url}: {e}")
            return ""
    
    def fetch_rss(self, source):
        """Lấy tin từ một nguồn RSS"""
        try:
            print(f"Đang lấy tin từ {source['name']}...")
            
            feed = feedparser.parse(source['url'])
            articles = []
            
            for entry in feed.entries[:10]:  # Lấy 10 tin mới nhất
                # Tạo ID duy nhất cho bài viết
                article_id = hashlib.md5(entry.link.encode()).hexdigest()
                
                # Lấy thời gian đăng
                published = datetime.now(self.timezone)
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    published = datetime(*entry.published_parsed[:6], tzinfo=self.timezone)
                
                # Lấy tóm tắt
                summary = ""
                if hasattr(entry, 'summary'):
                    summary = BeautifulSoup(entry.summary, 'html.parser').get_text().strip()
                
                if not summary or len(summary) < 50:
                    summary = self.get_article_summary(entry.link)
                
                article = {
                    'id': article_id,
                    'title': entry.title,
                    'link': entry.link,
                    'summary': summary,
                    'source': source['name'],
                    'category': source['category'],
                    'published': published.isoformat(),
                    'fetched': datetime.now(self.timezone).isoformat()
                }
                
                articles.append(article)
                
            return articles
            
        except Exception as e:
            print(f"Lỗi khi lấy RSS từ {source['name']}: {e}")
            return []
    
    def save_articles(self, articles):
        """Lưu tin tức vào file JSON theo ngày"""
        if not articles:
            return
            
        today = datetime.now(self.timezone).strftime('%Y-%m-%d')
        file_path = os.path.join(self.data_dir, f"{today}.json")
        
        # Load existing articles
        existing_articles = []
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                existing_articles = json.load(f)
        
        # Tạo set các ID đã có để tránh trùng lặp
        existing_ids = {article['id'] for article in existing_articles}
        
        # Thêm các bài viết mới
        new_articles = []
        for article in articles:
            if article['id'] not in existing_ids:
                new_articles.append(article)
                existing_articles.append(article)
        
        if new_articles:
            # Sắp xếp theo thời gian đăng (mới nhất trước)
            existing_articles.sort(key=lambda x: x['published'], reverse=True)
            
            # Lưu file
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(existing_articles, f, ensure_ascii=False, indent=2)
            
            print(f"Đã lưu {len(new_articles)} bài viết mới vào {file_path}")
        else:
            print("Không có bài viết mới")
    
    def run(self):
        """Chạy thu thập tin tức"""
        sources = self.load_sources()
        all_articles = []
        
        for source in sources['sources']:
            articles = self.fetch_rss(source)
            all_articles.extend(articles)
        
        self.save_articles(all_articles)
        print(f"Hoàn thành! Đã thu thập tổng cộng {len(all_articles)} bài viết")

if __name__ == "__main__":
    aggregator = NewsAggregator()
    aggregator.run()