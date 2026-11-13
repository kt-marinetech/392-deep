<script setup>
import { computed } from 'vue';
import RichMistText from './RichMistText.vue';

const props = defineProps({
  roleTitle: {
    type: String,
    required: true
  },
  cheatsheet: {
    type: Array,
    default: () => []
  },
  stats: {
    type: Object,
    required: true // { firstTry, total, traps }
  }
});

const emit = defineEmits(['restart', 'reviewBriefing', 'changeRole']);

const verdict = computed(() => {
  if (props.stats.traps === 0) {
    return 'Все подводные створы пройдены с первой попытки — маршрут роли отработан чисто.';
  }
  return 'Все препятствия позади. Короткая памятка твоей роли — ниже, чтобы не попадаться в те же ловушки в спринте.';
});
</script>

<template>
  <section class="complete-float">
    <p class="complete-kicker mist-glow">
      Маяк достигнут · {{ roleTitle }}
    </p>
    <h2 class="display-title complete-title mist-glow">
      Курс на Май 2027 открыт
    </h2>
    <p class="complete-verdict mist-glow">
      {{ verdict }}
    </p>

    <div class="complete-metrics tabular-nums mist-glow">
      <span>Чекпоинтов пройдено: {{ stats.total }} / {{ stats.total }}</span>
      <span aria-hidden="true">·</span>
      <span>С первой попытки: {{ stats.firstTry }}</span>
      <span aria-hidden="true">·</span>
      <span>Ловушек задето: {{ stats.traps }}</span>
    </div>

    <div class="cheat-float">
      <p class="cheat-heading mist-glow">Три опоры твоей роли</p>
      <ul class="dust-list">
        <li v-for="line in cheatsheet" :key="line" class="mist-glow">
          <RichMistText :text="line" />
        </li>
      </ul>
    </div>

    <div class="complete-actions">
      <button type="button" class="lantern-btn" @click="emit('restart')">
        Пройти испытания снова →
      </button>
      <button type="button" class="lantern-btn" @click="emit('reviewBriefing')">
        Перечитать вводную
      </button>
      <button type="button" class="lantern-btn" @click="emit('changeRole')">
        Выбрать другую роль
      </button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.complete-float {
  max-width: 680px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 24px;
}

.complete-kicker {
  font-size: 13px;
  color: var(--text-muted);
}

.complete-title {
  font-size: clamp(2.1rem, 3.8vw, 3.3rem);
  color: var(--text-primary);
}

.complete-verdict {
  font-size: 15.5px;
  color: var(--text-secondary);
  line-height: 1.62;
  max-width: 58ch;
}

.complete-metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: var(--accent-mist);
}

.cheat-float {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cheat-heading {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-mist);
}

.complete-actions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
}
</style>
