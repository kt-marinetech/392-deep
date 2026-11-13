<script setup>
import { computed } from 'vue';
import { tokenizeTerms } from '../utils/formatTerms';

const props = defineProps({
  text: {
    type: String,
    default: ''
  }
});

const tokens = computed(() => tokenizeTerms(props.text));
</script>

<template>
  <span>
    <template v-for="(tok, idx) in tokens" :key="idx">
      <span v-if="tok.isTerm" class="abyss-term">{{ tok.text }}</span>
      <template v-else>{{ tok.text }}</template>
    </template>
  </span>
</template>
