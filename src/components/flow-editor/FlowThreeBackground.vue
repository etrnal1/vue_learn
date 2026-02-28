<template>
  <canvas ref="canvasRef" class="flow-fx-canvas"></canvas>
</template>

<script>
export default {
  name: 'FlowThreeBackground',
  props: {
    nodes: {
      type: Array,
      default: () => []
    },
    edges: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      renderer: null,
      scene: null,
      camera: null,
      points: null,
      pointPositions: null,
      relationGroup: null,
      relationVisuals: [],
      canvasWidth: 1,
      canvasHeight: 1,
      three: null,
      rafId: 0,
      resizeObserver: null,
      startAt: performance.now()
    }
  },
  watch: {
    nodes: {
      deep: true,
      handler() {
        this.rebuildRelationVisuals()
      }
    },
    edges: {
      deep: true,
      handler() {
        this.rebuildRelationVisuals()
      }
    }
  },
  async mounted() {
    const mod = await import('three')
    this.three = mod
    this.initThree()
  },
  beforeUnmount() {
    this.destroyThree()
  },
  methods: {
    initThree() {
      if (!this.three) return
      const THREE = this.three
      const canvas = this.$refs.canvasRef
      if (!canvas) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
      })
      this.renderer.setPixelRatio(dpr)

      this.scene = new THREE.Scene()
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
      this.camera.position.set(0, 0, 100)
      this.relationGroup = new THREE.Group()
      this.scene.add(this.relationGroup)

      const count = 160
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array(count * 3)
      for (let i = 0; i < count; i += 1) {
        const i3 = i * 3
        positions[i3] = (Math.random() - 0.5) * 12
        positions[i3 + 1] = (Math.random() - 0.5) * 7
        positions[i3 + 2] = (Math.random() - 0.5) * 2
      }
      this.pointPositions = positions
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

      const material = new THREE.PointsMaterial({
        size: 0.045,
        color: 0x60a5fa,
        transparent: true,
        opacity: 0.42,
        depthWrite: false
      })
      this.points = new THREE.Points(geometry, material)
      this.scene.add(this.points)

      const updateSize = () => {
        const parent = canvas.parentElement
        if (!parent || !this.renderer || !this.camera) return
        const width = parent.clientWidth || 1
        const height = parent.clientHeight || 1
        this.canvasWidth = width
        this.canvasHeight = height
        this.renderer.setSize(width, height, false)
        this.camera.left = -width / 2
        this.camera.right = width / 2
        this.camera.top = height / 2
        this.camera.bottom = -height / 2
        this.camera.updateProjectionMatrix()
        this.rebuildRelationVisuals()
      }

      this.resizeObserver = new ResizeObserver(updateSize)
      this.resizeObserver.observe(canvas.parentElement || canvas)
      updateSize()
      this.rebuildRelationVisuals()
      this.animate()
    },
    inferRelationType(edge = {}) {
      const label = String(edge.label || '').trim()
      if (label.includes('子')) return 'child'
      if (label.includes('平')) return 'parallel'
      return 'sequential'
    },
    parseNodeSize(node = {}) {
      const rawW = node?.style?.width || node?.width || 170
      const rawH = node?.style?.height || node?.height || 90
      const width = Number.parseFloat(String(rawW).replace('px', ''))
      const height = Number.parseFloat(String(rawH).replace('px', ''))
      return {
        width: Number.isFinite(width) ? width : 170,
        height: Number.isFinite(height) ? height : 90
      }
    },
    flowToScene(point) {
      return {
        x: point.x - this.canvasWidth / 2,
        y: this.canvasHeight / 2 - point.y
      }
    },
    rebuildRelationVisuals() {
      if (!this.three || !this.relationGroup) return
      const THREE = this.three

      while (this.relationGroup.children.length) {
        const child = this.relationGroup.children[0]
        this.relationGroup.remove(child)
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      }
      this.relationVisuals = []

      if (!Array.isArray(this.nodes) || !Array.isArray(this.edges) || this.nodes.length === 0) return
      const nodeMap = new Map(this.nodes.map((n) => [String(n.id), n]))
      const relationStyles = {
        sequential: { color: 0x22c55e, opacity: 0.32, speed: 0.12, pulseSize: 2.2 },
        parallel: { color: 0x0ea5e9, opacity: 0.34, speed: 0.2, pulseSize: 2.6 },
        child: { color: 0x6366f1, opacity: 0.36, speed: 0.15, pulseSize: 2.4 }
      }

      for (const edge of this.edges) {
        const source = nodeMap.get(String(edge.source))
        const target = nodeMap.get(String(edge.target))
        if (!source?.position || !target?.position) continue

        const sSize = this.parseNodeSize(source)
        const tSize = this.parseNodeSize(target)
        const relationType = this.inferRelationType(edge)
        const style = relationStyles[relationType] || relationStyles.sequential

        const start = {
          x: Number(source.position.x) + sSize.width / 2,
          y: Number(source.position.y) + sSize.height / 2
        }
        const end = {
          x: Number(target.position.x) + tSize.width / 2,
          y: Number(target.position.y) + tSize.height / 2
        }
        if (!Number.isFinite(start.x) || !Number.isFinite(start.y) || !Number.isFinite(end.x) || !Number.isFinite(end.y)) continue

        const dx = end.x - start.x
        const dy = end.y - start.y
        const mid = { x: start.x + dx / 2, y: start.y + dy / 2 }
        const control = relationType === 'child'
          ? { x: mid.x + 18, y: mid.y + 36 }
          : relationType === 'parallel'
            ? { x: mid.x, y: mid.y - 28 }
            : { x: mid.x, y: mid.y }

        const p0 = this.flowToScene(start)
        const p1 = this.flowToScene(control)
        const p2 = this.flowToScene(end)

        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(p0.x, p0.y, 0),
          new THREE.Vector3(p1.x, p1.y, 0),
          new THREE.Vector3(p2.x, p2.y, 0)
        )

        const points = curve.getPoints(40)
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const line = new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: style.color,
            transparent: true,
            opacity: style.opacity
          })
        )
        this.relationGroup.add(line)

        const pulse = new THREE.Mesh(
          new THREE.SphereGeometry(style.pulseSize, 10, 10),
          new THREE.MeshBasicMaterial({
            color: style.color,
            transparent: true,
            opacity: 0.72
          })
        )
        this.relationGroup.add(pulse)
        this.relationVisuals.push({
          type: relationType,
          curve,
          line,
          pulse,
          speed: style.speed,
          phase: Math.random()
        })
      }
    },
    animate() {
      if (!this.renderer || !this.scene || !this.camera || !this.points) return
      const now = performance.now()
      const elapsed = (now - this.startAt) * 0.001
      const attr = this.points.geometry.getAttribute('position')
      for (let i = 0; i < attr.count; i += 1) {
        const i3 = i * 3
        const baseX = this.pointPositions[i3]
        const baseY = this.pointPositions[i3 + 1]
        attr.array[i3] = baseX + Math.sin(elapsed * 0.22 + i * 0.11) * 0.02
        attr.array[i3 + 1] = baseY + Math.cos(elapsed * 0.26 + i * 0.09) * 0.03
      }
      attr.needsUpdate = true
      this.points.rotation.z = elapsed * 0.015

      for (const visual of this.relationVisuals) {
        const t = (elapsed * visual.speed + visual.phase) % 1
        const p = visual.curve.getPointAt(t)
        visual.pulse.position.set(p.x, p.y, 0)
        const glow = visual.type === 'parallel' ? 0.55 : (visual.type === 'child' ? 0.5 : 0.42)
        visual.line.material.opacity = glow + Math.sin(elapsed * 2.4 + visual.phase * 6.28) * 0.08
      }

      this.renderer.render(this.scene, this.camera)
      this.rafId = requestAnimationFrame(() => this.animate())
    },
    destroyThree() {
      if (this.rafId) cancelAnimationFrame(this.rafId)
      if (this.resizeObserver) this.resizeObserver.disconnect()
      if (this.points?.geometry) this.points.geometry.dispose()
      if (this.points?.material) this.points.material.dispose()
      for (const visual of this.relationVisuals) {
        if (visual.line?.geometry) visual.line.geometry.dispose()
        if (visual.line?.material) visual.line.material.dispose()
        if (visual.pulse?.geometry) visual.pulse.geometry.dispose()
        if (visual.pulse?.material) visual.pulse.material.dispose()
      }
      this.relationVisuals = []
      if (this.renderer) this.renderer.dispose()
      this.points = null
      this.relationGroup = null
      this.scene = null
      this.camera = null
      this.renderer = null
    }
  }
}
</script>

<style scoped>
.flow-fx-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  opacity: 0.95;
}
</style>
