# 개발 기록

## Back button 클릭 인식시키기

React native `WebView`에서 안드로이드 back button을클릭할 시, `WebView` 내에서 이전 페이지로 이동하는 것이 아닌, React native 상의 이전 화면으로 돌아가게 된다. 따라서 `WebView` 내 뒤로가기로 작동할 수 있도록 해보자.

### 1. `hardwareBackPress` 이벤트 처리

```js
export default function App() {
  const webView = useRef();
  
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

  return (
    <WebView
      source={{ uri: 'http://woochelinsguide.com/' }}
      style= {{
        marginTop: 50
      }}
      ref={webView}
      onNavigationStateChange={setNavState}
    />
  );
}
```

### 2. History API 대응

하지만 `onNavigationStateChange` 이벤트(페이지가 load될 때 발생한다)는 `pushState()`,  `replaceState()`와 같이 History API를 활용한 (페이지를 load시키지 않는) routing의 경우 트리거되지 않는 문제가 있다. 이는 `canGoBack` 값이 최신화 되지 않아 SPA로 만들어진 웹의 경우 뒤로가기가 불가능해진다.

해결 방법은 다음과 같다.

#### 2.1. `injectedJavaScript`

`WebView`의 `injectedJavaScript` 속성을 활용해 History API 메소드가 실행될 때 `setNavState()`를 실행할 수 있도록 변경해준다.

```js
<WebView
  ...
  injectedJavaScript={`
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
  `}
  onMessage={({ nativeEvent: state }) => {
    if (state.data === 'navigationStateChange') {
      setNavState(state);
    }
  }}
/>
```

### References

[React Native WebView 안드로이드 백버튼 처리](https://velog.io/@ricale/React-Native-WebView-%EC%95%88%EB%93%9C%EB%A1%9C%EC%9D%B4%EB%93%9C-%EB%B0%B1%EB%B2%84%ED%8A%BC-%EC%B2%98%EB%A6%AC)

https://github.com/react-native-webview/react-native-webview/issues/24#issuecomment-483956651



## Disable zoom

일반적으로 앱에서는 화면 확대/축소가 안되므로 Webview에서도 이를 불가능하게 만들고자 한다.

`injectedJavaScript`에 다음 코드를 추가해준다.

```js
const INJECTED_JS = `
  ...
  // Disable zoom
  const meta = document.createElement('meta');
  meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
  meta.setAttribute('name', 'viewport');
  document.getElementsByTagName('head')[0].appendChild(meta);
`;
```

### References

[Disable zoom on web-view react-native?](https://stackoverflow.com/questions/44625680/disable-zoom-on-web-view-react-native)

