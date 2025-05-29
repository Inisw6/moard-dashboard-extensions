// 대시보드에서 제공한 링크를 추적하기 위한 Set
let dashboardLinks = new Set();

// 활성화된 탭 ID를 저장
let activeTabId = null;

// 초기 설정
chrome.runtime.onInstalled.addListener(() => {
  console.log('확장 프로그램이 설치되었습니다.');
  chrome.sidePanel.setOptions({
    path: "sidepanel.html",
    enabled: true
  });
});

// 대시보드에서 링크 클릭 시 추적
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('메시지 수신:', message);
  if (message.type === 'LINK_CLICKED') {
    dashboardLinks.add(message.url);
    chrome.sidePanel.setOptions({
      enabled: true
    });
  }
});

// 탭이 닫힐 때 처리
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeTabId === tabId) {
    activeTabId = null;
  }
});

// 네이버 금융 페이지인지 확인하는 함수
function isNaverFinancePage(url) {
  return url.includes('finance.naver.com');
}

// 탭 업데이트 시 URL 확인
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('탭 업데이트:', tab.url);
    
    // 대시보드에서 제공한 링크인 경우에만 사이드패널 활성화
    if (dashboardLinks.has(tab.url)) {
      console.log('대시보드 링크 감지');
      activeTabId = tabId;
      chrome.sidePanel.setOptions({
        enabled: true
      });
    } else {
      // 네이버 금융 페이지인 경우 사이드패널 활성화
      const isFinancePage = isNaverFinancePage(tab.url);
      console.log('네이버 금융 페이지 여부:', isFinancePage);
      
      if (isFinancePage) {
        activeTabId = tabId;
        chrome.sidePanel.setOptions({
          enabled: true
        });
      } else {
        if (activeTabId === tabId) {
          activeTabId = null;
        }
        chrome.sidePanel.setOptions({
          enabled: false
        });
      }
    }
  }
});

// 확장 프로그램 아이콘 클릭 시
chrome.action.onClicked.addListener(async (tab) => {
  console.log('확장 프로그램 아이콘 클릭');
  const isFinancePage = isNaverFinancePage(tab.url);
  const isDashboardLink = dashboardLinks.has(tab.url);
  
  if (isFinancePage || isDashboardLink) {
    activeTabId = tab.id;
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error('사이드패널 열기 실패:', error);
      // 실패 시 재시도
      setTimeout(async () => {
        try {
          await chrome.sidePanel.open({ tabId: tab.id });
        } catch (retryError) {
          console.error('사이드패널 열기 재시도 실패:', retryError);
        }
      }, 1000);
    }
  }
});