class NewsApp {
    constructor() {
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentSource = '';
        this.sources = [];
        this.availableDates = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadSources();
        await this.loadAvailableDates();
        await this.loadNews();
        this.updateLastUpdateTime();
    }

    setupEventListeners() {
        // Date selector
        document.getElementById('dateSelect').addEventListener('change', (e) => {
            this.currentDate = e.target.value;
            this.loadNews();
        });

        // Source filter
        document.getElementById('sourceFilter').addEventListener('change', (e) => {
            this.currentSource = e.target.value;
            this.filterNews();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            location.reload();
        });

        // Manage sources button
        document.getElementById('manageSourcesBtn').addEventListener('click', () => {
            this.showSourceModal();
        });

        // Modal close
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideSourceModal();
        });

        // Add source form
        document.getElementById('addSourceForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSource();
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('sourceModal');
            if (e.target === modal) {
                this.hideSourceModal();
            }
        });
    }

    async loadSources() {
        try {
            // Load sources bằng cách tạo script tag
            const script = document.createElement('script');
            script.src = 'src/rss_sources.json?' + Date.now();
            script.onload = () => {
                // Fallback: parse manually
                fetch('src/rss_sources.json')
                    .then(r => r.json())
                    .then(data => {
                        this.sources = data.sources;
                        this.updateSourceFilter();
                    })
                    .catch(() => {
                        // Default sources
                        this.sources = [
                            { name: "VnExpress", url: "https://vnexpress.net/rss/tin-moi-nhat.rss", category: "Tổng hợp" },
                            { name: "Dân Trí", url: "https://dantri.com.vn/rss.rss", category: "Tổng hợp" },
                            { name: "Thanh Niên", url: "https://thanhnien.vn/rss/home.rss", category: "Tổng hợp" },
                            { name: "Tuổi Trẻ", url: "https://tuoitre.vn/rss/tin-moi-nhat.rss", category: "Tổng hợp" }
                        ];
                        this.updateSourceFilter();
                    });
            };
            document.head.appendChild(script);
        } catch (error) {
            console.error('Lỗi khi tải danh sách nguồn:', error);
        }
    }

    async loadAvailableDates() {
        try {
            // Load available dates
            const script = document.createElement('script');
            script.src = 'static/js/data/index.js?' + Date.now();
            script.onload = () => {
                if (window.availableDates) {
                    this.availableDates = window.availableDates;
                } else {
                    // Fallback: tạo 7 ngày gần đây
                    this.availableDates = [];
                    for (let i = 0; i < 7; i++) {
                        const date = new Date();
                        date.setDate(date.getDate() - i);
                        this.availableDates.push(date.toISOString().split('T')[0]);
                    }
                }
                this.updateDateSelector();
            };
            script.onerror = () => {
                // Fallback
                this.availableDates = [];
                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    this.availableDates.push(date.toISOString().split('T')[0]);
                }
                this.updateDateSelector();
            };
            document.head.appendChild(script);
        } catch (error) {
            console.error('Lỗi khi tải ngày:', error);
        }
    }

    updateDateSelector() {
        const select = document.getElementById('dateSelect');
        select.innerHTML = '';
        
        this.availableDates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = this.formatDate(date);
            if (date === this.currentDate) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    updateSourceFilter() {
        const select = document.getElementById('sourceFilter');
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">Tất cả nguồn</option>';
        
        const uniqueSources = [...new Set(this.sources.map(s => s.name))];
        uniqueSources.forEach(source => {
            const option = document.createElement('option');
            option.value = source;
            option.textContent = source;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    }

    async loadNews() {
        this.showLoading();
        
        try {
            // Load news data bằng script tag
            const dateKey = this.currentDate.replace(/-/g, '_');
            const script = document.createElement('script');
            script.src = `static/js/data/${this.currentDate}.js?` + Date.now();
            
            script.onload = () => {
                const newsData = window[`newsData_${dateKey}`];
                if (newsData && newsData.articles) {
                    this.displayNews(newsData.articles);
                } else {
                    this.showNoNews();
                }
            };
            
            script.onerror = () => {
                this.showNoNews();
            };
            
            document.head.appendChild(script);
        } catch (error) {
            console.error('Lỗi khi tải tin tức:', error);
            this.showNoNews();
        }
    }

    displayNews(articles) {
        const container = document.getElementById('newsList');
        container.innerHTML = '';

        if (articles.length === 0) {
            this.showNoNews();
            return;
        }

        // Lọc theo nguồn nếu có
        const filteredArticles = this.currentSource 
            ? articles.filter(article => article.source === this.currentSource)
            : articles;

        if (filteredArticles.length === 0) {
            this.showNoNews();
            return;
        }

        filteredArticles.forEach(article => {
            const articleElement = this.createArticleElement(article);
            container.appendChild(articleElement);
        });

        this.hideLoading();
        document.getElementById('newsContainer').style.display = 'block';
    }

    createArticleElement(article) {
        const div = document.createElement('div');
        div.className = 'news-item';
        
        const publishedDate = new Date(article.published);
        const timeString = publishedDate.toLocaleString('vi-VN');
        
        div.innerHTML = `
            <div class="news-meta">
                <span class="news-source">${article.source}</span>
                <span class="news-time">${timeString}</span>
            </div>
            <div class="news-title">
                <a href="${article.link}" target="_blank" rel="noopener">${article.title}</a>
            </div>
            <div class="news-summary">${article.summary || 'Không có tóm tắt'}</div>
            <a href="${article.link}" target="_blank" rel="noopener" class="news-link">Đọc tiếp →</a>
        `;
        
        return div;
    }

    filterNews() {
        this.loadNews();
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('newsContainer').style.display = 'none';
        document.getElementById('noNews').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showNoNews() {
        this.hideLoading();
        document.getElementById('newsContainer').style.display = 'none';
        document.getElementById('noNews').style.display = 'block';
    }

    // Modal functions
    showSourceModal() {
        document.getElementById('sourceModal').style.display = 'block';
        this.loadSourceList();
    }

    hideSourceModal() {
        document.getElementById('sourceModal').style.display = 'none';
    }

    loadSourceList() {
        const container = document.getElementById('sourceListContainer');
        container.innerHTML = '';

        this.sources.forEach((source, index) => {
            const div = document.createElement('div');
            div.className = 'source-item';
            div.innerHTML = `
                <div class="source-info">
                    <h4>${source.name}</h4>
                    <p>${source.url}</p>
                    <small>Danh mục: ${source.category}</small>
                </div>
                <div class="source-actions">
                    <button class="btn btn-danger" onclick="newsApp.removeSource(${index})">Xóa</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    addSource() {
        const name = document.getElementById('sourceName').value.trim();
        const url = document.getElementById('sourceUrl').value.trim();
        const category = document.getElementById('sourceCategory').value.trim();

        if (!name || !url) {
            alert('Vui lòng điền đầy đủ thông tin');
            return;
        }

        const newSource = { name, url, category };
        this.sources.push(newSource);
        
        this.updateSourceFilter();
        this.loadSourceList();
        
        // Reset form
        document.getElementById('addSourceForm').reset();
        
        alert('Đã thêm nguồn mới! Lưu ý: Thay đổi chỉ có hiệu lực local.');
    }

    removeSource(index) {
        if (confirm('Bạn có chắc muốn xóa nguồn này?')) {
            this.sources.splice(index, 1);
            this.updateSourceFilter();
            this.loadSourceList();
            alert('Đã xóa nguồn!');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (dateString === today.toISOString().split('T')[0]) {
            return 'Hôm nay';
        } else if (dateString === yesterday.toISOString().split('T')[0]) {
            return 'Hôm qua';
        } else {
            return date.toLocaleDateString('vi-VN');
        }
    }

    updateLastUpdateTime() {
        const now = new Date();
        document.getElementById('lastUpdate').textContent = now.toLocaleString('vi-VN');
    }
}

// Khởi tạo ứng dụng
const newsApp = new NewsApp();
