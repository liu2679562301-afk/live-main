// Polyfill for global object (required by sockjs-client and @stomp/stompjs)
if (typeof global === 'undefined') {
  if (typeof globalThis !== 'undefined') {
    globalThis.global = globalThis;
  } else if (typeof window !== 'undefined') {
    window.global = window;
  } else if (typeof self !== 'undefined') {
    self.global = self;
  } else {
    // Fallback for other environments
    global = {};
  }
}

import App from './App.vue'
import IconFont from './components/IconFont/IconFont.vue'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false

// 全局注册IconFont组件
Vue.component('IconFont', IconFont)

App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  return {
    app
  }
}
// #endif