<template>
    <AppComponent :reqCnt="reqCnt" />
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';

import { AppComponent, getReqCnt } from "../dist/index"

const data = {
  reqCnt: 0
}

@Options({
  components: {
    AppComponent,
  },
  data(){
    return data
  },
  mounted(){
    getReqCnt(this)
  }
})
export default class App extends Vue {}
</script>

<style>
#app {
  text-align: center;
}
</style>
