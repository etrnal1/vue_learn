<template>
  <transition name="fade">
    <div v-if="src" class="lightbox-overlay" @click.self="close">
      <button type="button" class="lightbox-close" @click="close">✕</button>
      <div
        class="lightbox-viewport"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @dblclick="onDoubleClick"
      >
        <img
          ref="img"
          :src="src"
          class="lightbox-img"
          :style="imgStyle"
          draggable="false"
        />
      </div>
      <div class="lightbox-hint">双指缩放 / 双击放大 · 点击空白处关闭</div>
    </div>
  </transition>
</template>

<script>
// 全局图片放大器：因为整个 app 的 viewport 关了浏览器原生的 user-scalable
// （防止误触缩放破坏布局），图片没法用系统手势放大，所以这里自己实现一套
// 双指缩放 / 双击放大 / 拖拽平移，点在图片上就能唤起。
export default {
  name: 'ImageLightbox',

  props: {
    src: { type: String, default: '' }
  },

  emits: ['update:src'],

  data() {
    return {
      scale: 1,
      translateX: 0,
      translateY: 0,
      interacting: false,
      _pinchStartDist: 0,
      _pinchStartScale: 1,
      _panStart: null
    }
  },

  computed: {
    imgStyle() {
      return {
        transform: `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`,
        transition: this.interacting ? 'none' : 'transform 0.15s ease-out'
      }
    }
  },

  watch: {
    src(val) {
      if (val) {
        this.scale = 1
        this.translateX = 0
        this.translateY = 0
      }
    }
  },

  methods: {
    close() {
      this.$emit('update:src', '')
    },
    dist(touches) {
      const [a, b] = touches
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    },
    onTouchStart(event) {
      this.interacting = true
      if (event.touches.length === 2) {
        this._pinchStartDist = this.dist(event.touches)
        this._pinchStartScale = this.scale
      } else if (event.touches.length === 1) {
        this._panStart = {
          x: event.touches[0].clientX - this.translateX,
          y: event.touches[0].clientY - this.translateY
        }
      }
    },
    onTouchMove(event) {
      event.preventDefault()
      if (event.touches.length === 2 && this._pinchStartDist) {
        const d = this.dist(event.touches)
        this.scale = Math.min(5, Math.max(1, this._pinchStartScale * (d / this._pinchStartDist)))
      } else if (event.touches.length === 1 && this.scale > 1 && this._panStart) {
        this.translateX = event.touches[0].clientX - this._panStart.x
        this.translateY = event.touches[0].clientY - this._panStart.y
      }
    },
    onTouchEnd(event) {
      this.interacting = false
      this._pinchStartDist = 0
      this._panStart = null
      if (this.scale < 1.05) {
        this.scale = 1
        this.translateX = 0
        this.translateY = 0
      }
      if (!event.touches || event.touches.length === 0) return
    },
    onDoubleClick(event) {
      if (this.scale > 1) {
        this.scale = 1
        this.translateX = 0
        this.translateY = 0
      } else {
        this.scale = 2.5
      }
    }
  }
}
</script>
