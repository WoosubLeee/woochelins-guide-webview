import { BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { getStatusBarHeight } from 'react-native-status-bar-height';

export default function App() {
  const webView = useRef();

  // 안드로이드 Back 버튼 클릭 시, webView 내에서 뒤로 가기 할 수 있도록
  const [navState, setNavState] = useState();
  useEffect(() => {
    const handleBackPress = () => {
      // 뒤로 갈 페이지가 있는 경우
      if (navState.canGoBack) {
        webView.current.goBack();
        // 원래의 event(앱 끄기)가 동작하지 않도록
        return true;
      }
    };
    // 'hardwareBackPress' 이벤트에 callback 함수를 등록한다
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [navState?.canGoBack]);

  const INJECTED_JS = `
    (function() {
      function wrap(fn) {
        return function wrapper() {
          var res = fn.apply(this, arguments);
          // postMessage를 통해 WebView에서 React native로 URL이 변경했다는 신호를 줄 수 있도록 한다
          window.ReactNativeWebView.postMessage('navigationStateChange');
          return res;
        }
      }

      // pushState()와 replaceState()를 wrap해서 두 메소드가 실행될 때마다
      // postMessage 될 수 있도록 한다.
      history.pushState = wrap(history.pushState);
      history.replaceState = wrap(history.replaceState);

      // popstate 이벤트에도 postMessage 할 수 있도록 적용한다.
      window.addEventListener('popstate', function() {
        window.ReactNativeWebView.postMessage('navigationStateChange');
      });
    })();
    
    // Disable zoom
    const meta = document.createElement('meta');
    meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
    meta.setAttribute('name', 'viewport');
    document.getElementsByTagName('head')[0].appendChild(meta);
  `;

  const statusBarHeight = getStatusBarHeight();

  return (
    <>
      <StatusBar
        style="auto"
      />
      <WebView
        source={{ uri: 'http://woochelinsguide.com/' }}
        style= {{
          marginTop: statusBarHeight
        }}
        ref={webView}
        onNavigationStateChange={setNavState}
        injectedJavaScript={INJECTED_JS}
        onMessage={({ nativeEvent: state }) => {
          if (state.data === 'navigationStateChange') {
            setNavState(state);
          }
        }}
      />
    </>
  );
}