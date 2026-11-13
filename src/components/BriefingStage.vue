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
  },
  visitedDays: {
    type: Array,
    default: () => [0]
  },
  nudgeUnvisited: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['visit-day']);

const activeDayIdx = ref(0);

watch(
  () => [props.mode, props.stepIndex],
  () => {
    activeDayIdx.value = 0;
  }
);

const currentBase = computed(() => props.baseSteps[props.stepIndex] || null);
const totalSprintDays = computed(() => props.roleBriefing?.sprintDays?.length || 0);
const allDaysExplored = computed(
  () => totalSprintDays.value > 0 && props.visitedDays.length >= totalSprintDays.value
);

function selectDay(idx) {
  activeDayIdx.value = idx;
  emit('visit-day', idx);
}
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
            Выбирай каждый интервал на шкале ниже, чтобы увидеть фокус роли и открыть путь дальше.
          </p>

          <div
            class="days-rail"
            role="tablist"
            aria-label="Этапы спринта"
          >
            <button
              v-for="(slot, idx) in roleBriefing.sprintDays"
              :key="slot.days"
              type="button"
              role="tab"
              :aria-selected="activeDayIdx === idx"
              class="day-node"
              :class="{
                'is-active': activeDayIdx === idx,
                'is-visited': visitedDays.includes(idx),
                'is-unvisited': !visitedDays.includes(idx),
                'is-nudged': nudgeUnvisited && !visitedDays.includes(idx)
              }"
              @click="selectDay(idx)"
            >
              <span class="day-dot" aria-hidden="true" />
              <span class="day-label">{{ slot.days }}</span>
            </button>
          </div>

          <p
            class="days-progress-whisper tabular-nums mist-glow"
            :class="{
              'is-complete': allDaysExplored,
              'is-nudged': nudgeUnvisited && !allDaysExplored
            }"
          >
            <template v-if="allDaysExplored">
              Все этапы просмотрены ({{ visitedDays.length }} из {{ totalSprintDays }}) — путь открыт
            </template>
            <template v-else>
              Нажми на остальные дни, чтобы открыть «Дальше» · изучено {{ visitedDays.length }} из {{ totalSprintDays }}
            </template>
          </p>

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
  letter-spacing: 0.01em;
  line-height: 1.6;
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

.days-rail {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px 30px;
  margin-top: 6px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(200, 224, 238, 0.14);
}

.day-node {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 38px;
  padding: 4px 2px;
  font-size: 14.5px;
  font-weight: 500;
  color: #eef5f8;
  opacity: 0.65;
  cursor: pointer;
  transition:
    opacity 220ms var(--ease-settle),
    color 220ms var(--ease-settle),
    transform 220ms var(--ease-settle),
    text-shadow 220ms var(--ease-settle);

  &:focus-visible {
    outline: none;
    opacity: 1;
    text-shadow: 0 0 18px rgba(226, 244, 255, 0.85);
  }

  .day-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    transition:
      background-color 220ms var(--ease-settle),
      border-color 220ms var(--ease-settle),
      box-shadow 220ms var(--ease-settle),
      transform 220ms var(--ease-settle);
  }

  .day-label {
    padding-bottom: 2px;
    border-bottom: 1px dashed transparent;
    transition: border-color 220ms var(--ease-settle);
  }

  &.is-unvisited {
    opacity: 0.78;

    .day-dot {
      border: 1.5px solid rgba(226, 239, 245, 0.78);
      background: transparent;
      animation: node-invite 2.4s ease-in-out infinite;
    }

    .day-label {
      border-bottom-color: rgba(226, 239, 245, 0.36);
    }
  }

  &.is-visited:not(.is-active) {
    opacity: 0.64;

    .day-dot {
      background: rgba(152, 217, 190, 0.82);
      box-shadow: 0 0 8px rgba(152, 217, 190, 0.45);
    }
  }

  &:hover {
    opacity: 1;
    color: #ffffff;
    transform: translateY(-2px);
    text-shadow:
      0 0 20px rgba(226, 244, 255, 0.75),
      0 2px 14px rgba(2, 4, 7, 0.95);

    .day-dot {
      transform: scale(1.22);
      border-color: #ffffff;
      box-shadow: 0 0 12px rgba(226, 244, 255, 0.9);
    }

    .day-label {
      border-bottom-color: rgba(255, 255, 255, 0.65);
    }
  }

  &.is-active {
    opacity: 1;
    color: #ffffff;
    text-shadow:
      0 0 18px rgba(226, 244, 255, 0.62),
      0 2px 14px rgba(2, 4, 7, 0.95);

    .day-dot {
      border: none;
      background: #ffffff;
      box-shadow:
        0 0 12px rgba(232, 246, 255, 0.95),
        0 0 22px rgba(180, 224, 244, 0.55);
      animation: none;
    }

    .day-label {
      border-bottom: 1.5px solid rgba(232, 246, 255, 0.92);
    }
  }

  &.is-nudged {
    opacity: 1;
    color: #ffffff;
    transform: translateY(-2px);

    .day-dot {
      border-color: #ffffff;
      box-shadow: 0 0 14px rgba(232, 246, 255, 0.95);
    }

    .day-label {
      border-bottom-color: rgba(232, 246, 255, 0.85);
    }
  }
}

@keyframes node-invite {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(226, 244, 255, 0.42);
  }
  50% {
    box-shadow: 0 0 0 5px rgba(226, 244, 255, 0);
  }
}

.days-progress-whisper {
  font-size: 13px;
  color: var(--text-muted);
  transition: color 240ms var(--ease-settle);

  &.is-complete {
    color: var(--state-ok);
  }

  &.is-nudged {
    color: var(--accent-mist);
  }
}

.day-focus {
  margin-top: 2px;
  min-height: 54px;
  font-size: 17px;
  color: var(--text-primary);
  letter-spacing: 0.01em;
  line-height: 1.6;
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
