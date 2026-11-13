<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import AbyssCanvas from './components/AbyssCanvas.vue';
import BriefingStage from './components/BriefingStage.vue';
import CompletionScreen from './components/CompletionScreen.vue';
import EncounterStage from './components/EncounterStage.vue';
import RoleSelector from './components/RoleSelector.vue';
import { BASE_BRIEFING, ROLE_BRIEFING } from './data/briefingData';
import { ROLE_CHEATSHEET, ROLES, getEncountersForRole } from './data/encounterData';
import {
  isSoundMuted,
  playCompleteChord,
  playGateOpen,
  playSonarStep,
  playTrapImpact,
  setSoundMuted
} from './utils/sound';

// Target state (drives AbyssCanvas diver & lantern targets immediately)
const targetState = ref('ROLE_SELECT');
const selectedRoleId = ref('');
const targetBaseStep = ref(0);
const targetRoleStep = ref(0);
const targetIndex = ref(0);

// Displayed state (swapped invisibly while .stage-veil is fogged at opacity 0)
const displayedState = ref('ROLE_SELECT');
const displayedBaseStep = ref(0);
const displayedRoleStep = ref(0);
const displayedIndex = ref(0);

const isFogged = ref(false);
const encounters = ref([]);
const obstacles = ref([]);
const trapNonce = ref(0);
const trapCount = ref(0);
const firstTryCount = ref(0);
const isShaking = ref(false);
const soundMuted = ref(isSoundMuted());
const stageContainerRef = ref(null);

let shakeTimer = null;
let minFadeTimer = null;
let fallbackArrivalTimer = null;
let minFadeDone = true;
let arrivedDone = true;

const selectedRole = computed(
  () => ROLES.find((r) => r.id === selectedRoleId.value) || null
);

const currentRoleBriefing = computed(
  () => ROLE_BRIEFING[selectedRoleId.value] || null
);

const currentEncounter = computed(
  () => encounters.value[displayedIndex.value] || null
);

const currentObstacleSolved = computed(
  () => Boolean(obstacles.value[displayedIndex.value]?.solved)
);

const currentCheatsheet = computed(
  () => ROLE_CHEATSHEET[selectedRoleId.value] || []
);

const showBriefingNav = computed(
  () => targetState.value === 'BRIEFING_BASE' || targetState.value === 'BRIEFING_ROLE'
);

const canGoPrev = computed(
  () => !(targetState.value === 'BRIEFING_BASE' && targetBaseStep.value === 0)
);

const briefingNextLabel = computed(() => {
  if (
    targetState.value === 'BRIEFING_BASE' &&
    targetBaseStep.value === BASE_BRIEFING.length - 1
  ) {
    return 'К правилам роли';
  }
  if (targetState.value === 'BRIEFING_ROLE' && targetRoleStep.value === 3) {
    return 'К шлюзам';
  }
  return 'Дальше';
});

const showEncounterNext = computed(
  () => displayedState.value === 'PLAYING' && currentObstacleSolved.value && !isFogged.value
);

function handleBriefingPrev() {
  if (targetState.value === 'BRIEFING_BASE') {
    handleBasePrev();
  } else if (targetState.value === 'BRIEFING_ROLE') {
    handleRolePrev();
  }
}

function handleBriefingNext() {
  if (targetState.value === 'BRIEFING_BASE') {
    handleBaseNext();
  } else if (targetState.value === 'BRIEFING_ROLE') {
    handleRoleNext();
  }
}

function flushRevealIfReady() {
  if (!minFadeDone || !arrivedDone) return;

  // Swap displayed content & reset inner scroll invisibly while opacity === 0
  displayedState.value = targetState.value;
  displayedBaseStep.value = targetBaseStep.value;
  displayedRoleStep.value = targetRoleStep.value;
  displayedIndex.value = targetIndex.value;

  if (stageContainerRef.value) {
    stageContainerRef.value.scrollTop = 0;
  }

  // Reveal smoothly out of fog on next frame
  requestAnimationFrame(() => {
    isFogged.value = false;
  });
}

function transitionScene(applyTargets, waitForDiver = true) {
  if (minFadeTimer) clearTimeout(minFadeTimer);
  if (fallbackArrivalTimer) clearTimeout(fallbackArrivalTimer);

  isFogged.value = true;
  minFadeDone = false;
  arrivedDone = !waitForDiver;

  applyTargets();

  minFadeTimer = setTimeout(() => {
    minFadeDone = true;
    flushRevealIfReady();
  }, 240);

  if (waitForDiver) {
    fallbackArrivalTimer = setTimeout(() => {
      arrivedDone = true;
      flushRevealIfReady();
    }, 900);
  }
}

function handleDiverArrived() {
  if (fallbackArrivalTimer) clearTimeout(fallbackArrivalTimer);
  arrivedDone = true;
  playSonarStep();
  flushRevealIfReady();
}

function startRoleRun(roleId) {
  selectedRoleId.value = roleId;
  const list = getEncountersForRole(roleId);
  encounters.value = list;
  obstacles.value = list.map((item) => ({
    id: item.id,
    obstacleType: item.obstacleType,
    solved: false
  }));
  trapCount.value = 0;
  firstTryCount.value = 0;

  transitionScene(() => {
    targetBaseStep.value = 0;
    targetRoleStep.value = 0;
    targetIndex.value = 0;
    targetState.value = 'BRIEFING_BASE';
  }, true);
}

function handleBaseNext() {
  transitionScene(() => {
    if (targetBaseStep.value < BASE_BRIEFING.length - 1) {
      targetBaseStep.value += 1;
    } else {
      targetRoleStep.value = 0;
      targetState.value = 'BRIEFING_ROLE';
    }
  }, true);
}

function handleBasePrev() {
  if (targetBaseStep.value <= 0) return;
  transitionScene(() => {
    targetBaseStep.value -= 1;
  }, true);
}

function handleRoleNext() {
  transitionScene(() => {
    if (targetRoleStep.value < 3) {
      targetRoleStep.value += 1;
    } else {
      targetState.value = 'PLAYING';
    }
  }, true);
}

function handleRolePrev() {
  transitionScene(() => {
    if (targetRoleStep.value > 0) {
      targetRoleStep.value -= 1;
    } else {
      targetBaseStep.value = BASE_BRIEFING.length - 1;
      targetState.value = 'BRIEFING_BASE';
    }
  }, true);
}

function handleSelectLantern(idx) {
  if (targetState.value === 'BRIEFING_BASE' && targetBaseStep.value !== idx) {
    transitionScene(() => {
      targetBaseStep.value = idx;
    }, true);
  } else if (targetState.value === 'BRIEFING_ROLE' && targetRoleStep.value !== idx) {
    transitionScene(() => {
      targetRoleStep.value = idx;
    }, true);
  }
}

function handleSolve({ firstTry }) {
  if (obstacles.value[displayedIndex.value]) {
    obstacles.value[displayedIndex.value].solved = true;
  }
  if (firstTry) {
    firstTryCount.value += 1;
  }
  playGateOpen();
}

function handleTrap() {
  trapCount.value += 1;
  trapNonce.value += 1;
  isShaking.value = false;
  requestAnimationFrame(() => {
    isShaking.value = true;
  });
  if (shakeTimer) clearTimeout(shakeTimer);
  shakeTimer = setTimeout(() => {
    isShaking.value = false;
  }, 440);
  playTrapImpact();
}

function handleAdvance() {
  if (targetIndex.value < encounters.value.length - 1) {
    transitionScene(() => {
      targetIndex.value += 1;
    }, true);
  } else {
    transitionScene(() => {
      targetState.value = 'COMPLETED';
    }, false);
    playCompleteChord();
  }
}

function resetToRoleSelect() {
  transitionScene(() => {
    targetState.value = 'ROLE_SELECT';
  }, false);
  playSonarStep();
}

function restartTrialsOnly() {
  if (!selectedRoleId.value) return;
  const list = getEncountersForRole(selectedRoleId.value);
  encounters.value = list;
  obstacles.value = list.map((item) => ({
    id: item.id,
    obstacleType: item.obstacleType,
    solved: false
  }));
  trapCount.value = 0;
  firstTryCount.value = 0;

  transitionScene(() => {
    targetIndex.value = 0;
    targetState.value = 'PLAYING';
  }, true);
}

function reviewBriefing() {
  transitionScene(() => {
    targetBaseStep.value = 0;
    targetRoleStep.value = 0;
    targetState.value = 'BRIEFING_BASE';
  }, true);
}

function toggleSound() {
  soundMuted.value = !soundMuted.value;
  setSoundMuted(soundMuted.value);
  if (!soundMuted.value) {
    playSonarStep();
  }
}

function handleKeydown(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if (e.key === 'ArrowLeft') {
    if (targetState.value === 'BRIEFING_BASE') {
      e.preventDefault();
      handleBasePrev();
    } else if (targetState.value === 'BRIEFING_ROLE') {
      e.preventDefault();
      handleRolePrev();
    }
  } else if (e.key === 'ArrowRight' || e.code === 'Space') {
    if (targetState.value === 'BRIEFING_BASE') {
      e.preventDefault();
      handleBaseNext();
    } else if (targetState.value === 'BRIEFING_ROLE') {
      e.preventDefault();
      handleRoleNext();
    } else if (
      targetState.value === 'PLAYING' &&
      !isFogged.value &&
      currentObstacleSolved.value
    ) {
      e.preventDefault();
      handleAdvance();
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  if (shakeTimer) clearTimeout(shakeTimer);
  if (minFadeTimer) clearTimeout(minFadeTimer);
  if (fallbackArrivalTimer) clearTimeout(fallbackArrivalTimer);
});
</script>

<template>
  <div class="abyss-shell">
    <AbyssCanvas
      :game-state="targetState"
      :briefing-step="targetState === 'BRIEFING_BASE' ? targetBaseStep : targetRoleStep"
      :obstacles="obstacles"
      :current-index="targetIndex"
      :trap-nonce="trapNonce"
      @arrived="handleDiverArrived"
      @select-lantern="handleSelectLantern"
    />

    <header class="horizon-bar">
      <button type="button" class="brand-mark mist-glow" @click="resetToRoleSelect">
        Глубина 392
      </button>

      <div class="horizon-actions">
        <button
          v-if="targetState === 'PLAYING'"
          type="button"
          class="lantern-btn top-link"
          @click="reviewBriefing"
        >
          К вводной
        </button>
        <button
          v-if="targetState !== 'ROLE_SELECT'"
          type="button"
          class="lantern-btn top-link"
          @click="resetToRoleSelect"
        >
          Сменить роль
        </button>
        <button
          type="button"
          class="lantern-btn top-link"
          @click="toggleSound"
        >
          {{ soundMuted ? 'Звук выкл' : 'Звук вкл' }}
        </button>
      </div>
    </header>

    <main ref="stageContainerRef" class="stage-container" :class="{ 'is-shaking': isShaking }">
      <div class="stage-veil" :class="{ 'is-fogged': isFogged }">
        <RoleSelector
          v-if="displayedState === 'ROLE_SELECT'"
          :roles="ROLES"
          :selected-role-id="selectedRoleId"
          @select="startRoleRun"
        />

        <BriefingStage
          v-else-if="displayedState === 'BRIEFING_BASE'"
          mode="base"
          :base-steps="BASE_BRIEFING"
          :step-index="displayedBaseStep"
        />

        <BriefingStage
          v-else-if="displayedState === 'BRIEFING_ROLE' && currentRoleBriefing"
          mode="role"
          :role-briefing="currentRoleBriefing"
          :role-title="selectedRole?.shortTitle || ''"
          :step-index="displayedRoleStep"
        />

        <EncounterStage
          v-else-if="displayedState === 'PLAYING' && currentEncounter && selectedRole"
          :encounter="currentEncounter"
          :index="displayedIndex"
          :total="encounters.length"
          :role-title="selectedRole.shortTitle"
          @solve="handleSolve"
          @trap="handleTrap"
        />

        <CompletionScreen
          v-else-if="displayedState === 'COMPLETED' && selectedRole"
          :role-title="selectedRole.title"
          :cheatsheet="currentCheatsheet"
          :stats="{
            firstTry: firstTryCount,
            total: encounters.length,
            traps: trapCount
          }"
          @restart="restartTrialsOnly"
          @review-briefing="reviewBriefing"
          @change-role="resetToRoleSelect"
        />
      </div>
    </main>

    <!-- Viewport-fixed navigation outside .stage-veil so filter/transform never shifts fixed coordinates -->
    <template v-if="showBriefingNav">
      <button
        type="button"
        class="fixed-lantern-btn is-left"
        :disabled="!canGoPrev"
        @click="handleBriefingPrev"
      >
        <span class="key-hint" aria-hidden="true">←</span>
        <span>Назад</span>
      </button>

      <button
        type="button"
        class="fixed-lantern-btn is-right"
        @click="handleBriefingNext"
      >
        <span>{{ briefingNextLabel }}</span>
        <span class="key-hint" aria-hidden="true">→</span>
      </button>
    </template>

    <button
      v-else-if="showEncounterNext"
      type="button"
      class="fixed-lantern-btn is-right"
      @click="handleAdvance"
    >
      <span>{{ displayedIndex === encounters.length - 1 ? 'К маяку' : 'Дальше' }}</span>
      <span class="key-hint" aria-hidden="true">→</span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.abyss-shell {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 1;
}

.horizon-bar {
  flex-shrink: 0;
  position: relative;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 36px;
}

.brand-mark {
  font-family: var(--font-display);
  font-size: 23px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  flex-shrink: 0;
  letter-spacing: 0.01em;
  opacity: 0.85;
  transition: opacity 200ms var(--ease-settle);

  &:hover {
    opacity: 1;
  }
}

.horizon-actions {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-shrink: 0;
}

.top-link {
  font-size: 13.5px;
  min-height: 34px;
  padding: 4px 0;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }
}

.stage-container {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 820px;
  max-height: calc(100vh - 240px);
  max-height: calc(100dvh - 240px);
  margin: 0 auto;
  padding: 20px 24px 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

@media (max-width: 760px) {
  .horizon-bar {
    padding: 16px;
    gap: 12px;
  }

  .horizon-actions {
    gap: 14px;
  }

  .stage-container {
    max-height: calc(100dvh - 210px);
    padding: 12px 16px 0;
  }
}
</style>
