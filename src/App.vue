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

// 'ROLE_SELECT' | 'BRIEFING_BASE' | 'BRIEFING_ROLE' | 'PLAYING' | 'COMPLETED'
const gameState = ref('ROLE_SELECT');
const selectedRoleId = ref('');
const baseStep = ref(0);
const roleStep = ref(0);
const encounters = ref([]);
const obstacles = ref([]);
const currentIndex = ref(0);
const trapNonce = ref(0);
const trapCount = ref(0);
const firstTryCount = ref(0);
const isShaking = ref(false);
const soundMuted = ref(isSoundMuted());
const textReady = ref(true);

let shakeTimer = null;
let fallbackArrivalTimer = null;

const selectedRole = computed(
  () => ROLES.find((r) => r.id === selectedRoleId.value) || null
);

const currentRoleBriefing = computed(
  () => ROLE_BRIEFING[selectedRoleId.value] || null
);

const currentEncounter = computed(
  () => encounters.value[currentIndex.value] || null
);

const currentObstacleSolved = computed(
  () => Boolean(obstacles.value[currentIndex.value]?.solved)
);

const currentCheatsheet = computed(
  () => ROLE_CHEATSHEET[selectedRoleId.value] || []
);

function beginArrivalWait() {
  textReady.value = false;
  if (fallbackArrivalTimer) clearTimeout(fallbackArrivalTimer);
  fallbackArrivalTimer = setTimeout(() => {
    textReady.value = true;
  }, 950);
}

function handleDiverArrived() {
  if (fallbackArrivalTimer) clearTimeout(fallbackArrivalTimer);
  textReady.value = true;
  playSonarStep();
}

function startRoleRun(roleId) {
  selectedRoleId.value = roleId;
  baseStep.value = 0;
  roleStep.value = 0;

  const list = getEncountersForRole(roleId);
  encounters.value = list;
  obstacles.value = list.map((item) => ({
    id: item.id,
    obstacleType: item.obstacleType,
    solved: false
  }));
  currentIndex.value = 0;
  trapCount.value = 0;
  firstTryCount.value = 0;

  beginArrivalWait();
  gameState.value = 'BRIEFING_BASE';
}

function handleBaseNext() {
  beginArrivalWait();
  if (baseStep.value < BASE_BRIEFING.length - 1) {
    baseStep.value += 1;
  } else {
    roleStep.value = 0;
    gameState.value = 'BRIEFING_ROLE';
  }
}

function handleBasePrev() {
  if (baseStep.value > 0) {
    beginArrivalWait();
    baseStep.value -= 1;
  }
}

function handleRoleNext() {
  beginArrivalWait();
  if (roleStep.value < 3) {
    roleStep.value += 1;
  } else {
    gameState.value = 'PLAYING';
  }
}

function handleRolePrev() {
  beginArrivalWait();
  if (roleStep.value > 0) {
    roleStep.value -= 1;
  } else {
    baseStep.value = BASE_BRIEFING.length - 1;
    gameState.value = 'BRIEFING_BASE';
  }
}

function handleSelectLantern(idx) {
  if (gameState.value === 'BRIEFING_BASE') {
    if (baseStep.value === idx) return;
    beginArrivalWait();
    baseStep.value = idx;
  } else if (gameState.value === 'BRIEFING_ROLE') {
    if (roleStep.value === idx) return;
    beginArrivalWait();
    roleStep.value = idx;
  }
}

function handleSolve({ firstTry }) {
  if (obstacles.value[currentIndex.value]) {
    obstacles.value[currentIndex.value].solved = true;
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
  if (currentIndex.value < encounters.value.length - 1) {
    beginArrivalWait();
    currentIndex.value += 1;
  } else {
    gameState.value = 'COMPLETED';
    textReady.value = true;
    playCompleteChord();
  }
}

function resetToRoleSelect() {
  if (fallbackArrivalTimer) clearTimeout(fallbackArrivalTimer);
  textReady.value = true;
  gameState.value = 'ROLE_SELECT';
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
  currentIndex.value = 0;
  trapCount.value = 0;
  firstTryCount.value = 0;
  beginArrivalWait();
  gameState.value = 'PLAYING';
}

function reviewBriefing() {
  baseStep.value = 0;
  roleStep.value = 0;
  beginArrivalWait();
  gameState.value = 'BRIEFING_BASE';
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
    if (gameState.value === 'BRIEFING_BASE') {
      e.preventDefault();
      handleBasePrev();
    } else if (gameState.value === 'BRIEFING_ROLE') {
      e.preventDefault();
      handleRolePrev();
    }
  } else if (e.key === 'ArrowRight' || e.code === 'Space') {
    if (gameState.value === 'BRIEFING_BASE') {
      e.preventDefault();
      handleBaseNext();
    } else if (gameState.value === 'BRIEFING_ROLE') {
      e.preventDefault();
      handleRoleNext();
    } else if (gameState.value === 'PLAYING' && textReady.value && currentObstacleSolved.value) {
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
  if (fallbackArrivalTimer) clearTimeout(fallbackArrivalTimer);
});
</script>

<template>
  <div class="abyss-shell">
    <AbyssCanvas
      :game-state="gameState"
      :briefing-step="gameState === 'BRIEFING_BASE' ? baseStep : roleStep"
      :obstacles="obstacles"
      :current-index="currentIndex"
      :trap-nonce="trapNonce"
      @arrived="handleDiverArrived"
      @select-lantern="handleSelectLantern"
    />

    <!-- Minimal transparent top bar with zero center boxes or duplicates -->
    <header class="horizon-bar">
      <button type="button" class="brand-mark mist-glow" @click="resetToRoleSelect">
        Глубина 392
      </button>

      <div class="horizon-actions">
        <button
          v-if="gameState === 'PLAYING'"
          type="button"
          class="lantern-btn top-link"
          @click="reviewBriefing"
        >
          К вводной
        </button>
        <button
          v-if="gameState !== 'ROLE_SELECT'"
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

    <main class="stage-container" :class="{ 'is-shaking': isShaking }">
      <Transition name="fog-reveal" mode="out-in">
        <RoleSelector
          v-if="gameState === 'ROLE_SELECT'"
          key="role-select"
          :roles="ROLES"
          :selected-role-id="selectedRoleId"
          @select="startRoleRun"
        />

        <BriefingStage
          v-else-if="gameState === 'BRIEFING_BASE'"
          key="brief-base"
          mode="base"
          :base-steps="BASE_BRIEFING"
          :step-index="baseStep"
          :text-visible="textReady"
          @next="handleBaseNext"
          @prev="handleBasePrev"
        />

        <BriefingStage
          v-else-if="gameState === 'BRIEFING_ROLE' && currentRoleBriefing"
          key="brief-role"
          mode="role"
          :role-briefing="currentRoleBriefing"
          :role-title="selectedRole?.shortTitle || ''"
          :step-index="roleStep"
          :text-visible="textReady"
          @next="handleRoleNext"
          @prev="handleRolePrev"
        />

        <EncounterStage
          v-else-if="gameState === 'PLAYING' && currentEncounter && selectedRole"
          key="encounter-stage"
          :encounter="currentEncounter"
          :index="currentIndex"
          :total="encounters.length"
          :role-title="selectedRole.shortTitle"
          :text-visible="textReady"
          @solve="handleSolve"
          @trap="handleTrap"
          @advance="handleAdvance"
        />

        <CompletionScreen
          v-else-if="gameState === 'COMPLETED' && selectedRole"
          key="completed"
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
      </Transition>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.abyss-shell {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  z-index: 1;
}

.horizon-bar {
  position: sticky;
  top: 0;
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
  margin: 0 auto;
  padding: 24px 24px 0;
  flex: 1;
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
    padding: 14px 16px 0;
  }
}
</style>
