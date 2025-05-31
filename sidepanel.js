async function fetchContent(query) {
  try {
    const response = await fetch(`http://localhost:8080/api/v1/recommendations?query=${encodeURIComponent(query)}&limit=6&userId=${clientUid}`, {
      headers: {
        'accept': '*/*'
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

async function checkUserExists(uuid) {
  try {
    const response = await fetch(`http://localhost:8080/api/v1/users?uuid=${uuid}`, {
      method: 'GET',
      headers: {
        'accept': '*/*'
      }
    });
    
    if (!response.ok) {
      throw new Error('사용자 확인 중 오류가 발생했습니다');
    }
    
    // 응답이 비어있는 경우 처리
    const text = await response.text();
    if (!text) {
      return false;
    }
    
    try {
      const data = JSON.parse(text);
      return data !== null;
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      return false;
    }
  } catch (error) {
    console.error('사용자 확인 중 오류 발생:', error);
    return false;
  }
}

async function registerUser(uuid) {
  try {
    const response = await fetch('http://localhost:8080/api/v1/users', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(uuid)
    });
    
    if (!response.ok) {
      throw new Error('사용자 등록에 실패했습니다');
    }
    console.log('사용자가 성공적으로 등록되었습니다');
  } catch (error) {
    console.error('사용자 등록 중 오류 발생:', error);
  }
}

chrome.storage.local.get(['clientUid'], async function(result) {
  if (result.clientUid) {
    clientUid = result.clientUid;
    // 기존 사용자 ID가 있는 경우에도 서버에 존재하는지 확인
    const exists = await checkUserExists(clientUid);
    if (!exists) {
      await registerUser(clientUid);
    }
  } else {
    clientUid = crypto.randomUUID();
    chrome.storage.local.set({ clientUid: clientUid });
    await registerUser(clientUid);
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

// 콘텐츠 조회 시간 추적을 위한 변수
let contentViewStartTime = null;
let contentViewTimers = {};

// 콘텐츠 조회 시작
function startContentViewTracking(contentId) {
  if (!contentId) return;
  
  console.log('콘텐츠 조회 시작:', contentId);
  contentViewStartTime = Date.now();
  contentViewTimers[contentId] = contentViewStartTime;
}

// 콘텐츠 조회 종료 및 로그 전송
function stopContentViewTracking(contentId) {
  if (!contentId || !contentViewTimers[contentId]) return;

  const viewTime = Date.now() - contentViewTimers[contentId];
  console.log('콘텐츠 조회 종료:', contentId, '체류시간:', viewTime);

  // VIEW 이벤트 로그 전송
  sendUserLog('VIEW', contentId, {
    time: viewTime,
    ratio: 0.1  // 기본값 설정
  });

  // 타이머 제거
  delete contentViewTimers[contentId];
}

// 콘텐츠 클릭 이벤트 핸들러
function handleContentClick(contentId, contentType, url) {
  const clickData = {
    content_id: contentId,
    clicked: true,
    logged_at: new Date().toISOString()
  };
  
  // 링크 클릭 이벤트를 background.js로 전송
  chrome.runtime.sendMessage({
    type: 'LINK_CLICKED',
    url: url
  });
  
  sendAnalyticsData(clickData);
  sendUserLog('CLICK', contentId);
  
  // 콘텐츠 조회 시작
  startContentViewTracking(contentId);
}

// sendUserLog 함수 수정
async function sendUserLog(eventType, contentId, additionalData = {}) {
  try {
    // contentId가 null이면 로그 전송하지 않음
    if (!contentId) {
      console.log('contentId가 없어 로그를 전송하지 않습니다.');
      return;
    }

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

    const logData = {
      userId: clientUid,
      eventType: eventType,
      contentId: contentId,
      timestamp: new Date().toISOString(),
      ...additionalData
    };

    console.log('로그 전송:', logData);

    const response = await fetch('http://localhost:8080/api/v1/user-log', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    });

    if (!response.ok) {
      throw new Error('로그 데이터 전송 실패');
    }
  } catch (error) {
    console.error('로그 데이터 전송 중 오류 발생:', error);
  }
}

function displayContent(recommendation) {
  const container = document.getElementById('content-container');
  container.innerHTML = '';

  // rank 순서대로 콘텐츠 표시
  recommendation.contents.forEach(item => {
    const content = item.content;
    const card = document.createElement('div');
    card.className = 'content-card';

    // 콘텐츠 타입에 따른 스타일 적용
    if (content.type === 'YOUTUBE') {
      card.innerHTML = `
        <div class="youtube-card">
          <a href="${content.url}" target="_blank" class="youtube-link">
            <div class="thumbnail-container">
              <img src="${content.imageUrl}" alt="${content.title}" class="thumbnail">
              <div class="play-button">▶</div>
            </div>
            <div class="video-info">
              <h3 class="video-title">${content.title}</h3>
              <p class="summary">${content.description}</p>
            </div>
          </a>
        </div>
      `;
    } else {
      const publishedDate = new Date(content.publishedAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      card.innerHTML = `
        <div class="${content.type.toLowerCase()}-card">
          <span class="content-type ${content.type.toLowerCase()}">${content.type === 'NEWS' ? '뉴스' : '블로그'}</span>
          <a href="${content.url}" target="_blank">${content.title}</a>
          <p class="summary">${content.description}</p>
          <div class="published-at">${publishedDate}</div>
        </div>
      `;
    }

    // 클릭 이벤트 리스너 추가
    card.addEventListener('click', () => {
      handleContentClick(content.id, content.type, content.url);
    });

    container.appendChild(card);
  });
}

// 페이지 언로드 시 이벤트 리스너 제거
window.addEventListener('unload', () => {
  // 모든 콘텐츠 추적 중지
  Object.keys(contentViewTimers).forEach(contentId => {
    stopContentViewTracking(contentId);
  });
});

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