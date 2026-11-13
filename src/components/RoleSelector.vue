<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  roles: {
    type: Array,
    required: true
  },
  selectedRoleId: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['select']);

const activeGroup = ref('Все');

const groups = computed(() => {
  const unique = new Set(props.roles.map((r) => r.group));
  return ['Все', ...Array.from(unique)];
});

const filteredRoles = computed(() => {
  if (activeGroup.value === 'Все') return props.roles;
  return props.roles.filter((r) => r.group === activeGroup.value);
});
</script>

<template>
  <section class="role-float-stage">
    <header class="hero-float">
      <p class="hero-kicker mist-glow">Проект 392 · Второй этап</p>
      <h1 class="display-title hero-title mist-glow">Правила игры на глубине</h1>
      <p class="hero-subtitle mist-glow">
        Выбери свою роль и проведи исследователя через подводные фонари и шлюзы — от общих законов проекта до решений твоей команды.
      </p>
    </header>

    <div class="group-bar" role="tablist" aria-label="Фильтр ролей">
      <button
        v-for="grp in groups"
        :key="grp"
        type="button"
        role="tab"
        :aria-selected="activeGroup === grp"
        class="lantern-btn group-btn"
        :class="{ 'is-active': activeGroup === grp }"
        @click="activeGroup = grp"
      >
        {{ grp }}
      </button>
    </div>

    <div class="roles-mist-list">
      <button
        v-for="role in filteredRoles"
        :key="role.id"
        type="button"
        class="role-row"
        :class="{ 'is-selected': role.id === selectedRoleId }"
        @click="emit('select', role.id)"
      >
        <span class="role-title mist-glow">{{ role.title }}</span>
        <span class="role-hint">{{ role.hint }}</span>
      </button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.role-float-stage {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 24px;
}

.hero-float {
  max-width: 660px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero-kicker {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}

.hero-title {
  font-size: clamp(2.4rem, 4.4vw, 3.85rem);
  color: var(--text-primary);
}

.hero-subtitle {
  font-size: 15.5px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 58ch;
}

.group-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  align-self: flex-start;
}

.group-btn {
  font-size: 13.5px;
  min-height: 34px;
  padding: 4px 0;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }
}

.roles-mist-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 44px;
  row-gap: 14px;
  margin-top: 4px;
}

.role-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 2px;
  padding: 6px 0;
  opacity: 0.56;
  transition:
    opacity 220ms var(--ease-settle),
    transform 220ms var(--ease-settle),
    text-shadow 220ms var(--ease-settle);

  &:hover,
  &.is-selected {
    opacity: 1;
    transform: translateX(6px);

    .role-title {
      color: #ffffff;
      text-shadow:
        0 0 22px rgba(226, 244, 255, 0.55),
        0 2px 16px rgba(2, 4, 7, 0.95);
    }

    .role-hint {
      color: var(--text-secondary);
    }
  }
}

.role-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  transition:
    color 200ms var(--ease-settle),
    text-shadow 220ms var(--ease-settle);
}

.role-hint {
  font-size: 13px;
  color: var(--text-muted);
  transition: color 200ms var(--ease-settle);
}

@media (max-width: 820px) {
  .roles-mist-list {
    grid-template-columns: 1fr;
  }
}
</style>
