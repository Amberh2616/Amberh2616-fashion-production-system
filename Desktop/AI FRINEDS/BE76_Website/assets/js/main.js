// ===== BE 76 主要 JavaScript 檔案 =====

// 全域變數
let currentUser = {
    name: 'User',
    avatar: 'amber',
    preferences: {},
    currentRoom: null
};

// DOM 載入完成後執行
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupAnimations();
});

// ===== 應用程式初始化 =====
function initializeApp() {
    // 檢查頁面類型並執行對應初始化
    const currentPage = getCurrentPage();
    
    switch(currentPage) {
        case 'index':
            initHomePage();
            break;
        case 'assistant':
            initAssistantPage();
            break;
        case 'social-rooms':
            initSocialRoomsPage();
            break;
        case 'room-detail':
            initRoomDetailPage();
            break;
        case 'profile':
            initProfilePage();
            break;
        case 'about':
            initAboutPage();
            break;
    }
    
    // 通用初始化
    setupNavigation();
    createParticleBackground();
}

// ===== 取得當前頁面 =====
function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().split('.')[0];
    return page || 'index';
}

// ===== 設定事件監聽器 =====
function setupEventListeners() {
    // 導航連結
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // 互動元素
    document.querySelectorAll('.interactive-element').forEach(element => {
        element.addEventListener('click', handleInteractiveClick);
        element.addEventListener('mouseenter', handleInteractiveHover);
    });
    
    // 按鈕點擊
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', handleButtonClick);
    });
    
    // 手機選單
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // Avatar 互動
    const avatars = document.querySelectorAll('.avatar-3d');
    avatars.forEach(avatar => {
        avatar.addEventListener('click', handleAvatarClick);
        avatar.addEventListener('mouseenter', handleAvatarHover);
    });
    
    // 滑鼠移動追蹤 (眼球跟隨)
    document.addEventListener('mousemove', handleMouseTracking);
    
    // 鍵盤快捷鍵
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// ===== 導航處理 =====
function setupNavigation() {
    // 設定當前頁面的活躍狀態
    const currentPage = getCurrentPage();
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes(currentPage)) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function handleNavigation(e) {
    // 平滑頁面轉換效果
    const targetPage = e.target.getAttribute('href');
    if (targetPage && !targetPage.startsWith('#')) {
        e.preventDefault();
        smoothPageTransition(targetPage);
    }
}

function smoothPageTransition(targetPage) {
    // 淡出當前頁面
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        window.location.href = targetPage;
    }, 300);
}

// ===== 互動處理 =====
function handleInteractiveClick(e) {
    const element = e.currentTarget;
    
    // 漣漪效果
    createRippleEffect(e, element);
    
    // 根據元素類型執行對應動作
    if (element.classList.contains('feature-card')) {
        handleFeatureCardClick(element);
    } else if (element.classList.contains('room-card')) {
        handleRoomCardClick(element);
    }
}

function handleInteractiveHover(e) {
    const element = e.currentTarget;
    
    // 添加懸浮光暈效果
    if (!element.querySelector('.hover-glow')) {
        const glow = document.createElement('div');
        glow.className = 'hover-glow';
        glow.style.cssText = `
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            background: radial-gradient(circle, rgba(255, 107, 157, 0.2) 0%, transparent 70%);
            border-radius: inherit;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            z-index: -1;
        `;
        element.style.position = 'relative';
        element.appendChild(glow);
        
        setTimeout(() => glow.style.opacity = '1', 10);
    }
}

// ===== Avatar 互動 =====
function handleAvatarClick(e) {
    const avatar = e.currentTarget;
    
    // 播放點擊動畫
    avatar.style.animation = 'avatarBounce 0.6s ease-in-out';
    
    // 顯示對話泡泡
    showChatBubble(avatar, getRandomGreeting());
    
    // 重置動畫
    setTimeout(() => {
        avatar.style.animation = '';
    }, 600);
}

function handleAvatarHover(e) {
    const avatar = e.currentTarget;
    
    // 添加發光效果
    if (!avatar.querySelector('.avatar-glow')) {
        const glow = document.createElement('div');
        glow.className = 'avatar-glow';
        glow.style.cssText = `
            position: absolute;
            top: -20px;
            left: -20px;
            right: -20px;
            bottom: -20px;
            background: radial-gradient(circle, rgba(255, 107, 157, 0.3) 0%, transparent 70%);
            border-radius: 50%;
            animation: avatarPulse 2s infinite ease-in-out;
            pointer-events: none;
            z-index: -1;
        `;
        avatar.appendChild(glow);
    }
}

// ===== 滑鼠追蹤 (眼球跟隨) =====
function handleMouseTracking(e) {
    const pupils = document.querySelectorAll('.pupil-3d');
    
    pupils.forEach(pupil => {
        const avatar = pupil.closest('.avatar-3d');
        if (!avatar) return;
        
        const rect = avatar.getBoundingClientRect();
        const avatarCenterX = rect.left + rect.width / 2;
        const avatarCenterY = rect.top + rect.height / 4;
        
        const angle = Math.atan2(e.clientY - avatarCenterY, e.clientX - avatarCenterX);
        const distance = Math.min(3, Math.sqrt(Math.pow(e.clientX - avatarCenterX, 2) + Math.pow(e.clientY - avatarCenterY, 2)) / 100);
        
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        pupil.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    });
}

// ===== 對話泡泡 =====
function showChatBubble(element, message, duration = 3000) {
    // 移除現有泡泡
    const existingBubble = element.querySelector('.chat-bubble');
    if (existingBubble) {
        existingBubble.remove();
    }
    
    // 創建新泡泡
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = message;
    bubble.style.cssText = `
        position: absolute;
        top: -60px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 10px 15px;
        border-radius: 20px;
        font-size: 12px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        opacity: 0;
        transition: all 0.3s ease;
        max-width: 200px;
        text-align: center;
        z-index: 100;
        pointer-events: none;
    `;
    
    // 添加尾巴
    const tail = document.createElement('div');
    tail.style.cssText = `
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 8px solid white;
    `;
    bubble.appendChild(tail);
    
    element.appendChild(bubble);
    
    // 顯示動畫
    setTimeout(() => {
        bubble.style.opacity = '1';
        bubble.style.top = '-70px';
    }, 10);
    
    // 自動隱藏
    setTimeout(() => {
        bubble.style.opacity = '0';
        bubble.style.top = '-50px';
        setTimeout(() => bubble.remove(), 300);
    }, duration);
}

function getRandomGreeting() {
    const greetings = [
        '嗨！我是 Amber 😊',
        '今天過得怎麼樣？',
        '想聊聊什麼呢？',
        '我們一起探索吧！',
        '有什麼需要幫忙的嗎？',
        '來分享你的想法吧！',
        '今天想要什麼風格？'
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
}

// ===== 漣漪效果 =====
function createRippleEffect(event, element) {
    const ripple = document.createElement('div');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: radial-gradient(circle, rgba(76, 205, 196, 0.6) 0%, transparent 70%);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
        z-index: 10;
    `;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

// ===== 粒子背景 =====
function createParticleBackground() {
    const particles = document.getElementById('particles') || document.createElement('div');
    if (!document.getElementById('particles')) {
        particles.id = 'particles';
        particles.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
        `;
        document.body.appendChild(particles);
    }
    
    // 清空現有粒子
    particles.innerHTML = '';
    
    // 創建新粒子
    for (let i = 0; i < 15; i++) {
        createParticle(particles);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: particleFloat ${Math.random() * 4 + 4}s infinite ease-in-out;
        animation-delay: ${Math.random() * 4}s;
    `;
    container.appendChild(particle);
}

// ===== 動畫設定 =====
function setupAnimations() {
    // 滾動動畫觀察器
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = '0.1s';
                entry.target.style.animationFillMode = 'both';
            }
        });
    }, observerOptions);
    
    // 觀察所有需要動畫的元素
    document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right').forEach(el => {
        observer.observe(el);
    });
}

// ===== 鍵盤快捷鍵 =====
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K: 快速搜尋
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // 觸發搜尋功能
    }
    
    // ESC: 關閉彈窗
    if (e.key === 'Escape') {
        closeAllModals();
    }
}

// ===== 手機選單 =====
function toggleMobileMenu() {
    const nav = document.querySelector('.nav');
    if (nav.style.display === 'flex') {
        nav.style.display = 'none';
    } else {
        nav.style.display = 'flex';
        nav.style.flexDirection = 'column';
        nav.style.position = 'absolute';
        nav.style.top = '100%';
        nav.style.left = '0';
        nav.style.right = '0';
        nav.style.background = 'white';
        nav.style.padding = '20px';
        nav.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
    }
}

// ===== 頁面特定初始化函數 =====
function initHomePage() {
    console.log('首頁初始化完成');
    // 首頁特定功能
}

function initAssistantPage() {
    console.log('個人助理頁面初始化完成');
    // 助理頁面特定功能
}

function initSocialRoomsPage() {
    console.log('社交房間頁面初始化完成');
    // 社交房間頁面特定功能
}

function initRoomDetailPage() {
    console.log('房間詳細頁面初始化完成');
    // 房間詳細頁面特定功能
}

function initProfilePage() {
    console.log('個人檔案頁面初始化完成');
    // 個人檔案頁面特定功能
}

function initAboutPage() {
    console.log('關於我們頁面初始化完成');
    // 關於頁面特定功能
}

// ===== 工具函數 =====
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function handleButtonClick(e) {
    const button = e.currentTarget;
    
    // 按鈕點擊動畫
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 150);
}

function handleFeatureCardClick(card) {
    // 功能卡片點擊處理
    const href = card.getAttribute('onclick') || card.dataset.href;
    if (href) {
        window.location.href = href;
    }
}

function handleRoomCardClick(card) {
    // 房間卡片點擊處理
    const roomId = card.dataset.room;
    if (roomId) {
        window.location.href = `room-detail.html?room=${roomId}`;
    }
}

// ===== CSS 動畫定義 =====
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes avatarBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1) translateY(-5px); }
    }
    
    @keyframes avatarPulse {
        0%, 100% { opacity: 0.5; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.1); }
    }
    
    @keyframes particleFloat {
        0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.6;
        }
        50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 1;
        }
    }
`;
document.head.appendChild(animationStyles);

// ===== 匯出給其他檔案使用 =====
window.BE76 = {
    showChatBubble,
    createRippleEffect,
    getCurrentPage,
    handleAvatarClick,
    createParticleBackground
};