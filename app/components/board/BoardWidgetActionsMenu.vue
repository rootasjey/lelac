<template>
  <NDropdownMenuRoot>
    <NDropdownMenuTrigger as-child>
      <NButton type="button" icon label="i-ph-dots-three-vertical-bold" btn="ghost" size="sm" class="widget-menu-trigger" aria-label="Actions du widget" />
    </NDropdownMenuTrigger>
    <NDropdownMenuContent align="end" :side-offset="6" class="widget-menu-content">
      <NDropdownMenuItem class="widget-menu-item" leading="i-ph-gear-six-bold" @select="emit('configure')">Configurer</NDropdownMenuItem>
      <NDropdownMenuItem class="widget-menu-item" leading="i-ph-arrows-out-cardinal-bold" @select="emit('adjust')">Ajuster la taille et la position</NDropdownMenuItem>
      <NDropdownMenuItem class="widget-menu-item widget-menu-item-danger" leading="i-ph-trash-bold" @select="emit('remove')">Supprimer le widget</NDropdownMenuItem>
    </NDropdownMenuContent>
  </NDropdownMenuRoot>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  configure: []
  adjust: []
  remove: []
}>()
</script>

<style>
.widget-menu-content {
  min-width: 220px;
  padding: 6px;
  border-color: #444149;
  background: #242329;
  color: #d9d5df;
  font: 11px/1.4 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  box-shadow: 0 12px 30px #08080c88;
}

.widget-menu-content .widget-menu-item {
  display: flex;
  min-height: 34px;
  align-items: center;
  gap: 10px;
  border-radius: 3px;
  padding: 7px 9px;
  color: #d9d5df;
  font: inherit;
  text-align: left;
}

.widget-menu-content .widget-menu-item[data-highlighted] {
  background: #35333c;
  color: #ece9ee;
}

.widget-menu-content .widget-menu-item .btn-leading {
  color: #d8c58f;
  font-size: 15px;
}

.widget-menu-content .widget-menu-item-danger {
  margin-top: 5px;
  border-top: 1px solid #3a373e;
  border-radius: 0 0 3px 3px;
  padding-top: 10px;
  color: #e59b91;
}

.widget-menu-content .widget-menu-item-danger .btn-leading {
  color: inherit;
}

.widget-menu-content .widget-menu-item-danger[data-highlighted] {
  background: #422b30;
  color: #ffc0b3;
}

.widget-menu-trigger {
  width: 36px;
  height: 36px;
  padding: 0;
  color: #aaa7b2;
}

.widget-menu-trigger:hover:not(:disabled) {
  color: #d8c58f;
}
</style>
