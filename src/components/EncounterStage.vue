<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import RichMistText from './RichMistText.vue';

const props = defineProps({
  encounter: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  roleTitle: {
    type: String,
    required: true
  },
  isLocked: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['solve', 'trap']);

const triedWrongIds = ref([]);
const activeQuote = ref('');
const statusKind = ref(''); // '' | 'trap' | 'open'

watch(
  () => props.encounter.id,
  () => {
    triedWrongIds.value = [];
    activeQuote.value = '';
    statusKind.value = '';
  }
);

const phaseLabel = computed(() =>
  props.encounter.phase === 'base'
    ? 'Общие правила'
    : `Правила роли · ${props.roleTitle}`
);

const gateStatusText = computed(() => {
  if (statusKind.value === 'open') return 'Шлюз открыт — путь свободен';
  if (statusKind.value === 'trap') return 'Шлюз заблокирован — выберите верное решение';
  return 'Путь закрыт — примите решение';
});

function selectOption(opt) {
  if (!opt || props.isLocked) return;
  if (statusKind.value === 'open' || triedWrongIds.value.includes(opt.id)) return;

  if (opt.isCorrect) {
    statusKind.value = 'open';
    activeQuote.value = opt.quote;
    emit('solve', {
      firstTry: triedWrongIds.value.length === 0
    });
  } else {
    triedWrongIds.value = [...triedWrongIds.value, opt.id];
    statusKind.value = 'trap';
    activeQuote.value = opt.quote;
    emit('trap');
  }
}

function handleChoicePointerMove(e) {
  const el = e.currentTarget;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = Math.round(e.clientX - rect.left);
  const y = Math.round(e.clientY - rect.top);
  el.style.setProperty('--mx', `${x}px`);
  el.style.setProperty('--my', `${y}px`);
}

function handleKeydown(e) {
  if (props.isLocked) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  let optionIndex = -1;
  if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') optionIndex = 0;
  else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') optionIndex = 1;
  else if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') optionIndex = 2;

  if (optionIndex >= 0 && optionIndex < props.encounter.options.length) {
    e.preventDefault();
    selectOption(props.encounter.options[optionIndex]);
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <section class="encounter-stage">
    <div class="encounter-float">
      <div class="encounter-kicker mist-glow">
        <span>{{ phaseLabel }}</span>
        <span aria-hidden="true">·</span>
        <span class="tabular-nums">Шлюз {{ index + 1 }} из {{ total }}</span>
      </div>

      <h2 class="display-title encounter-title mist-glow">
        <RichMistText :text="encounter.title" />
      </h2>

      <p class="rule-whisper mist-glow">
        <RichMistText :text="encounter.ruleWhisper" />
      </p>

      <p class="situation-prompt mist-glow">
        <RichMistText :text="encounter.situation" />
      </p>

      <div
        class="gate-indicator mist-glow"
        :class="{
          'is-open': statusKind === 'open',
          'is-trap': statusKind === 'trap'
        }"
      >
        <span class="gate-diamond" aria-hidden="true">{{ statusKind === 'open' ? '◆' : '◇' }}</span>
        <span>{{ gateStatusText }}</span>
      </div>

      <div class="choices-silhouette" role="group" aria-label="Варианты решения">
        <button
          v-for="(opt, idx) in encounter.options"
          :key="opt.id"
          type="button"
          class="silhouette-choice mist-glow"
          :disabled="statusKind === 'open' || triedWrongIds.includes(opt.id)"
          :class="{
            'is-trapped': triedWrongIds.includes(opt.id),
            'is-cleared': statusKind === 'open' && opt.isCorrect
          }"
          @mousemove="handleChoicePointerMove"
          @click="selectOption(opt)"
        >
          <span class="choice-inner">
            <span class="choice-trigger tabular-nums" aria-hidden="true">
              <span class="trigger-diamond">{{
                statusKind === 'open' && opt.isCorrect ? '◆' : '◇'
              }}</span>
              <span class="trigger-key">[ {{ idx + 1 }} ]</span>
            </span>
            <span class="choice-text">
              <RichMistText :text="opt.text" />
            </span>
          </span>
        </button>
      </div>

      <div
        v-if="activeQuote"
        class="quote-feedback mist-glow"
        :class="statusKind === 'open' ? 'is-open' : 'is-trap'"
        role="status"
      >
        <span class="quote-tag">
          {{ statusKind === 'open' ? 'Путь открыт' : 'Ловушка · По правилу' }}
        </span>
        <p class="quote-body">
          <RichMistText :text="activeQuote" />
        </p>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.encounter-stage {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding-bottom: 20px;
}

.encounter-float {
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.encounter-kicker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  line-height: 20px;
  height: 20px;
  color: var(--text-muted);
  font-weight: 500;
}

.encounter-title {
  font-size: clamp(2rem, 3.2vw, 2.85rem);
  color: var(--text-primary);
}

.rule-whisper {
  font-size: 14px;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
  line-height: 1.6;
  max-width: 64ch;
}

.situation-prompt {
  margin-top: 2px;
  font-size: 17px;
  font-weight: 500;
  color: #f1f7fa;
  letter-spacing: 0.01em;
  line-height: 1.6;
  max-width: 62ch;
}

.gate-indicator {
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.03em;
  color: rgba(206, 224, 236, 0.56);
  transition: color 260ms var(--ease-settle);

  .gate-diamond {
    font-size: 11px;
    opacity: 0.85;
    animation: trigger-breathe 2.6s ease-in-out infinite;
  }

  &.is-trap {
    color: rgba(224, 145, 135, 0.82);
  }

  &.is-open {
    color: var(--state-ok);

    .gate-diamond {
      animation: none;
    }
  }
}

.choices-silhouette {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
}

.silhouette-choice {
  position: relative;
  width: 100%;
  display: block;
  padding: 13px 18px 13px 20px;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  color: var(--text-primary);
  opacity: 0.78;
  font-size: 15.5px;
  letter-spacing: 0.01em;
  line-height: 1.6;
  background: linear-gradient(
    90deg,
    rgba(16, 28, 38, 0.34) 0%,
    rgba(10, 18, 25, 0.12) 62%,
    transparent 100%
  );
  transition:
    opacity 240ms var(--ease-settle),
    color 240ms var(--ease-settle),
    text-shadow 240ms var(--ease-settle);

  /* Faint left vertical beam at rest */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 4px;
    bottom: 4px;
    width: 2px;
    background: rgba(212, 234, 246, 0.22);
    transition:
      background-color 240ms var(--ease-settle),
      box-shadow 240ms var(--ease-settle),
      top 240ms var(--ease-settle),
      bottom 240ms var(--ease-settle);
  }

  /* Radial light wash tracking pointer on hover */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    background: radial-gradient(
      260px circle at var(--mx, 18%) var(--my, 50%),
      rgba(226, 244, 255, 0.14),
      rgba(176, 214, 234, 0.045) 46%,
      transparent 78%
    );
    transition: opacity 240ms var(--ease-settle);
  }

  &:focus-visible {
    outline: none;
    opacity: 1;

    &::before {
      background: #ffffff;
      box-shadow: 0 0 14px rgba(226, 244, 255, 0.9);
    }

    &::after {
      opacity: 1;
    }
  }

  &:hover:not(:disabled) {
    opacity: 1;
    color: #ffffff;
    text-shadow:
      0 0 22px rgba(226, 244, 255, 0.58),
      0 2px 16px rgba(2, 4, 7, 0.96);

    &::before {
      top: 0;
      bottom: 0;
      width: 2.5px;
      background: #ffffff;
      box-shadow:
        0 0 14px rgba(232, 246, 255, 0.95),
        0 0 28px rgba(186, 226, 246, 0.55);
    }

    &::after {
      opacity: 1;
    }

    .choice-inner {
      transform: translateX(8px);
    }

    .trigger-diamond {
      opacity: 1;
      text-shadow: 0 0 12px rgba(232, 246, 255, 0.95);
    }

    .trigger-key {
      color: #ffffff;
      text-shadow: 0 0 12px rgba(232, 246, 255, 0.72);
    }
  }

  &:disabled {
    cursor: default;
  }

  &.is-trapped {
    opacity: 0.3;
    background: linear-gradient(90deg, rgba(24, 12, 14, 0.24) 0%, transparent 72%);

    &::before {
      background: rgba(224, 145, 135, 0.45);
    }

    .trigger-diamond,
    .trigger-key {
      animation: none;
      opacity: 0.5;
    }

    .choice-text {
      text-decoration: line-through;
    }
  }

  &.is-cleared {
    opacity: 1;
    color: #ffffff;
    animation: sluice-flash 680ms var(--ease-settle);
    background: linear-gradient(
      90deg,
      rgba(152, 217, 190, 0.16) 0%,
      rgba(152, 217, 190, 0.04) 68%,
      transparent 100%
    );
    text-shadow:
      0 0 20px rgba(152, 217, 190, 0.52),
      0 2px 16px rgba(2, 4, 7, 0.96);

    &::before {
      top: 0;
      bottom: 0;
      width: 2.5px;
      background: var(--state-ok);
      box-shadow:
        0 0 16px rgba(152, 217, 190, 0.95),
        0 0 30px rgba(152, 217, 190, 0.48);
    }

    .choice-inner {
      transform: translateX(8px);
    }

    .trigger-diamond,
    .trigger-key {
      animation: none;
      color: var(--state-ok);
      text-shadow: 0 0 12px rgba(152, 217, 190, 0.85);
    }
  }
}

.choice-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  transition: transform 240ms var(--ease-settle);
}

.choice-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 2px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: rgba(224, 240, 248, 0.86);
  white-space: nowrap;
}

.trigger-diamond {
  font-size: 12px;
  color: rgba(232, 246, 255, 0.9);
  animation: trigger-breathe 2.6s ease-in-out infinite;
  transition:
    color 220ms var(--ease-settle),
    text-shadow 220ms var(--ease-settle);
}

.trigger-key {
  color: rgba(214, 232, 242, 0.78);
  transition:
    color 220ms var(--ease-settle),
    text-shadow 220ms var(--ease-settle);
}

.choice-text {
  flex: 1;
}

@keyframes trigger-breathe {
  0%,
  100% {
    opacity: 0.45;
    text-shadow: 0 0 4px rgba(212, 236, 248, 0.25);
  }
  50% {
    opacity: 1;
    text-shadow: 0 0 12px rgba(232, 246, 255, 0.9);
  }
}

@keyframes sluice-flash {
  0% {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.34) 0%,
      rgba(216, 244, 236, 0.14) 72%,
      transparent 100%
    );
    text-shadow: 0 0 28px rgba(255, 255, 255, 0.95);
  }
  100% {
    background: linear-gradient(
      90deg,
      rgba(152, 217, 190, 0.16) 0%,
      rgba(152, 217, 190, 0.04) 68%,
      transparent 100%
    );
  }
}

.quote-feedback {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 64ch;

  &.is-trap .quote-tag {
    color: var(--state-danger);
  }

  &.is-open .quote-tag {
    color: var(--state-ok);
  }
}

.quote-tag {
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.quote-body {
  font-size: 14.5px;
  color: var(--text-primary);
  letter-spacing: 0.01em;
  line-height: 1.6;
}
</style>
