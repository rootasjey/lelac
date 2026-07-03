<template>
  <WidgetCard title="Videos">
    <div class="videos-list">
      <a
        v-for="(video, index) in displayVideos"
        :key="video.id"
        :href="video.url"
        target="_blank"
        rel="noopener noreferrer"
        class="video-item"
      >
        <div class="video-thumbnail">
          <div class="video-thumbnail-placeholder" :style="{ backgroundColor: video.color }">
            <svg class="video-play-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div class="video-duration">{{ video.duration }}</div>
        </div>
        <div class="video-title">{{ video.title }}</div>
        <div class="video-meta">{{ video.time }} · {{ video.channel }}</div>
      </a>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
interface Video {
  id: string
  title: string
  url: string
  channel: string
  time: string
  duration: string
  color: string
}

const props = withDefaults(defineProps<{
  videos?: Video[]
}>(), {})

const defaultVideos: Video[] = [
  { id: '1', title: 'NEW NUCs Fanless to Gaming', url: '#', channel: 'ServeTheHome', time: '22h', duration: '15:42', color: '#4a90d9' },
  { id: '2', title: 'TrueNAS vs Unraid - Which one is the...', url: '#', channel: 'Techno Tim', time: '5d', duration: '22:15', color: '#7b68ee' },
  { id: '3', title: '55 TOPS AI Pi goes faster', url: '#', channel: 'Jeff Geerling', time: '7d', duration: '12:38', color: '#2ecc71' },
  { id: '4', title: 'MOST Server cores EVER Intel Xeon 6', url: '#', channel: 'ServeTheHome', time: '9d', duration: '18:54', color: '#e74c3c' },
]

const videos = computed(() => props.videos || defaultVideos)

const displayVideos = computed(() => {
  return videos.value.slice(0, 4)
})
</script>

<style scoped>
.videos-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .videos-list {
    grid-template-columns: repeat(4, 1fr);
  }
}

.video-item {
  display: block;
  text-decoration: none;
}

.video-item:hover {
  text-decoration: none;
}

.video-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.video-thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-play-icon {
  width: 2rem;
  height: 2rem;
  color: rgba(255, 255, 255, 0.9);
}

.video-duration {
  position: absolute;
  bottom: 0.375rem;
  right: 0.375rem;
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.625rem;
  color: #ffffff;
  background-color: rgba(0, 0, 0, 0.75);
  padding: 0.125rem 0.375rem;
  border-radius: 2px;
}

.video-title {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.75rem;
  color: var(--text-primary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.15s;
}

.video-item:hover .video-title {
  color: var(--link-color);
}

.video-meta {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.625rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}
</style>
