<script setup>
import { computed, ref, watch } from 'vue';
import RichMistText from './RichMistText.vue';

const props = defineProps({
  mode: {
    type: String,
    required: true // 'base' | 'role'
  },
  baseSteps: {
    type: Array,
    default: () => []
  },
  roleBriefing: {
    type: Object,
    default: null
  },
  roleTitle: {
    type: String,
    default: ''
  },
  stepIndex: {
    type: Number,
    default: 0
  }
});

const activeDayIdx = ref(0);

watch(
  () => [props.mode, props.stepIndex],
  () => {
    activeDayIdx.value = 0;
  }
);

const currentBase = computed(() => props.baseSteps[props.stepIndex] || null);
</script>

<template>
  <section class="brief-stage">
    <div class="brief-float">
      <p class="brief-kicker mist-glow">
        {{
          mode === 'base'
            ? `Общие правила · Фонарь 0${stepIndex + 1}`
            : `${roleTitle} · Фонарь 0${stepIndex + 1}`
        }}
      </p>

      <!-- BASE INTRO -->
      <template v-if="mode === 'base' && currentBase">
        <h2 class="display-title brief-title mist-glow">
          {{ currentBase.title }}
        </h2>
        <p class="brief-lead mist-glow">
          <RichMistText :text="currentBase.lead" />
        </p>

        <div class="columns-float">
          <div v-for="col in currentBase.columns" :key="col.heading" class="col-block">
            <h3 class="col-heading mist-glow">
              <RichMistText :text="col.heading" />
            </h3>
            <ul class="dust-list">
              <li v-for="line in col.lines" :key="line" class="mist-glow">
                <RichMistText :text="line" />
              </li>
            </ul>
          </div>
        </div>
      </template>

      <!-- ROLE INTRO -->
      <template v-else-if="mode === 'role' && roleBriefing">
        <!-- 0: Focus & Boundaries -->
        <template v-if="stepIndex === 0">
          <h2 class="display-title brief-title mist-glow">Твоя зона и границы</h2>
          <p class="brief-lead mist-glow">
            <RichMistText :text="roleBriefing.focus" />
          </p>

          <div class="columns-float">
            <div class="col-block">
              <h3 class="col-heading mist-glow">Что ты делаешь</h3>
              <ul class="dust-list">
                <li v-for="line in roleBriefing.canDo" :key="line" class="mist-glow">
                  <RichMistText :text="line" />
                </li>
              </ul>
            </div>
            <div class="col-block">
              <h3 class="col-heading mist-glow">Право сказать «нет»</h3>
              <ul class="dust-list">
                <li v-for="line in roleBriefing.cantDo" :key="line" class="mist-glow">
                  <RichMistText :text="line" />
                </li>
              </ul>
            </div>
          </div>
        </template>

        <!-- 1: Sprint Days -->
        <template v-else-if="stepIndex === 1">
          <h2 class="display-title brief-title mist-glow">Твои дни в спринте</h2>
          <p class="brief-lead mist-glow">
            Выбери интервал в двухнедельном ритме, чтобы увидеть главный фокус твоей роли.
          </p>

          <div class="days-strip">
            <button
              v-for="(slot, idx) in roleBriefing.sprintDays"
              :key="slot.days"
              type="button"
              class="lantern-btn day-btn"
              :class="{ 'is-active': activeDayIdx === idx }"
              @click="activeDayIdx = idx"
            >
              {{ slot.days }}
            </button>
          </div>

          <p v-if="roleBriefing.sprintDays[activeDayIdx]" class="day-focus mist-glow">
            <RichMistText :text="roleBriefing.sprintDays[activeDayIdx].label" />
          </p>
        </template>

        <!-- 2: Branches / Flow -->
        <template v-else-if="stepIndex === 2">
          <h2 class="display-title brief-title mist-glow">
            <RichMistText :text="roleBriefing.flowHeading" />
          </h2>
          <p class="brief-lead mist-glow">
            Как проходит задача и код от старта работы до выпуска версии.
          </p>

          <ul class="dust-list flow-dust-list">
            <li v-for="line in roleBriefing.flowLines" :key="line" class="mist-glow">
              <RichMistText :text="line" />
            </li>
          </ul>
        </template>

        <!-- 3: Meetings -->
        <template v-else-if="stepIndex === 3">
          <h2 class="display-title brief-title mist-glow">Только твои встречи</h2>
          <p class="brief-lead mist-glow">
            Встреча существует только ради зафиксированного результата в Трекере.
          </p>

          <ul class="dust-list meetings-float">
            <li v-for="m in roleBriefing.meetings" :key="m" class="mist-glow">
              <RichMistText :text="m" />
            </li>
          </ul>
        </template>
      </template>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.brief-stage {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding-bottom: 20px;
}

.brief-float {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}

.brief-kicker {
  font-size: 13px;
  line-height: 20px;
  height: 20px;
  color: var(--text-muted);
  font-weight: 500;
}

.brief-title {
  font-size: clamp(2rem, 3.2vw, 2.85rem);
  color: var(--text-primary);
  max-width: 34ch;
}

.brief-lead {
  font-size: 15.5px;
  color: var(--text-secondary);
  line-height: 1.62;
  max-width: 62ch;
}

.columns-float {
  width: 100%;
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 36px;
}

.col-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.col-heading {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-mist);
}

.days-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 4px;
}

.day-btn {
  font-size: 14.5px;
  min-height: 36px;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }
}

.day-focus {
  margin-top: 4px;
  min-height: 54px;
  font-size: 17px;
  color: var(--text-primary);
  line-height: 1.62;
  max-width: 60ch;
}

.flow-dust-list,
.meetings-float {
  margin-top: 4px;
  max-width: 68ch;
}

@media (max-width: 780px) {
  .columns-float {
    grid-template-columns: 1fr;
    gap: 22px;
  }
}
</style>
