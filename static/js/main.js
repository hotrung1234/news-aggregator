class NewsApp {
    constructor() {
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentSource = '';
        this.sources = [];
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
            this.loadNews();
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
            const response = await fetch('src/rss_sources.json');
            const data = await response.json();
            this.sources = data.sources;
            this.updateSourceFilter();
        } catch (error) {
            console.error('Lỗi khi tải danh sách