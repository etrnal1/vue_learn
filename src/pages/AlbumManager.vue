<template>
  <div class="album-page">
    <div class="page-head">
      <div>
        <h2>相册管理</h2>
        <p>支持相册分组、照片管理、收藏标记与大图预览。</p>
      </div>
      <div class="stats">
        <span class="stat">相册 {{ albums.length }}</span>
        <span class="stat">照片 {{ totalPhotos }}</span>
        <span class="stat">收藏 {{ favoritePhotos }}</span>
      </div>
    </div>

    <div class="subtabs">
      <button class="subtab" :class="{ active: activeTab === 'albums' }" @click="activeTab = 'albums'">相册库</button>
      <button class="subtab" :class="{ active: activeTab === 'photos' }" @click="activeTab = 'photos'">照片管理</button>
    </div>

    <section v-if="activeTab === 'albums'" class="panel">
      <div class="layout">
        <div class="panel form-panel">
          <h3>{{ editingAlbumId ? '编辑相册' : '新建相册' }}</h3>
          <div class="form-group">
            <label>相册名称 *</label>
            <input v-model.trim="albumForm.name" class="input" placeholder="例如：2026 春节旅行">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>分类</label>
              <input v-model.trim="albumForm.category" class="input" placeholder="旅行 / 家庭 / 工作">
            </div>
            <div class="form-group">
              <label>封面图链接</label>
              <input v-model.trim="albumForm.coverUrl" class="input" placeholder="https://.../cover.jpg">
            </div>
          </div>
          <div class="form-group">
            <label>标签（逗号分隔）</label>
            <input v-model.trim="albumForm.tagsText" class="input" placeholder="假期, 摄影, iPhone">
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model.trim="albumForm.description" class="input" rows="3" placeholder="记录这个相册的主题..."></textarea>
          </div>
          <div class="actions">
            <button class="btn btn-primary" @click="saveAlbum">{{ editingAlbumId ? '保存修改' : '创建相册' }}</button>
            <button class="btn" @click="resetAlbumForm">重置</button>
          </div>

          <div v-if="selectedAlbum" class="selected-tip">
            <span>当前操作相册：</span>
            <strong>{{ selectedAlbum.name }}</strong>
          </div>
        </div>

        <div class="panel list-panel">
          <div class="toolbar">
            <input v-model.trim="albumSearch" class="input" placeholder="搜索相册名 / 分类 / 标签...">
            <select v-model="albumCategoryFilter" class="input">
              <option value="all">全部分类</option>
              <option v-for="item in albumCategories" :key="item" :value="item">{{ item }}</option>
            </select>
          </div>

          <div v-if="filteredAlbums.length === 0" class="empty">暂无相册，先创建一个吧</div>
          <div v-else ref="albumListRef" class="cards" @scroll.passive="onAlbumListScroll">
            <div :style="{ height: `${virtualAlbumPaddingTop}px` }"></div>
            <article
              v-for="item in virtualDisplayedAlbums"
              :key="item.id"
              class="card album-card"
              :class="{ active: item.id === selectedAlbumId }"
            >
              <div class="album-cover-wrap" @click="selectAlbum(item.id)">
                <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.name" class="album-cover" loading="lazy" decoding="async" @error="onImageError">
                <div v-else class="album-cover fallback">{{ item.name.slice(0, 1) || '相' }}</div>
              </div>
              <div class="album-main">
                <div class="card-head">
                  <div>
                    <h4>{{ item.name }}</h4>
                    <div class="meta">
                      <span>{{ item.category || '未分类' }}</span>
                      <span>·</span>
                      <span>{{ item.photos.length }} 张</span>
                      <span>·</span>
                      <span>{{ formatDate(item.updatedAt) }}</span>
                    </div>
                  </div>
                </div>
                <p v-if="item.description" class="note">{{ item.description }}</p>
                <div v-if="item.tags.length" class="tags">
                  <span v-for="tag in item.tags" :key="tag" class="tag">#{{ tag }}</span>
                </div>
                <div class="card-actions">
                  <button class="btn btn-sm btn-primary" @click="openAlbumPhotos(item.id)">管理照片</button>
                  <button class="btn btn-sm" @click="editAlbum(item)">编辑</button>
                  <button class="btn btn-sm btn-danger" @click="deleteAlbum(item.id)">删除</button>
                </div>
              </div>
            </article>
            <div :style="{ height: `${virtualAlbumPaddingBottom}px` }"></div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'photos'" class="panel">
      <div v-if="!selectedAlbum" class="empty">请先在“相册库”选择一个相册，再管理照片</div>

      <div v-else class="layout">
        <div class="panel form-panel">
          <h3>{{ editingPhotoId ? '编辑照片' : '添加照片' }}</h3>
          <div class="album-badge">所属相册：{{ selectedAlbum.name }}</div>

          <div class="form-group">
            <label>照片标题 *</label>
            <input v-model.trim="photoForm.title" class="input" placeholder="例如：外滩夜景">
          </div>
          <div class="form-group">
            <label>图片链接 *</label>
            <input v-model.trim="photoForm.url" class="input" placeholder="https://.../photo.jpg">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>单个上传（回填当前照片）</label>
              <input
                class="input file-input"
                type="file"
                accept="image/*"
                :disabled="uploading"
                @change="handleSingleUpload"
              >
            </div>
            <div class="form-group">
              <label>批量上传（直接入库）</label>
              <input
                class="input file-input"
                type="file"
                accept="image/*"
                multiple
                :disabled="uploading"
                @change="handleBatchUpload"
              >
            </div>
          </div>
          <div v-if="uploading" class="uploading-tip">上传处理中，请稍候...</div>
          <div class="form-row">
            <div class="form-group">
              <label>拍摄时间</label>
              <input v-model="photoForm.takenAt" class="input" type="datetime-local">
            </div>
            <div class="form-group">
              <label>地点</label>
              <input v-model.trim="photoForm.location" class="input" placeholder="上海 · 外滩">
            </div>
          </div>
          <div class="form-group">
            <label>标签（逗号分隔）</label>
            <input v-model.trim="photoForm.tagsText" class="input" placeholder="夜景, 城市, 旅行">
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model.trim="photoForm.note" class="input" rows="3" placeholder="拍摄参数 / 纪念信息"></textarea>
          </div>
          <label class="check"><input v-model="photoForm.favorite" type="checkbox"> 标记为收藏</label>
          <div class="actions">
            <button class="btn btn-primary" @click="savePhoto">{{ editingPhotoId ? '保存修改' : '添加照片' }}</button>
            <button class="btn" @click="resetPhotoForm">重置</button>
          </div>
        </div>

        <div class="panel list-panel">
          <div class="toolbar">
            <input v-model.trim="photoSearch" class="input" placeholder="搜索标题 / 地点 / 标签...">
            <select v-model="photoFavoriteFilter" class="input">
              <option value="all">全部照片</option>
              <option value="favorite">仅收藏</option>
              <option value="normal">仅非收藏</option>
            </select>
          </div>
          <div class="actions compact-actions">
            <button class="btn" :disabled="optimizingExisting || !selectedAlbum.photos.length" @click="optimizeExistingPhotos">
              {{ optimizingExisting ? '压缩中...' : '压缩当前相册已有图片' }}
            </button>
          </div>

          <div v-if="filteredPhotos.length === 0" class="empty">这个相册还没有照片，先添加一张</div>

          <div v-else ref="photoListRef" class="cards" @scroll.passive="onPhotoListScroll">
            <div :style="{ height: `${virtualPhotoPaddingTop}px` }"></div>
            <article
              v-for="item in virtualDisplayedPhotos"
              :key="item.id"
              class="card photo-card"
              :class="{ active: item.id === previewPhotoId }"
            >
              <div class="photo-thumb-wrap" @click="setPreviewPhoto(item.id)">
                <img :src="item.url" :alt="item.title" class="photo-thumb" loading="lazy" decoding="async" @error="onImageError">
                <span v-if="item.favorite" class="favorite-badge">收藏</span>
              </div>
              <div class="photo-main">
                <div class="card-head">
                  <div>
                    <h4>{{ item.title }}</h4>
                    <div class="meta">
                      <span>{{ item.location || '未知地点' }}</span>
                      <span>·</span>
                      <span>{{ formatPhotoTime(item.takenAt) }}</span>
                    </div>
                  </div>
                </div>
                <p v-if="item.note" class="note">{{ item.note }}</p>
                <div v-if="item.tags.length" class="tags">
                  <span v-for="tag in item.tags" :key="tag" class="tag">#{{ tag }}</span>
                </div>
                <div class="card-actions">
                  <button class="btn btn-sm btn-primary" @click="setPreviewPhoto(item.id)">预览</button>
                  <button class="btn btn-sm" @click="editPhoto(item)">编辑</button>
                  <button class="btn btn-sm" @click="togglePhotoFavorite(item)">{{ item.favorite ? '取消收藏' : '收藏' }}</button>
                  <button class="btn btn-sm btn-danger" @click="deletePhoto(item.id)">删除</button>
                </div>
              </div>
            </article>
            <div :style="{ height: `${virtualPhotoPaddingBottom}px` }"></div>
          </div>

          <div v-if="previewPhoto" class="preview-panel">
            <div class="preview-head">
              <h4>{{ previewPhoto.title }}</h4>
              <span class="meta">{{ previewPhoto.location || '未知地点' }}</span>
            </div>
            <img :src="previewPhoto.url" :alt="previewPhoto.title" class="preview-image" loading="lazy" decoding="async" @error="onImageError">
            <p v-if="previewPhoto.note" class="note">{{ previewPhoto.note }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { api } from '../utils/api.js'

const STORAGE_KEY = 'album_manager_items_v1'

export default {
  name: 'AlbumManager',
  data() {
    return {
      activeTab: 'albums',
      albums: [],
      selectedAlbumId: null,
      editingAlbumId: null,
      editingPhotoId: null,
      albumSearch: '',
      albumCategoryFilter: 'all',
      photoSearch: '',
      photoFavoriteFilter: 'all',
      previewPhotoId: null,
      uploading: false,
      optimizingExisting: false,
      storageMode: 'unknown',
      albumListScrollTop: 0,
      albumListViewportHeight: 640,
      albumItemHeight: 210,
      albumRenderBuffer: 4,
      photoListScrollTop: 0,
      photoListViewportHeight: 640,
      photoItemHeight: 240,
      photoRenderBuffer: 4,
      albumForm: this.emptyAlbumForm(),
      photoForm: this.emptyPhotoForm()
    }
  },
  computed: {
    totalPhotos() {
      return this.albums.reduce((sum, album) => sum + album.photos.length, 0)
    },
    favoritePhotos() {
      return this.albums.reduce((sum, album) => sum + album.photos.filter((photo) => photo.favorite).length, 0)
    },
    albumCategories() {
      const set = new Set(this.albums.map((item) => item.category).filter(Boolean))
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
    },
    filteredAlbums() {
      const q = this.albumSearch.toLowerCase()
      return this.albums
        .filter((item) => {
          const matchCategory = this.albumCategoryFilter === 'all' || item.category === this.albumCategoryFilter
          if (!q) return matchCategory
          const hay = [item.name, item.category, ...item.tags].join(' ').toLowerCase()
          return matchCategory && hay.includes(q)
        })
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    },
    virtualAlbumStart() {
      return Math.max(0, Math.floor(this.albumListScrollTop / this.albumItemHeight) - this.albumRenderBuffer)
    },
    virtualAlbumVisibleCount() {
      const base = Math.ceil(this.albumListViewportHeight / this.albumItemHeight)
      return base + this.albumRenderBuffer * 2
    },
    virtualAlbumEnd() {
      return Math.min(this.filteredAlbums.length, this.virtualAlbumStart + this.virtualAlbumVisibleCount)
    },
    virtualDisplayedAlbums() {
      return this.filteredAlbums.slice(this.virtualAlbumStart, this.virtualAlbumEnd)
    },
    virtualAlbumPaddingTop() {
      return this.virtualAlbumStart * this.albumItemHeight
    },
    virtualAlbumPaddingBottom() {
      return (this.filteredAlbums.length - this.virtualAlbumEnd) * this.albumItemHeight
    },
    selectedAlbum() {
      return this.albums.find((item) => item.id === this.selectedAlbumId) || null
    },
    filteredPhotos() {
      if (!this.selectedAlbum) return []
      const q = this.photoSearch.toLowerCase()
      return this.selectedAlbum.photos
        .filter((item) => {
          const matchFavorite = this.photoFavoriteFilter === 'all'
            || (this.photoFavoriteFilter === 'favorite' && item.favorite)
            || (this.photoFavoriteFilter === 'normal' && !item.favorite)
          if (!q) return matchFavorite
          const hay = [item.title, item.location, ...item.tags].join(' ').toLowerCase()
          return matchFavorite && hay.includes(q)
        })
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    },
    virtualPhotoStart() {
      return Math.max(0, Math.floor(this.photoListScrollTop / this.photoItemHeight) - this.photoRenderBuffer)
    },
    virtualPhotoVisibleCount() {
      const base = Math.ceil(this.photoListViewportHeight / this.photoItemHeight)
      return base + this.photoRenderBuffer * 2
    },
    virtualPhotoEnd() {
      return Math.min(this.filteredPhotos.length, this.virtualPhotoStart + this.virtualPhotoVisibleCount)
    },
    virtualDisplayedPhotos() {
      return this.filteredPhotos.slice(this.virtualPhotoStart, this.virtualPhotoEnd)
    },
    virtualPhotoPaddingTop() {
      return this.virtualPhotoStart * this.photoItemHeight
    },
    virtualPhotoPaddingBottom() {
      return (this.filteredPhotos.length - this.virtualPhotoEnd) * this.photoItemHeight
    },
    previewPhoto() {
      if (!this.selectedAlbum) return null
      return this.selectedAlbum.photos.find((item) => item.id === this.previewPhotoId) || null
    }
  },
  methods: {
    emptyAlbumForm() {
      return {
        name: '',
        category: '',
        coverUrl: '',
        tagsText: '',
        description: ''
      }
    },
    emptyPhotoForm() {
      return {
        title: '',
        url: '',
        takenAt: '',
        location: '',
        tagsText: '',
        note: '',
        favorite: false
      }
    },
    parseTags(input) {
      return String(input || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    },
    onAlbumListScroll(event) {
      this.albumListScrollTop = event?.target?.scrollTop || 0
    },
    onPhotoListScroll(event) {
      this.photoListScrollTop = event?.target?.scrollTop || 0
    },
    measureListViewport() {
      const albumEl = this.$refs.albumListRef
      if (albumEl) {
        this.albumListViewportHeight = Math.max(240, albumEl.clientHeight || 640)
      }
      const photoEl = this.$refs.photoListRef
      if (photoEl) {
        this.photoListViewportHeight = Math.max(240, photoEl.clientHeight || 640)
      }
    },
    resetAlbumListScroll() {
      this.albumListScrollTop = 0
      const el = this.$refs.albumListRef
      if (el) el.scrollTop = 0
    },
    resetPhotoListScroll() {
      this.photoListScrollTop = 0
      const el = this.$refs.photoListRef
      if (el) el.scrollTop = 0
    },
    sanitizeFileName(name) {
      const base = String(name || '').replace(/\.[^.]+$/, '').trim()
      return base || `照片_${Date.now()}`
    },
    fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('读取图片失败'))
        reader.readAsDataURL(file)
      })
    },
    blobToDataUrl(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('读取压缩图片失败'))
        reader.readAsDataURL(blob)
      })
    },
    loadImageFromDataUrl(dataUrl) {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('图片解码失败'))
        img.src = dataUrl
      })
    },
    async compressImageFile(file) {
      const rawDataUrl = await this.fileToDataUrl(file)
      if (!file.size || file.size <= 380 * 1024) {
        return rawDataUrl
      }
      return await this.compressDataUrl(rawDataUrl)
    },
    async compressDataUrl(rawDataUrl) {
      if (!String(rawDataUrl).startsWith('data:image/')) return rawDataUrl

      const img = await this.loadImageFromDataUrl(rawDataUrl)
      const maxSize = 1600
      const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1))
      const width = Math.max(1, Math.round((img.width || 1) * scale))
      const height = Math.max(1, Math.round((img.height || 1) * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return rawDataUrl
      ctx.drawImage(img, 0, 0, width, height)

      const blob = await new Promise((resolve) => {
        canvas.toBlob(
          (result) => resolve(result),
          'image/jpeg',
          0.82
        )
      })
      if (!blob) return rawDataUrl
      return await this.blobToDataUrl(blob)
    },
    formatDate(ts) {
      if (!ts) return '-'
      return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    },
    formatPhotoTime(value) {
      if (!value) return '未记录时间'
      const ts = Number.isFinite(Number(value)) ? Number(value) : Date.parse(value)
      if (!Number.isFinite(ts)) return '时间格式错误'
      return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    },
    normalizeAlbums(items) {
      if (!Array.isArray(items)) return []
      const seenAlbums = new Set()
      const now = Date.now()
      return items
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const name = String(item.name || '').trim()
          if (!name) return null

          const id = String(item.id || `album_${now}_${Math.random().toString(16).slice(2, 6)}`)
          if (seenAlbums.has(id)) return null
          seenAlbums.add(id)

          const createdAt = Number(item.createdAt) || now
          const updatedAt = Number(item.updatedAt) || createdAt

          const seenPhotos = new Set()
          const photos = Array.isArray(item.photos)
            ? item.photos
              .map((photo) => {
                if (!photo || typeof photo !== 'object') return null
                const title = String(photo.title || '').trim()
                const url = String(photo.url || '').trim()
                if (!title || !url) return null

                const photoId = String(photo.id || `photo_${updatedAt}_${Math.random().toString(16).slice(2, 6)}`)
                if (seenPhotos.has(photoId)) return null
                seenPhotos.add(photoId)

                const photoCreatedAt = Number(photo.createdAt) || now
                const photoUpdatedAt = Number(photo.updatedAt) || photoCreatedAt
                return {
                  id: photoId,
                  title,
                  url,
                  takenAt: photo.takenAt ? String(photo.takenAt) : '',
                  location: String(photo.location || '').trim(),
                  tags: Array.isArray(photo.tags) ? photo.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [],
                  note: String(photo.note || ''),
                  favorite: Boolean(photo.favorite),
                  createdAt: photoCreatedAt,
                  updatedAt: photoUpdatedAt
                }
              })
              .filter(Boolean)
            : []

          return {
            id,
            name,
            category: String(item.category || '').trim(),
            coverUrl: String(item.coverUrl || '').trim(),
            tags: Array.isArray(item.tags) ? item.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [],
            description: String(item.description || ''),
            photos,
            createdAt,
            updatedAt
          }
        })
        .filter(Boolean)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    },
    async persist() {
      const normalized = this.normalizeAlbums(this.albums)
      this.albums = normalized
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      if (this.storageMode !== 'server') return
      try {
        const saved = await api.albums.saveLibrary(normalized)
        const merged = this.normalizeAlbums(saved?.items || normalized)
        this.albums = merged
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      } catch (error) {
        this.storageMode = 'local'
        console.warn('保存相册库失败，已回退本地模式', error)
      }
    },
    async load() {
      let localItems = []
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          localItems = this.normalizeAlbums(JSON.parse(raw))
          this.albums = localItems
        }
      } catch (error) {
        console.warn('加载相册数据失败', error)
      }

      try {
        const remote = await api.albums.getLibrary()
        const remoteItems = this.normalizeAlbums(remote?.items || [])
        this.storageMode = 'server'

        if (remoteItems.length > 0) {
          this.albums = remoteItems
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteItems))
        } else if (localItems.length > 0) {
          const saved = await api.albums.saveLibrary(localItems)
          const merged = this.normalizeAlbums(saved?.items || localItems)
          this.albums = merged
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        }
      } catch (error) {
        this.storageMode = 'local'
      }

      if (!this.selectedAlbumId && this.albums.length > 0) {
        this.selectedAlbumId = this.albums[0].id
      }
      this.$nextTick(() => this.measureListViewport())
    },
    saveAlbum() {
      if (!this.albumForm.name) {
        alert('请填写相册名称')
        return
      }

      const now = Date.now()
      const payload = {
        name: this.albumForm.name,
        category: this.albumForm.category,
        coverUrl: this.albumForm.coverUrl,
        tags: this.parseTags(this.albumForm.tagsText),
        description: this.albumForm.description,
        updatedAt: now
      }

      if (this.editingAlbumId) {
        const index = this.albums.findIndex((item) => item.id === this.editingAlbumId)
        if (index !== -1) {
          this.albums[index] = {
            ...this.albums[index],
            ...payload
          }
        }
      } else {
        const albumId = `album_${now}`
        this.albums.unshift({
          id: albumId,
          photos: [],
          createdAt: now,
          ...payload
        })
        this.selectedAlbumId = albumId
      }

      this.persist()
      this.resetAlbumForm()
    },
    editAlbum(item) {
      this.editingAlbumId = item.id
      this.albumForm = {
        name: item.name,
        category: item.category || '',
        coverUrl: item.coverUrl || '',
        tagsText: (item.tags || []).join(', '),
        description: item.description || ''
      }
      this.selectedAlbumId = item.id
      this.activeTab = 'albums'
    },
    deleteAlbum(id) {
      const target = this.albums.find((item) => item.id === id)
      if (!target) return
      if (!confirm(`确定删除相册“${target.name}”及其全部照片吗？`)) return

      this.albums = this.albums.filter((item) => item.id !== id)

      if (this.selectedAlbumId === id) {
        this.selectedAlbumId = this.albums[0]?.id || null
      }
      if (this.editingAlbumId === id) {
        this.resetAlbumForm()
      }

      this.resetPhotoForm()
      this.persist()
    },
    resetAlbumForm() {
      this.editingAlbumId = null
      this.albumForm = this.emptyAlbumForm()
    },
    selectAlbum(id) {
      this.selectedAlbumId = id
      this.previewPhotoId = null
      this.resetPhotoForm()
      this.resetPhotoListScroll()
    },
    openAlbumPhotos(id) {
      this.selectAlbum(id)
      this.activeTab = 'photos'
      this.$nextTick(() => this.measureListViewport())
    },
    async handleSingleUpload(event) {
      const input = event?.target
      const file = input?.files?.[0]
      if (!file) return
      if (!String(file.type || '').startsWith('image/')) {
        alert('请选择图片文件')
        if (input) input.value = ''
        return
      }

      this.uploading = true
      try {
        const dataUrl = await this.compressImageFile(file)
        this.photoForm.url = dataUrl
        if (!this.photoForm.title) {
          this.photoForm.title = this.sanitizeFileName(file.name)
        }
      } catch (error) {
        alert(error.message || '单个上传失败')
      } finally {
        this.uploading = false
        if (input) input.value = ''
      }
    },
    async handleBatchUpload(event) {
      if (!this.selectedAlbum) {
        alert('请先选择一个相册')
        if (event?.target) event.target.value = ''
        return
      }

      const input = event?.target
      const files = Array.from(input?.files || [])
      const imageFiles = files.filter((file) => String(file.type || '').startsWith('image/'))
      if (imageFiles.length === 0) {
        if (input) input.value = ''
        return
      }

      const albumIndex = this.albums.findIndex((item) => item.id === this.selectedAlbumId)
      if (albumIndex === -1) {
        if (input) input.value = ''
        return
      }

      this.uploading = true
      try {
        const tags = this.parseTags(this.photoForm.tagsText)
        const now = Date.now()
        const uploadedItems = []
        for (let index = 0; index < imageFiles.length; index += 1) {
          const file = imageFiles[index]
          const dataUrl = await this.compressImageFile(file)
          const ts = now + index
          uploadedItems.push({
            id: `photo_${ts}_${Math.random().toString(16).slice(2, 6)}`,
            title: this.sanitizeFileName(file.name),
            url: dataUrl,
            takenAt: this.photoForm.takenAt,
            location: this.photoForm.location,
            tags: [...tags],
            note: this.photoForm.note,
            favorite: this.photoForm.favorite,
            createdAt: ts,
            updatedAt: ts
          })
        }

        this.albums[albumIndex].photos.unshift(...uploadedItems)
        this.albums[albumIndex].updatedAt = Date.now()
        if (!this.albums[albumIndex].coverUrl && uploadedItems[0]) {
          this.albums[albumIndex].coverUrl = uploadedItems[0].url
        }
        this.previewPhotoId = uploadedItems[0]?.id || null
        this.resetPhotoListScroll()
        this.persist()
      } catch (error) {
        alert(error.message || '批量上传失败')
      } finally {
        this.uploading = false
        if (input) input.value = ''
      }
    },
    async optimizeExistingPhotos() {
      if (!this.selectedAlbum) return
      const albumIndex = this.albums.findIndex((item) => item.id === this.selectedAlbumId)
      if (albumIndex === -1) return
      if (!confirm('将尝试压缩当前相册中已保存的图片，继续吗？')) return

      this.optimizingExisting = true
      try {
        const targetPhotos = this.albums[albumIndex].photos
        let changed = 0
        for (const photo of targetPhotos) {
          const original = String(photo.url || '')
          if (!original.startsWith('data:image/')) continue
          if (original.length < 420 * 1024) continue
          try {
            const next = await this.compressDataUrl(original)
            if (next && next.length < original.length) {
              photo.url = next
              photo.updatedAt = Date.now()
              changed += 1
            }
          } catch (error) {
            console.warn('压缩图片失败', error)
          }
        }
        if (changed > 0) {
          this.albums[albumIndex].updatedAt = Date.now()
          if (this.albums[albumIndex].photos[0] && this.albums[albumIndex].coverUrl?.startsWith('data:image/')) {
            this.albums[albumIndex].coverUrl = this.albums[albumIndex].photos[0].url
          }
          this.persist()
        }
        alert(changed > 0 ? `压缩完成，已优化 ${changed} 张图片` : '无需压缩，当前图片体积已较小')
      } finally {
        this.optimizingExisting = false
      }
    },
    savePhoto() {
      if (!this.selectedAlbum) {
        alert('请先选择一个相册')
        return
      }
      if (!this.photoForm.title || !this.photoForm.url) {
        alert('请填写照片标题和图片链接')
        return
      }

      const albumIndex = this.albums.findIndex((item) => item.id === this.selectedAlbumId)
      if (albumIndex === -1) return

      const now = Date.now()
      const payload = {
        title: this.photoForm.title,
        url: this.photoForm.url,
        takenAt: this.photoForm.takenAt,
        location: this.photoForm.location,
        tags: this.parseTags(this.photoForm.tagsText),
        note: this.photoForm.note,
        favorite: this.photoForm.favorite,
        updatedAt: now
      }

      if (this.editingPhotoId) {
        const photoIndex = this.albums[albumIndex].photos.findIndex((item) => item.id === this.editingPhotoId)
        if (photoIndex !== -1) {
          this.albums[albumIndex].photos[photoIndex] = {
            ...this.albums[albumIndex].photos[photoIndex],
            ...payload
          }
        }
      } else {
        const photoId = `photo_${now}`
        this.albums[albumIndex].photos.unshift({
          id: photoId,
          createdAt: now,
          ...payload
        })
        this.previewPhotoId = photoId
      }

      this.albums[albumIndex].updatedAt = now
      if (!this.albums[albumIndex].coverUrl) {
        this.albums[albumIndex].coverUrl = this.photoForm.url
      }

      this.persist()
      this.resetPhotoForm()
      this.resetPhotoListScroll()
    },
    editPhoto(item) {
      this.editingPhotoId = item.id
      this.photoForm = {
        title: item.title,
        url: item.url,
        takenAt: item.takenAt || '',
        location: item.location || '',
        tagsText: (item.tags || []).join(', '),
        note: item.note || '',
        favorite: Boolean(item.favorite)
      }
      this.previewPhotoId = item.id
    },
    deletePhoto(id) {
      if (!this.selectedAlbum) return
      if (!confirm('确定删除这张照片吗？')) return

      const albumIndex = this.albums.findIndex((item) => item.id === this.selectedAlbumId)
      if (albumIndex === -1) return

      this.albums[albumIndex].photos = this.albums[albumIndex].photos.filter((item) => item.id !== id)
      this.albums[albumIndex].updatedAt = Date.now()

      if (this.editingPhotoId === id) {
        this.resetPhotoForm()
      }
      if (this.previewPhotoId === id) {
        this.previewPhotoId = this.albums[albumIndex].photos[0]?.id || null
      }

      this.persist()
    },
    togglePhotoFavorite(item) {
      if (!this.selectedAlbum) return
      const albumIndex = this.albums.findIndex((album) => album.id === this.selectedAlbumId)
      if (albumIndex === -1) return
      const photoIndex = this.albums[albumIndex].photos.findIndex((photo) => photo.id === item.id)
      if (photoIndex === -1) return

      this.albums[albumIndex].photos[photoIndex].favorite = !this.albums[albumIndex].photos[photoIndex].favorite
      this.albums[albumIndex].photos[photoIndex].updatedAt = Date.now()
      this.albums[albumIndex].updatedAt = Date.now()
      this.persist()
    },
    setPreviewPhoto(id) {
      this.previewPhotoId = id
    },
    resetPhotoForm() {
      this.editingPhotoId = null
      this.photoForm = this.emptyPhotoForm()
    },
    onImageError(event) {
      if (!event?.target) return
      event.target.style.display = 'none'
    }
  },
  watch: {
    albumSearch() {
      this.resetAlbumListScroll()
    },
    albumCategoryFilter() {
      this.resetAlbumListScroll()
    },
    photoSearch() {
      this.resetPhotoListScroll()
    },
    photoFavoriteFilter() {
      this.resetPhotoListScroll()
    },
    activeTab() {
      this.$nextTick(() => this.measureListViewport())
    }
  },
  mounted() {
    this.load()
    this.$nextTick(() => this.measureListViewport())
    window.addEventListener('resize', this.measureListViewport)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.measureListViewport)
  }
}
</script>

<style scoped>
.album-page { color: var(--app-text); }
.page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.page-head h2 { margin: 0; font-size: 1.14em; }
.page-head p { margin: 4px 0 0; color: var(--app-text-muted); font-size: 0.86em; }
.stats { display: flex; gap: 8px; flex-wrap: wrap; }
.stat { background: var(--app-card); border: 1px solid var(--app-border); padding: 6px 10px; border-radius: 999px; font-size: 0.82em; }

.subtabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.subtab { border: 1px solid var(--app-border); background: var(--app-card); color: var(--app-text-secondary); border-radius: 8px; padding: 8px 12px; cursor: pointer; font-weight: 700; }
.subtab.active { background: var(--app-primary); color: var(--app-on-primary); border-color: transparent; box-shadow: 0 6px 16px var(--app-shadow); }

.layout { display: grid; grid-template-columns: 360px 1fr; gap: 14px; }
.panel { background: var(--app-card); border: 1px solid var(--app-border); border-radius: 12px; padding: 14px; box-shadow: 0 2px 8px var(--app-shadow-light); }
.panel h3 { margin: 0 0 12px; }

.form-group { margin-bottom: 10px; }
.form-group label { display: block; margin-bottom: 5px; font-size: 0.86em; font-weight: 700; color: var(--app-text-secondary); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.input { width: 100%; border: 2px solid var(--app-border); border-radius: 8px; padding: 8px 10px; font: inherit; background: var(--app-card); color: var(--app-text); }
.input:focus { outline: none; border-color: var(--app-primary); }

.actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.compact-actions { margin-top: -2px; margin-bottom: 8px; }
.btn { border: 1px solid var(--app-border); background: var(--app-card); color: var(--app-text-secondary); border-radius: 8px; padding: 8px 10px; cursor: pointer; }
.btn-primary { background: var(--app-primary); border-color: transparent; color: var(--app-on-primary); box-shadow: 0 8px 18px var(--app-shadow); }
.btn-danger { background: #ef4444; border-color: #ef4444; color: #fff; }
.btn-sm { padding: 6px 8px; font-size: 0.8em; }

.selected-tip,
.album-badge {
  margin-top: 12px;
  font-size: 0.84em;
  color: var(--app-text-secondary);
  background: var(--app-card-elevated);
  border: 1px dashed var(--app-border);
  border-radius: 8px;
  padding: 8px;
}

.toolbar { display: grid; grid-template-columns: 1fr 170px; gap: 10px; margin-bottom: 10px; }
.cards {
  display: grid;
  gap: 10px;
  max-height: min(70vh, 760px);
  overflow: auto;
  padding-right: 2px;
}
.card {
  border: 1px solid var(--app-border);
  background: var(--app-card);
  border-radius: 10px;
  padding: 12px;
  content-visibility: auto;
  contain-intrinsic-size: 180px;
}
.card.active { border-color: var(--app-primary); box-shadow: 0 0 0 2px var(--app-shadow-light); }
.card-head { display: flex; justify-content: space-between; gap: 10px; }
.card h4 { margin: 0; font-size: 1.02em; }
.meta { color: var(--app-text-muted); font-size: 0.8em; margin-top: 4px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.note { margin: 8px 0; font-size: 0.9em; color: var(--app-text-secondary); white-space: pre-wrap; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.tag { font-size: 0.78em; padding: 3px 8px; border-radius: 999px; background: rgba(14, 165, 233, 0.12); color: #0284c7; }
.card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.empty { text-align: center; color: var(--app-text-muted); padding: 40px 12px; border: 1px dashed var(--app-border); border-radius: 10px; }

.album-card,
.photo-card {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
  align-items: stretch;
}

.album-cover-wrap,
.photo-thumb-wrap {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  cursor: pointer;
  min-height: 120px;
}

.album-cover,
.photo-thumb {
  width: 100%;
  height: 100%;
  min-height: 120px;
  object-fit: cover;
  display: block;
}

.album-cover.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  font-size: 2em;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(145deg, #0ea5e9, #6366f1);
}

.favorite-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.74em;
  font-weight: 700;
  color: #fff;
  background: rgba(239, 68, 68, 0.92);
}

.preview-panel {
  margin-top: 12px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px;
  background: var(--app-card-elevated);
}

.preview-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  align-items: center;
}

.preview-head h4 { margin: 0; }
.preview-image {
  width: 100%;
  max-height: 360px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--app-border);
  background: #0f172a;
}

.check { font-size: 0.85em; color: var(--app-text-secondary); display: inline-flex; align-items: center; gap: 6px; }
.file-input { padding: 6px 8px; }
.uploading-tip { margin-top: -2px; margin-bottom: 8px; font-size: 0.82em; color: var(--app-text-muted); }

@media (max-width: 980px) {
  .layout { grid-template-columns: 1fr; }
}

@media (max-width: 760px) {
  .form-row,
  .toolbar { grid-template-columns: 1fr; }
  .album-card,
  .photo-card { grid-template-columns: 1fr; }
}
</style>
