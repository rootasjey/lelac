<template>
  <WidgetCard title="Twitch Channels">
    <div class="twitch-list">
      <div
        v-for="(channel, index) in displayChannels"
        :key="channel.name"
        class="twitch-item"
      >
        <div class="twitch-avatar-wrapper">
          <div
            class="twitch-avatar"
            :style="{ backgroundColor: channel.color }"
          >
            {{ channel.name.charAt(0) }}
          </div>
          <div v-if="channel.live" class="twitch-live-badge">LIVE</div>
        </div>
        <div class="twitch-info">
          <div class="twitch-name">{{ channel.name }}</div>
          <div class="twitch-status">{{ channel.status }}</div>
          <div v-if="channel.live" class="twitch-viewers">
            {{ channel.duration }} · {{ channel.viewers }}
          </div>
        </div>
      </div>

      <button
        v-if="channels.length > 4"
        class="show-more"
        @click="showAll = !showAll"
      >
        {{ showAll ? 'SHOW LESS' : 'SHOW MORE' }} ▾
      </button>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
interface TwitchChannel {
  name: string
  live: boolean
  status: string
  duration?: string
  viewers?: string
  color: string
}

const showAll = ref(false)

const channels: TwitchChannel[] = [
  { name: 'ThePrimeagen', live: false, status: 'Offline', color: '#9146ff' },
  { name: 'CohhCarnage', live: false, status: 'Offline', color: '#ff6b6b' },
  { name: 'ChrisTitusTech', live: false, status: 'Offline', color: '#00d4aa' },
  { name: 'PirateSoftware', live: true, status: 'DWARRF: A Pinball Rogueli...', duration: '4h', viewers: '2.0k viewers', color: '#ff9500' },
  { name: 'j_blow', live: false, status: 'Offline', color: '#1e90ff' },
]

const displayChannels = computed(() => {
  return showAll.value ? channels : channels.slice(0, 4)
})
</script>

<style scoped>
.twitch-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.twitch-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.twitch-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.twitch-avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.875rem;
  font-weight: 700;
  color: #ffffff;
}

.twitch-live-badge {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.5rem;
  font-weight: 700;
  color: #ffffff;
  background-color: #eb0400;
  padding: 0.125rem 0.375rem;
  border-radius: 2px;
  letter-spacing: 0.05em;
}

.twitch-info {
  min-width: 0;
}

.twitch-name {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.twitch-status {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.6875rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.twitch-viewers {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.625rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
}

.show-more {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  padding: 0;
  transition: color 0.15s;
}

.show-more:hover {
  color: var(--text-secondary);
}
</style>
