<script lang="ts">
import { defineComponent, h, reactive, onMounted } from "vue";

import { api } from "../index";

async function getReqCnt(react: any) {
  const json = await api("reqcnt", { dummy: "dummy" });

  react.reqCnt = json.reqCnt;
}

export default defineComponent({
  name: "AppComponent",
  props: {},
  setup(props, context) {
    const react = reactive({
      reqCnt: 0,
    });

    onMounted(() => getReqCnt(react));

    const renderFunction = () => {
      return h("div", {}, react.reqCnt);
    };

    return renderFunction;
  },
});
</script>

<style></style>
