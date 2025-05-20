async function fetchContent(query) {
  try {
    const response = await fetch(`http://localhost:8000/content/search/${encodeURIComponent(query)}?max_results=3`, {
      headers: {
        'accept': 'application/json'
      }
    });
    const data = await response.json();
    displayContent(data);
  } catch (error) {
    console.error('콘텐츠 데이터를 가져오는데 실패했습니다:', error);
  }
}

// 클라이언트 UID 생성 및 저장
let clientUid = null;

// chrome.storage.local에서 client_uid 가져오기
chrome.storage.local.get(['clientUid'], function(result) {
  if (result.clientUid) {
    clientUid = result.clientUid;
  } else {
    // 새로운 client_uid 생성
    clientUid = crypto.randomUUID();
    // chrome.storage.local에 저장
    chrome.storage.local.set({ clientUid: clientUid });
  }
});

// 서버로 데이터 전송하는 함수
async function sendAnalyticsData(data) {
  try {
    // client_uid가 준비될 때까지 대기
    if (!clientUid) {
      await new Promise(resolve => {
        const checkUid = setInterval(() => {
          if (clientUid) {
            clearInterval(checkUid);
            resolve();
          }
        }, 100);
      });
    }

    const analyticsData = {
      ...data,
      client_uid: clientUid
    };

    const response = await fetch('http://localhost:8000/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(analyticsData)
    });
    
    if (!response.ok) {
      throw new Error('서버 응답이 실패했습니다');
    }
  } catch (error) {
    console.error('분석 데이터 전송 실패:', error);
  }
}

// 콘텐츠 클릭 이벤트 핸들러
function handleContentClick(contentId, contentType, url) {
  const clickData = {
    content_id: contentId,
    clicked: true,
    dwell_time_seconds: 0,
    logged_at: new Date().toISOString()
  };
  
  sendAnalyticsData(clickData);
}

function displayContent(items) {
  // YouTube 콘텐츠 표시
  const youtubeContainer = document.getElementById('youtube-container');
  youtubeContainer.innerHTML = '';
  
  const youtubeItems = items.filter(item => item.type === 'youtube');
  if (youtubeItems.length > 0) {
    const video = youtubeItems[0];
    const embedContainer = document.createElement('div');
    embedContainer.className = 'embed-container';
    
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${video.url.split('v=')[1]}`;
    iframe.frameBorder = '0';
    iframe.allowFullscreen = true;
    
    embedContainer.appendChild(iframe);
    youtubeContainer.appendChild(embedContainer);
  }

  // 뉴스 콘텐츠 표시
  const newsContainer = document.getElementById('news-container');
  newsContainer.innerHTML = '';
  
  const newsItems = items.filter(item => item.type === 'news');
  newsItems.forEach(item => {
    const newsCard = document.createElement('div');
    newsCard.className = 'news-card';
    const publishedDate = new Date(item.published_at).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // 뉴스 카드 클릭 이벤트 추가
    newsCard.addEventListener('click', () => {
      handleContentClick(item.id, 'news', item.url);
    });
    
    newsCard.innerHTML = `
      <span class="content-type news">뉴스</span>
      <a href="${item.url}" target="_blank">${item.title}</a>
      <p class="summary">${item.summary}</p>
      <div class="published-at">${publishedDate}</div>
    `;
    newsContainer.appendChild(newsCard);
  });

  // 블로그 콘텐츠 표시
  const blogContainer = document.getElementById('blog-container');
  blogContainer.innerHTML = '';
  
  const blogItems = items.filter(item => item.type === 'blog');
  blogItems.forEach(item => {
    const blogCard = document.createElement('div');
    blogCard.className = 'blog-card';
    const publishedDate = new Date(item.published_at).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // 블로그 카드 클릭 이벤트 추가
    blogCard.addEventListener('click', () => {
      handleContentClick(item.id, 'blog', item.url);
    });
    
    blogCard.innerHTML = `
      <span class="content-type blog">블로그</span>
      <a href="${item.url}" target="_blank">${item.title}</a>
      <p class="summary">${item.summary}</p>
      <div class="published-at">${publishedDate}</div>
    `;
    blogContainer.appendChild(blogCard);
  });
}

// 페이지 로드 시 초기 데이터 가져오기
document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    if (currentUrl.includes('finance.naver.com/item/main.naver')) {
      fetchStockInfo(tabs[0].id);
    }
  });
});

// URL 변경 감지
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('finance.naver.com/item/main.naver')) {
    fetchStockInfo(tabId);
  }
});

// 주식 정보 가져오기 함수
async function fetchStockInfo(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: () => {
        return document.querySelector('.wrap_company h2 a')?.textContent || 
               document.querySelector('.wrap_company h2')?.textContent;
      }
    });

    if (results && results[0] && results[0].result) {
      const stockName = results[0].result;
      fetchContent(stockName);
    }
  } catch (error) {
    console.error('종목 정보를 가져오는데 실패했습니다:', error);
  }
} 