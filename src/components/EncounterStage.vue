<script setup>
import { computed, ref, watch } from 'vue';
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

function selectOption(opt) {
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

      <div class="choices-silhouette">
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
          @click="selectOption(opt)"
        >
          <span class="choice-dot" aria-hidden="true" />
          <span class="choice-num tabular-nums">0{{ idx + 1 }}</span>
          <span class="choice-text">
            <RichMistText :text="opt.text" />
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
  max-width: 700px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 13px;
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
  line-height: 1.56;
  max-width: 62ch;
}

.situation-prompt {
  margin-top: 4px;
  font-size: 17px;
  font-weight: 500;
  color: #f1f7fa;
  line-height: 1.55;
  max-width: 60ch;
}

.choices-silhouette {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.silhouette-choice {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 5px 0;
  text-align: left;
  color: var(--text-primary);
  opacity: 0.62;
  font-size: 15.5px;
  line-height: 1.5;
  transition:
    opacity 220ms var(--ease-settle),
    color 220ms var(--ease-settle),
    text-shadow 240ms var(--ease-settle),
    transform 220ms var(--ease-settle);

  &:hover:not(:disabled) {
    opacity: 1;
    color: #ffffff;
    text-shadow:
      0 0 22px rgba(226, 244, 255, 0.62),
      0 2px 16px rgba(2, 4, 7, 0.96);
    transform: translateX(6px);

    .choice-dot {
      opacity: 1;
      box-shadow: 0 0 12px rgba(226, 244, 255, 0.95);
    }
  }

  &:disabled {
    cursor: default;
  }

  &.is-trapped {
    opacity: 0.28;
    text-decoration: line-through;
  }

  &.is-cleared {
    opacity: 1;
    color: #ffffff;
    text-shadow:
      0 0 20px rgba(152, 217, 190, 0.45),
      0 2px 16px rgba(2, 4, 7, 0.96);

    .choice-dot {
      background: var(--state-ok);
      box-shadow: 0 0 10px rgba(152, 217, 190, 0.85);
    }
  }
}

.choice-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  margin-top: 10px;
  flex-shrink: 0;
  background: rgba(232, 244, 250, 0.85);
  box-shadow: 0 0 8px rgba(212, 236, 248, 0.6);
  opacity: 0.5;
  transition:
    opacity 200ms var(--ease-settle),
    box-shadow 200ms var(--ease-settle);
}

.choice-num {
  font-size: 12.5px;
  color: var(--text-muted);
  margin-top: 3px;
  flex-shrink: 0;
}

.choice-text {
  flex: 1;
}

.quote-feedback {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 62ch;

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
  line-height: 1.55;
}
</style>
