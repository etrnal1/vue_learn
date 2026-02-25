<template>
  <div class="video-page">
    <div class="page-head">
      <div>
        <h2>视频管理</h2>
        <p>已拆分为三个区域：视频库、播放器、本地扫描。</p>
      </div>
      <div class="stats">
        <span class="stat">总计 {{ videos.length }}</span>
        <span class="stat">待看 {{ statusCount('watchlist') }}</span>
        <span class="stat">在看 {{ statusCount('watching') }}</span>
        <span class="stat">已看 {{ statusCount('completed') }}</span>
      </div>
    </div>

    <div class="subtabs">
      <button class="subtab" :class="{ active: activeTab === 'library' }" @click="activeTab = 'library'">视频库</button>
      <button class="subtab" :class="{ active: activeTab === 'player' }" @click="activeTab = 'player'">播放器</button>
      <button class="subtab" :class="{ active: activeTab === 'scan' }" @click="activeTab = 'scan'">本地扫描</button>
    </div>
    <div class="play-opts">
      <label class="check">
        <input type="checkbox" v-model="autoOptimizeOnPlay">
        播放前自动优化本地视频（首次可能等待，后续更快）
      </label>
      <label class="check">
        <input type="checkbox" v-model="autoCacheOnListen" @change="onAutoCacheChange">
        听视频时边听边缓存（当前集 + 下一集）
      </label>
    </div>

    <section v-if="activeTab === 'library'" class="panel">
      <div class="layout">
        <div class="panel form-panel">
          <h3>{{ editingId ? '编辑视频' : '添加视频' }}</h3>
          <div class="form-group">
            <label>标题（可选，上传时自动使用文件名）</label>
            <input v-model.trim="form.title" class="input" placeholder="例如：Vue 3 进阶教程">
          </div>
          <div class="form-group">
            <label>视频链接（可选）</label>
            <input v-model.trim="form.url" class="input" placeholder="可手动填写，也可直接上传后自动生成">
          </div>
          <div class="form-group">
            <label>或上传本地视频文件</label>
            <div class="actions">
              <button class="btn" :disabled="uploadingVideo" @click="triggerVideoUpload">
                {{ uploadingVideo ? '上传中...' : '选择并上传视频' }}
              </button>
              <span v-if="uploadingVideo" class="upload-tip">进度 {{ uploadProgress.toFixed(0) }}%</span>
            </div>
            <input
              ref="videoUploadInput"
              type="file"
              accept="video/*,.mp4,.mkv,.mov,.avi,.webm,.m4v,.flv,.wmv"
              style="display:none"
              @change="onVideoFileChange"
            >
          </div>
          <div v-if="uploadFeedback" class="upload-feedback" :class="uploadFeedbackType">
            {{ uploadFeedback }}
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>分类</label>
              <input v-model.trim="form.category" class="input" placeholder="例如：Vue、算法">
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="form.status" class="input">
                <option value="watchlist">待看</option>
                <option value="watching">在看</option>
                <option value="completed">已看</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>集合</label>
              <input v-model.trim="form.collection" class="input" placeholder="例如：三体、Vue 实战课">
            </div>
            <div class="form-group">
              <label>集数</label>
              <input v-model.number="form.episodeNo" type="number" min="1" step="1" class="input" placeholder="例如：1">
            </div>
          </div>
          <div class="form-group">
            <label>标签（逗号分隔）</label>
            <input v-model.trim="form.tagsText" class="input" placeholder="vue3, composition-api">
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model.trim="form.note" class="input" rows="3" placeholder="学习重点..."></textarea>
          </div>

          <div class="actions">
            <button class="btn btn-primary" @click="saveVideo">{{ editingId ? '保存修改' : '添加视频' }}</button>
            <button class="btn" @click="resetForm">重置</button>
          </div>
        </div>

        <div class="panel list-panel">
          <div class="toolbar">
            <input v-model.trim="searchQuery" class="input" placeholder="搜索标题 / 分类 / 标签...">
            <select v-model="statusFilter" class="input">
              <option value="all">全部状态</option>
              <option value="watchlist">待看</option>
              <option value="watching">在看</option>
              <option value="completed">已看</option>
            </select>
          </div>

          <div v-if="filteredVideos.length === 0" class="empty">暂无视频记录</div>
          <div v-else class="cards">
            <article v-for="item in filteredVideos" :key="item.id" class="card" :class="{ active: item.id === playingId }">
              <div class="card-head">
                <div>
                  <h4>{{ item.title }}</h4>
                  <div class="meta">
                    <span>{{ item.category || '未分类' }}</span>
                    <span>·</span>
                    <span>{{ statusLabel(item.status) }}</span>
                    <span>·</span>
                    <span>{{ formatDate(item.updatedAt) }}</span>
                    <span v-if="item.localPath">· 本地</span>
                  </div>
                </div>
                <a class="open-link" :href="item.url" target="_blank" rel="noreferrer">打开</a>
              </div>
              <p v-if="item.note" class="note">{{ item.note }}</p>
              <div v-if="item.tags && item.tags.length" class="tags">
                <span v-for="tag in item.tags" :key="tag" class="tag">#{{ tag }}</span>
              </div>
              <div class="card-actions">
                <button class="btn btn-sm btn-primary" @click="playVideo(item)">播放</button>
                <button class="btn btn-sm" @click="editVideo(item)">编辑</button>
                <button class="btn btn-sm" @click="cycleStatus(item)">切换状态</button>
                <button class="btn btn-sm btn-danger" @click="deleteVideo(item.id)">删除</button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'player'" class="panel yt-page-shell">
      <header class="yt-topbar">
        <div class="yt-brand">
          <span class="yt-logo">▶</span>
          <strong>Premium</strong>
        </div>
        <div class="yt-search-wrap">
          <input v-model.trim="playerSearchQuery" class="yt-search" placeholder="搜索推荐视频">
          <button class="yt-search-btn" type="button">⌕</button>
        </div>
        <div class="yt-top-actions">
          <button class="yt-icon-pill" type="button">＋ 创建</button>
          <button class="yt-icon-pill" type="button">🔔</button>
          <button class="yt-avatar" type="button">M</button>
        </div>
      </header>

      <div class="player-layout">
        <div class="yt-main-column">
          <div v-if="currentVideo" class="player-wrap" ref="playerWrapRef">
          <div class="player-title-row">
            <h3>
              {{ currentVideo.title }}
              <span v-if="currentVideo.collection" class="ep-tip">· {{ currentVideo.collection }}{{ currentVideo.episodeNo ? ` 第${currentVideo.episodeNo}集` : '' }}</span>
              <span v-if="listenMode" class="cache-tip">· 缓存{{ currentCacheStateLabel }}</span>
            </h3>
            <span class="meta">{{ statusLabel(currentVideo.status) }}</span>
          </div>
          <div
            v-if="!listenMode"
            class="yt-shell"
            @mousemove="onPlayerMouseMove"
            @mouseenter="showControls"
            @mouseleave="hideControlsNow"
          >
            <video
              ref="videoRef"
              class="player"
              :src="currentVideo.url"
              preload="metadata"
              @loadedmetadata="onLoadedMetadata"
              @timeupdate="onTimeUpdate"
              @playing="onPlaying"
              @error="onVideoError"
              @ratechange="onRateChange"
              @volumechange="onVolumeChange"
              @click="togglePlayPause"
              @pause="onPause"
            ></video>
            <button v-if="!isPlaying" class="yt-center-play" @click="togglePlayPause" aria-label="播放">
              <svg viewBox="0 0 24 24" class="yt-icon yt-icon-lg" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
            </button>
            <div class="yt-overlay" :class="{ visible: controlsVisible }">
              <div class="yt-progress">
                <input
                  class="yt-scrubber"
                  type="range"
                  min="0"
                  :max="duration || 0"
                  :value="currentTime"
                  :style="{ '--played': progressPercent + '%' }"
                  :disabled="!duration"
                  @input="seekTo(Number($event.target.value))"
                >
              </div>
              <div class="yt-controls">
                <div class="yt-left yt-group">
                  <button class="btn btn-sm yt-btn yt-icon-btn" :title="isPlaying ? '暂停' : '播放'" @click="togglePlayPause">
                    <svg v-if="isPlaying" viewBox="0 0 24 24" class="yt-icon" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>
                    <svg v-else viewBox="0 0 24 24" class="yt-icon" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
                  </button>
                  <button class="btn btn-sm yt-btn yt-icon-btn" title="上一集" :disabled="!prevEpisode" @click="playSibling(-1)">
                    <svg viewBox="0 0 24 24" class="yt-icon" aria-hidden="true"><path d="M6 6h2v12H6zM18 6v12l-8-6z" fill="currentColor"/></svg>
                  </button>
                  <button class="btn btn-sm yt-btn yt-icon-btn" title="下一集" :disabled="!nextEpisode" @click="playSibling(1)">
                    <svg viewBox="0 0 24 24" class="yt-icon" aria-hidden="true"><path d="M16 6h2v12h-2zM6 6v12l8-6z" fill="currentColor"/></svg>
                  </button>
                  <button class="btn btn-sm yt-btn yt-icon-btn" title="后退10秒" @click="seekBy(-10)">
                    <svg viewBox="0 0 24 24" class="yt-icon" aria-hidden="true"><path d="M11 7V3L6 8l5 5V9a5 5 0 1 1-5 5H4a7 7 0 1 0 7-7z" fill="currentColor"/></svg>
                  </button>
                  <button class="btn btn-sm yt-btn yt-icon-btn" title="前进10秒" @click="seekBy(10)">
                    <svg viewBox="0 0 24 24" class="yt-icon" aria-hidden="true"><path d="M13 7V3l5 5-5 5V9a5 5 0 1 0 5 5h2a7 7 0 1 1-7-7z" fill="currentColor"/></svg>
                  </button>
                  <button class="btn btn-sm yt-btn yt-icon-btn" :title="isMuted ? '取消静音' : '静音'" @click="toggleMute">
                    <svg v-if="isMuted" viewBox="0 0 24 24" class="yt-icon" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5zm13.59 3L21 14.41 19.59 15.8 17.17 13.4l-2.42 2.4-1.41-1.39L15.76 12l-2.42-2.41 1.41-1.39 2.42 2.4 2.42-2.4L21 9.59 18.59 12z" fill="currentColor"/></svg>
                    <svg v-else viewBox="0 0 24 24" class="yt-icon" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5zm11.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12z" fill="currentColor"/></svg>
                  </button>
                  <input class="yt-volume" type="range" min="0" max="1" step="0.01" :value="volume" @input="setVolume(Number($event.target.value))">
                  <span class="time-indicator">{{ formatDuration(currentTime) }} / {{ formatDuration(duration) }}</span>
                </div>
                <div class="yt-right yt-group">
                  <button class="btn btn-sm yt-btn" @click="toggleListenMode">{{ listenMode ? '视频' : '音频' }}</button>
                  <select class="input rate-select" :value="playbackRate" @change="setPlaybackRate(Number($event.target.value))">
                    <option :value="0.5">0.5x</option>
                    <option :value="0.75">0.75x</option>
                    <option :value="1">1.0x</option>
                    <option :value="1.25">1.25x</option>
                    <option :value="1.5">1.5x</option>
                    <option :value="1.75">1.75x</option>
                    <option :value="2">2.0x</option>
                  </select>
                  <button class="btn btn-sm yt-btn yt-icon-btn" title="下载" @click="downloadCurrent">
                    <svg viewBox="0 0 24 24" class="yt-icon" aria-hidden="true"><path d="M5 20h14v-2H5v2zM11 4v8H8l4 4 4-4h-3V4h-2z" fill="currentColor"/></svg>
                  </button>
                  <button class="btn btn-sm yt-btn yt-icon-btn" title="全屏" @click="enterFullscreen">
                    <svg viewBox="0 0 24 24" class="yt-icon" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm0-4h2V7h3V5H5v5zm10 7h-3v2h5v-5h-2v3zm0-12v3h2V5h-5v2h3z" fill="currentColor"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <audio
            v-else
            ref="audioRef"
            class="audio-player"
            :src="currentVideo.url"
            controls
            preload="metadata"
            @loadedmetadata="onLoadedMetadata"
            @timeupdate="onTimeUpdate"
            @playing="onPlaying"
            @error="onVideoError"
            @ratechange="onRateChange"
            @volumechange="onVolumeChange"
            @pause="onPause"
          ></audio>
          <div v-if="listenMode" class="listen-tip">听视频模式：仅播放音频</div>
          <div v-if="listenMode" class="yt-audio-controls">
            <div class="yt-progress">
              <input
                class="yt-scrubber"
                type="range"
                min="0"
                :max="duration || 0"
                :value="currentTime"
                :style="{ '--played': progressPercent + '%' }"
                :disabled="!duration"
                @input="seekTo(Number($event.target.value))"
              >
            </div>
            <div class="yt-controls">
              <div class="yt-left">
                <button class="btn btn-sm yt-btn" @click="togglePlayPause">{{ isPlaying ? '暂停' : '播放' }}</button>
                <button class="btn btn-sm yt-btn" :disabled="!prevEpisode" @click="playSibling(-1)">上一集</button>
                <button class="btn btn-sm yt-btn" :disabled="!nextEpisode" @click="playSibling(1)">下一集</button>
                <span class="time-indicator">{{ formatDuration(currentTime) }} / {{ formatDuration(duration) }}</span>
              </div>
              <div class="yt-right">
                <button class="btn btn-sm yt-btn" @click="toggleListenMode">看视频</button>
                <select class="input rate-select" :value="playbackRate" @change="setPlaybackRate(Number($event.target.value))">
                  <option :value="0.5">0.5x</option>
                  <option :value="0.75">0.75x</option>
                  <option :value="1">1.0x</option>
                  <option :value="1.25">1.25x</option>
                  <option :value="1.5">1.5x</option>
                  <option :value="1.75">1.75x</option>
                  <option :value="2">2.0x</option>
                </select>
              </div>
            </div>
          </div>
          </div>

          <div v-if="currentVideo" class="yt-video-meta">
            <h4 class="yt-meta-title">{{ currentVideo.title }}</h4>
            <div class="yt-meta-row">
              <span>{{ currentVideo.collection || '单集视频' }}</span>
              <span>·</span>
              <span>{{ statusLabel(currentVideo.status) }}</span>
              <span>·</span>
              <span>{{ formatDate(currentVideo.updatedAt) }}</span>
            </div>
            <div v-if="currentVideo.localPath" class="yt-ffmpeg-row">
              <span class="yt-ffmpeg-label">FFmpeg</span>
              <select class="input yt-ffmpeg-select" v-model="ffmpegMode">
                <option value="faststart">快速优化（faststart）</option>
                <option value="transcode">转码兼容（transcode）</option>
              </select>
              <button class="btn btn-sm" :disabled="ffmpegWorking" @click="runFfmpegForCurrent">
                {{ ffmpegWorking ? '处理中...' : '执行处理' }}
              </button>
            </div>
            <div v-if="currentVideo.localPath" class="yt-clip-row">
              <span class="yt-ffmpeg-label">剪切到桌面</span>
              <div class="yt-clip-time">{{ formatDuration(clipStartSec) }}</div>
              <button class="btn btn-sm" @click="setClipStartFromCurrent">开始=当前</button>
              <div class="yt-clip-time">{{ formatDuration(clipEndSec) }}</div>
              <button class="btn btn-sm" @click="setClipEndFromCurrent">结束=当前</button>
              <button class="btn btn-sm btn-primary" :disabled="clipWorking" @click="runClipCurrentVideo">
                {{ clipWorking ? '剪切中...' : '开始剪切' }}
              </button>
            </div>
            <div v-if="clipFeedback" class="yt-clip-feedback">{{ clipFeedback }}</div>
            <p v-if="currentVideo.note" class="yt-meta-note">{{ currentVideo.note }}</p>
          </div>

          <div v-else class="empty">请先在“视频库”里点一个视频进行播放</div>

          <section class="live-log yt-live-log">
            <div class="live-log-head">
              <h4>实时日志</h4>
              <button class="btn btn-sm" @click="clearLiveLogs">清空</button>
            </div>
            <div v-if="liveLogs.length === 0" class="live-empty">暂无实时日志</div>
            <div v-else class="live-list">
              <div v-for="item in liveLogs" :key="item.id" class="live-item">
                <div class="live-row">
                  <span class="live-time">{{ formatTime(item.timestamp) }}</span>
                  <span class="live-action">{{ item.action }}</span>
                  <span class="live-status" :class="{ err: item.status === 'error' }">{{ item.status }}</span>
                </div>
                <div class="live-detail">{{ item.detail || '-' }}</div>
                <div class="live-ms">{{ item.durationMs ?? '-' }} ms</div>
              </div>
            </div>
          </section>
        </div>

        <aside class="yt-side-column">
          <div class="yt-side-head">
            <h4>接下来</h4>
            <span>{{ upNextFilteredVideos.length }} 个推荐</span>
          </div>
          <div v-if="upNextFilteredVideos.length === 0" class="empty yt-next-empty">暂无推荐视频</div>
          <div v-else class="yt-next-list">
            <button
              v-for="item in upNextFilteredVideos"
              :key="item.id"
              class="yt-next-item"
              :class="{ active: item.id === playingId }"
              @click="playVideo(item)"
            >
              <div class="yt-next-thumb">
                <img v-if="thumbnailFor(item)" :src="thumbnailFor(item)" alt="" class="yt-next-thumb-img">
                <div v-else class="yt-next-fallback">
                  <strong>{{ thumbText(item) }}</strong>
                  <span>{{ item.collection ? '合集' : '视频' }}</span>
                </div>
                <span class="yt-next-duration">{{ getItemDurationText(item) }}</span>
              </div>
              <div class="yt-next-info">
                <div class="yt-next-title">{{ item.title }}</div>
                <div class="yt-next-meta">
                  <span>{{ item.collection || item.category || '未分类' }}</span>
                  <span v-if="item.episodeNo">· 第{{ item.episodeNo }}集</span>
                </div>
                <div class="yt-next-progress" v-if="getItemDuration(item) > 0">
                  <div class="yt-next-progress-bar">
                    <div class="yt-next-progress-fill" :style="{ width: getItemProgressPercent(item) + '%' }"></div>
                  </div>
                  <span class="yt-next-progress-text">{{ getItemProgressPercent(item).toFixed(0) }}%</span>
                </div>
              </div>
            </button>
          </div>
        </aside>
      </div>
    </section>

    <section v-if="activeTab === 'scan'" class="panel">
      <h3>本地视频扫描</h3>
      <p class="scan-tip">输入本地目录绝对路径（例如：<code>/Users/mac/Movies</code>）并扫描。</p>
      <div class="scan-toolbar">
        <input v-model.trim="scanRootPath" class="input" placeholder="输入本地目录绝对路径">
        <label class="check"><input type="checkbox" v-model="scanRecursive"> 递归子目录</label>
        <button class="btn btn-primary" :disabled="scanning" @click="scanLocalVideos">{{ scanning ? '扫描中...' : '开始扫描' }}</button>
      </div>
      <div class="scan-scheduler">
        <label class="check"><input type="checkbox" v-model="scanSchedulerEnabled" @change="toggleScanScheduler"> 定时扫描</label>
        <label class="check">每
          <input v-model.number="scanSchedulerMinutes" type="number" min="1" max="1440" class="scan-min-input">
          分钟
        </label>
        <label class="check"><input type="checkbox" v-model="scanSchedulerAutoImport"> 扫描后自动导入</label>
        <button class="btn btn-sm" @click="runScheduledScanNow">立即执行</button>
        <span class="scan-scheduler-meta">
          全局任务中心状态：{{ scanSchedulerEnabled ? '运行中' : '已停止' }}
          <span v-if="scanSchedulerLastRunAt"> · 上次：{{ formatTime(scanSchedulerLastRunAt) }}</span>
          <span v-if="scanSchedulerTaskId"> · 任务ID：{{ scanSchedulerTaskId }}</span>
        </span>
      </div>
      <div v-if="scanError" class="scan-error">{{ scanError }}</div>
      <div v-if="scanResults.length > 0" class="scan-result-head">
        <span>扫描到 {{ scanResults.length }} 个视频</span>
        <button class="btn" @click="importAllScanned">一键导入视频库</button>
      </div>
      <div v-if="scanResults.length > 0" class="scan-results">
        <div v-for="item in scanResults" :key="item.path" class="scan-item">
          <div>
            <div class="scan-name">{{ item.name }}</div>
            <div class="scan-path">{{ item.path }}</div>
          </div>
          <div class="scan-actions">
            <button class="btn btn-sm" @click="importOneScanned(item)">导入</button>
            <button class="btn btn-sm btn-primary" @click="previewScanned(item)">播放</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { api } from '../utils/api.js'
import { appendPerfLog } from '../utils/perfLogs.js'

const STORAGE_KEY = 'video_manager_items_v1'
const PROGRESS_KEY = 'video_manager_progress_v1'
const PLAYBACK_RATE_KEY = 'video_manager_playback_rate_v1'
const LISTEN_MODE_KEY = 'video_manager_listen_mode_v1'
const LISTEN_CACHE_KEY = 'video_manager_listen_cache_v1'
const VOLUME_KEY = 'video_manager_volume_v1'
const MEDIA_CACHE_NAME = 'video_manager_media_cache_v1'
const THUMBNAIL_KEY = 'video_manager_thumbs_v1'
const SCAN_PATH_KEY = 'video_manager_scan_path_v1'
const SCAN_RECURSIVE_KEY = 'video_manager_scan_recursive_v1'
const SCAN_SCHEDULER_KEY = 'video_manager_scan_scheduler_v1'
const SCAN_SCHEDULER_SOURCE = 'video-manager-scan'
const BG_OWNER = 'video_manager'

function getBackgroundPlayer() {
  if (typeof window === 'undefined') return null
  if (window.__videoManagerBgPlayer) return window.__videoManagerBgPlayer
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.playsInline = true
  video.style.position = 'fixed'
  video.style.width = '1px'
  video.style.height = '1px'
  video.style.opacity = '0'
  video.style.pointerEvents = 'none'
  video.style.left = '-9999px'
  video.style.top = '-9999px'
  video.dataset.owner = BG_OWNER
  document.body.appendChild(video)
  window.__videoManagerBgPlayer = video
  return video
}

export default {
  name: 'VideoManager',
  data() {
    return {
      activeTab: 'library',
      videos: [],
      editingId: null,
      playingId: null,
      playerSearchQuery: '',
      searchQuery: '',
      statusFilter: 'all',
      duration: 0,
      currentTime: 0,
      isPlaying: false,
      scanRootPath: '',
      scanRecursive: true,
      scanning: false,
      scanSchedulerEnabled: false,
      scanSchedulerMinutes: 30,
      scanSchedulerAutoImport: true,
      scanSchedulerTaskId: '',
      scanSchedulerSyncTimer: null,
      scanSchedulerLastRunAt: 0,
      scanError: '',
      scanResults: [],
      playMeasure: null,
      liveLogs: [],
      autoOptimizeOnPlay: true,
      optimizing: false,
      ffmpegMode: 'faststart',
      ffmpegWorking: false,
      clipStartSec: 0,
      clipEndSec: 0,
      clipWorking: false,
      clipFeedback: '',
      uploadingVideo: false,
      uploadProgress: 0,
      uploadFeedback: '',
      uploadFeedbackType: 'info',
      storageMode: 'unknown',
      progressMap: {},
      resumePendingTime: 0,
      lastProgressCommitAt: 0,
      wasPlayingBeforeDeactivate: false,
      listenMode: false,
      autoCacheOnListen: true,
      playbackRate: 1,
      volume: 1,
      isMuted: false,
      controlsVisible: true,
      controlsHideTimer: null,
      thumbnailMap: {},
      thumbnailLoadingMap: {},
      thumbnailTimer: null,
      durationMap: {},
      durationLoadingMap: {},
      cacheStateMap: {},
      cacheAborters: {},
      progressSyncTimer: null,
      progressSyncInFlight: false,
      progressSyncQueued: false,
      form: this.emptyForm()
    }
  },
  computed: {
    filteredVideos() {
      const q = this.searchQuery.toLowerCase()
      return this.videos
        .filter((v) => {
          const matchStatus = this.statusFilter === 'all' || v.status === this.statusFilter
          if (!q) return matchStatus
          const hay = [v.title, v.category, ...(v.tags || [])].join(' ').toLowerCase()
          return matchStatus && hay.includes(q)
        })
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    },
    currentVideo() {
      return this.videos.find((v) => v.id === this.playingId) || null
    },
    currentCollectionEpisodes() {
      if (!this.currentVideo?.collection) return []
      const name = String(this.currentVideo.collection || '').trim()
      if (!name) return []
      return this.videos
        .filter((v) => String(v.collection || '').trim() === name)
        .slice()
        .sort((a, b) => {
          const aNo = Number(a.episodeNo) || Number.MAX_SAFE_INTEGER
          const bNo = Number(b.episodeNo) || Number.MAX_SAFE_INTEGER
          if (aNo !== bNo) return aNo - bNo
          return (a.updatedAt || 0) - (b.updatedAt || 0)
        })
    },
    currentEpisodeIndex() {
      if (!this.currentVideo) return -1
      return this.currentCollectionEpisodes.findIndex((v) => v.id === this.currentVideo.id)
    },
    prevEpisode() {
      const idx = this.currentEpisodeIndex
      if (idx <= 0) return null
      return this.currentCollectionEpisodes[idx - 1] || null
    },
    nextEpisode() {
      const idx = this.currentEpisodeIndex
      if (idx < 0) return null
      return this.currentCollectionEpisodes[idx + 1] || null
    },
    currentCacheStateLabel() {
      if (!this.currentVideo) return '未开始'
      const key = this.getItemCacheKey(this.currentVideo)
      const state = this.cacheStateMap[key] || 'idle'
      return {
        idle: '未开始',
        caching: '进行中',
        done: '已完成',
        error: '失败'
      }[state] || '未开始'
    },
    upNextVideos() {
      if (!this.currentVideo) return this.filteredVideos.slice(0, 20)
      const currentCollection = String(this.currentVideo.collection || '').trim()
      const sameCollection = this.videos
        .filter((v) => v.id !== this.currentVideo.id && currentCollection && String(v.collection || '').trim() === currentCollection)
        .slice()
        .sort((a, b) => {
          const aNo = Number(a.episodeNo) || Number.MAX_SAFE_INTEGER
          const bNo = Number(b.episodeNo) || Number.MAX_SAFE_INTEGER
          if (aNo !== bNo) return aNo - bNo
          return (b.updatedAt || 0) - (a.updatedAt || 0)
        })

      const others = this.filteredVideos.filter((v) => v.id !== this.currentVideo.id && !sameCollection.some((x) => x.id === v.id))
      return [...sameCollection, ...others].slice(0, 30)
    },
    upNextFilteredVideos() {
      const q = String(this.playerSearchQuery || '').trim().toLowerCase()
      if (!q) return this.upNextVideos
      return this.upNextVideos.filter((item) => {
        const hay = [item.title, item.collection, item.category, ...(item.tags || [])]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    },
    progressPercent() {
      if (!this.duration) return 0
      return Math.min(100, (this.currentTime / this.duration) * 100)
    }
  },
  watch: {
    playingId() {
      this.scheduleThumbnailWarmup()
    },
    upNextVideos() {
      this.scheduleThumbnailWarmup()
    },
    scanRootPath() {
      localStorage.setItem(SCAN_PATH_KEY, this.scanRootPath || '')
      this.persistScanSchedulerConfig()
      if (this.scanSchedulerEnabled) {
        this.scheduleScanTaskSync()
      }
    },
    scanRecursive() {
      localStorage.setItem(SCAN_RECURSIVE_KEY, this.scanRecursive ? '1' : '0')
      this.persistScanSchedulerConfig()
      if (this.scanSchedulerEnabled) {
        this.scheduleScanTaskSync()
      }
    },
    scanSchedulerMinutes() {
      this.persistScanSchedulerConfig()
      if (this.scanSchedulerEnabled) {
        this.scheduleScanTaskSync()
      }
    },
    scanSchedulerAutoImport() {
      this.persistScanSchedulerConfig()
      if (this.scanSchedulerEnabled) {
        this.scheduleScanTaskSync()
      }
    }
  },
  methods: {
    emptyForm() {
      return {
        title: '',
        url: '',
        category: '',
        collection: '',
        episodeNo: null,
        status: 'watchlist',
        tagsText: '',
        note: ''
      }
    },
    statusLabel(status) {
      return { watchlist: '待看', watching: '在看', completed: '已看' }[status] || status
    },
    statusCount(status) {
      return this.videos.filter((v) => v.status === status).length
    },
    formatDate(ts) {
      if (!ts) return '-'
      return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    },
    formatTime(ts) {
      if (!ts) return '-'
      return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
    },
    formatDuration(seconds) {
      const sec = Number.isFinite(seconds) ? Math.floor(seconds) : 0
      const m = String(Math.floor(sec / 60)).padStart(2, '0')
      const s = String(sec % 60).padStart(2, '0')
      return `${m}:${s}`
    },
    inferTitleFromUrl(url) {
      try {
        const raw = String(url || '').trim()
        if (!raw) return ''
        const clean = decodeURIComponent(raw.split('?')[0])
        const base = clean.split('/').filter(Boolean).pop() || ''
        return base.replace(/\.[^.]+$/, '') || '未命名视频'
      } catch (error) {
        return '未命名视频'
      }
    },
    setUploadFeedback(message, type = 'info') {
      this.uploadFeedback = String(message || '')
      this.uploadFeedbackType = type
    },
    parseTags(text) {
      return text
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    },
    normalizeVideos(list) {
      if (!Array.isArray(list)) return []
      const seen = new Set()
      const now = Date.now()
      return list
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const title = String(item.title || '').trim()
          const url = String(item.url || '').trim()
          if (!title || !url) return null
          const createdAt = Number(item.createdAt) || now
          const updatedAt = Number(item.updatedAt) || createdAt
          const id = String(item.id || `video_${updatedAt}`)
          if (seen.has(id)) return null
          seen.add(id)
          return {
            id,
            title,
            url,
            category: String(item.category || '').trim(),
            collection: String(item.collection || '').trim(),
            episodeNo: Number(item.episodeNo) > 0 ? Math.floor(Number(item.episodeNo)) : null,
            status: ['watchlist', 'watching', 'completed'].includes(String(item.status))
              ? String(item.status)
              : 'watchlist',
            tags: Array.isArray(item.tags)
              ? item.tags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 20)
              : [],
            note: String(item.note || ''),
            localPath: item.localPath ? String(item.localPath) : null,
            optimizedPath: item.optimizedPath ? String(item.optimizedPath) : '',
            mediaDuration: Number(item.mediaDuration) > 0 ? Number(item.mediaDuration) : 0,
            progressTime: Number(item.progressTime) > 0 ? Number(item.progressTime) : 0,
            progressDuration: Number(item.progressDuration) > 0 ? Number(item.progressDuration) : 0,
            progressUpdatedAt: Number(item.progressUpdatedAt) > 0 ? Number(item.progressUpdatedAt) : 0,
            createdAt,
            updatedAt
          }
        })
        .filter(Boolean)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    },
    looksLikeLocalPath(input) {
      if (!input) return false
      return /^\/(Users|Volumes|private)\//.test(input) || /^[a-zA-Z]:\\/.test(input)
    },
    async persist() {
      const normalized = this.normalizeVideos(this.videos)
      this.videos = normalized
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      if (this.storageMode !== 'server') return
      try {
        await api.videos.saveLibrary(normalized)
      } catch (error) {
        this.storageMode = 'local'
        this.recordLog({
          module: 'video',
          action: 'library_save_fallback_local',
          status: 'error',
          durationMs: 0,
          detail: error?.message || 'save library failed'
        })
      }
    },
    async load() {
      let localItems = []
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          localItems = this.normalizeVideos(JSON.parse(raw))
          this.videos = localItems
        }
      } catch (error) {
        console.warn('加载视频数据失败', error)
      }

      try {
        const remote = await api.videos.getLibrary()
        const remoteItems = this.normalizeVideos(remote?.items || [])
        this.storageMode = 'server'

        if (remoteItems.length > 0) {
          this.videos = remoteItems
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteItems))
          return
        }

        if (localItems.length > 0) {
          const saved = await api.videos.saveLibrary(localItems)
          const merged = this.normalizeVideos(saved?.items || localItems)
          this.videos = merged
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
          this.recordLog({
            module: 'video',
            action: 'library_migrated_to_server',
            status: 'ok',
            durationMs: 0,
            detail: `count=${merged.length}`
          })
        }
      } catch (error) {
        this.storageMode = 'local'
        this.recordLog({
          module: 'video',
          action: 'library_load_fallback_local',
          status: 'error',
          durationMs: 0,
          detail: error?.message || 'load library failed'
        })
      }
    },
    loadProgressMap() {
      try {
        const raw = localStorage.getItem(PROGRESS_KEY)
        const parsed = raw ? JSON.parse(raw) : {}
        this.progressMap = parsed && typeof parsed === 'object' ? parsed : {}
      } catch (error) {
        this.progressMap = {}
      }
    },
    saveProgressMap() {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(this.progressMap))
    },
    getItemCacheKey(item) {
      if (!item) return ''
      return String(item.localPath || item.url || item.id || '')
    },
    loadThumbnailMap() {
      try {
        const raw = localStorage.getItem(THUMBNAIL_KEY)
        const parsed = raw ? JSON.parse(raw) : {}
        this.thumbnailMap = parsed && typeof parsed === 'object' ? parsed : {}
      } catch (error) {
        this.thumbnailMap = {}
      }
    },
    saveThumbnailMap() {
      const entries = Object.entries(this.thumbnailMap || {})
        .sort((a, b) => (Number(b[1]?.updatedAt) || 0) - (Number(a[1]?.updatedAt) || 0))
        .slice(0, 40)
      this.thumbnailMap = Object.fromEntries(entries)
      localStorage.setItem(THUMBNAIL_KEY, JSON.stringify(this.thumbnailMap))
    },
    thumbnailFor(item) {
      const key = this.getItemCacheKey(item)
      return key && this.thumbnailMap[key] ? this.thumbnailMap[key].dataUrl : ''
    },
    getItemDuration(item) {
      const mediaDuration = Number(item?.mediaDuration) || 0
      if (mediaDuration > 0) return mediaDuration
      const fromItem = Number(item?.progressDuration) || 0
      if (fromItem > 0) return fromItem
      const record = this.getProgressRecord(item)
      if (Number(record?.duration) > 0) return Number(record.duration)
      const key = this.getItemCacheKey(item)
      return Number(this.durationMap[key]) || 0
    },
    getItemDurationText(item) {
      const duration = this.getItemDuration(item)
      return duration > 0 ? this.formatDuration(duration) : '--:--'
    },
    getItemProgressPercent(item) {
      const duration = this.getItemDuration(item)
      if (!duration) return 0
      const fromItem = Number(item?.progressTime) || 0
      const record = this.getProgressRecord(item)
      const time = fromItem > 0 ? fromItem : Number(record?.time) || 0
      return Math.max(0, Math.min(100, (time / duration) * 100))
    },
    thumbText(item) {
      const title = String(item?.title || '').trim()
      return title ? title.slice(0, 2).toUpperCase() : '视频'
    },
    scheduleThumbnailWarmup() {
      if (this.thumbnailTimer) {
        clearTimeout(this.thumbnailTimer)
      }
      this.thumbnailTimer = setTimeout(() => {
        this.thumbnailTimer = null
        this.warmupThumbnails()
      }, 80)
    },
    warmupThumbnails() {
      const targets = []
      if (this.currentVideo) targets.push(this.currentVideo)
      targets.push(...this.upNextVideos.slice(0, 12))
      targets.forEach((item) => {
        this.ensureThumbnail(item)
        this.ensureDuration(item)
      })
    },
    ensureDuration(item) {
      if (!item?.url) return
      const key = this.getItemCacheKey(item)
      if (!key || this.durationMap[key] || this.durationLoadingMap[key]) return
      this.durationLoadingMap[key] = true
      const video = document.createElement('video')
      const done = (duration) => {
        if (Number.isFinite(duration) && duration > 0) {
          this.durationMap = { ...this.durationMap, [key]: duration }
        }
        delete this.durationLoadingMap[key]
        video.removeAttribute('src')
        video.load()
      }
      const timer = setTimeout(() => done(0), 6000)
      video.preload = 'metadata'
      video.src = item.url
      video.onloadedmetadata = () => {
        clearTimeout(timer)
        done(video.duration || 0)
      }
      video.onerror = () => {
        clearTimeout(timer)
        done(0)
      }
    },
    async ensureThumbnail(item) {
      if (!item?.url) return
      const key = this.getItemCacheKey(item)
      if (!key || this.thumbnailMap[key] || this.thumbnailLoadingMap[key]) return
      this.thumbnailLoadingMap[key] = true
      try {
        const dataUrl = await this.captureThumbnail(item.url)
        if (!dataUrl) return
        this.thumbnailMap = {
          ...this.thumbnailMap,
          [key]: {
            dataUrl,
            updatedAt: Date.now()
          }
        }
        this.saveThumbnailMap()
      } catch (error) {
        // ignore thumbnail failure for cross-origin videos
      } finally {
        delete this.thumbnailLoadingMap[key]
      }
    },
    captureThumbnail(url) {
      return new Promise((resolve, reject) => {
        const video = document.createElement('video')
        const canvas = document.createElement('canvas')
        const timeout = setTimeout(() => {
          cleanup()
          reject(new Error('thumbnail timeout'))
        }, 9000)

        const cleanup = () => {
          clearTimeout(timeout)
          video.removeAttribute('src')
          video.load()
        }

        video.preload = 'metadata'
        video.muted = true
        video.playsInline = true
        video.crossOrigin = 'anonymous'
        video.src = url

        video.onloadedmetadata = () => {
          const vw = video.videoWidth || 320
          const vh = video.videoHeight || 180
          canvas.width = 320
          canvas.height = Math.max(1, Math.round((canvas.width * vh) / vw))
          const seekTo = Number.isFinite(video.duration) && video.duration > 0
            ? Math.min(3, Math.max(0.2, video.duration * 0.05))
            : 0.2

          const draw = () => {
            try {
              const ctx = canvas.getContext('2d')
              if (!ctx) throw new Error('no canvas context')
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
              cleanup()
              resolve(dataUrl)
            } catch (error) {
              cleanup()
              reject(error)
            }
          }

          video.onseeked = draw
          try {
            video.currentTime = seekTo
          } catch (error) {
            draw()
          }
        }

        video.onerror = () => {
          cleanup()
          reject(new Error('thumbnail load error'))
        }
      })
    },
    onAutoCacheChange() {
      localStorage.setItem(LISTEN_CACHE_KEY, this.autoCacheOnListen ? '1' : '0')
      if (this.autoCacheOnListen) {
        this.queueCacheOnListen()
      }
    },
    persistScanSchedulerConfig() {
      const payload = {
        enabled: Boolean(this.scanSchedulerEnabled),
        minutes: Math.max(1, Number(this.scanSchedulerMinutes) || 30),
        autoImport: this.scanSchedulerAutoImport !== false,
        rootPath: String(this.scanRootPath || ''),
        recursive: Boolean(this.scanRecursive),
        taskId: String(this.scanSchedulerTaskId || '')
      }
      localStorage.setItem(SCAN_SCHEDULER_KEY, JSON.stringify(payload))
    },
    loadScanPrefs() {
      const savedPath = localStorage.getItem(SCAN_PATH_KEY)
      if (savedPath) this.scanRootPath = savedPath
      const savedRecursive = localStorage.getItem(SCAN_RECURSIVE_KEY)
      if (savedRecursive === '0') this.scanRecursive = false
      try {
        const raw = localStorage.getItem(SCAN_SCHEDULER_KEY)
        const parsed = raw ? JSON.parse(raw) : null
        if (parsed && typeof parsed === 'object') {
          if (parsed.rootPath && !this.scanRootPath) this.scanRootPath = String(parsed.rootPath)
          if (typeof parsed.recursive === 'boolean') this.scanRecursive = parsed.recursive
          this.scanSchedulerMinutes = Math.max(1, Number(parsed.minutes) || 30)
          this.scanSchedulerAutoImport = parsed.autoImport !== false
          this.scanSchedulerEnabled = Boolean(parsed.enabled)
          this.scanSchedulerTaskId = String(parsed.taskId || '')
        }
      } catch (error) {
        // ignore invalid storage
      }
    },
    buildScanSchedulerTaskPayload() {
      return {
        name: '视频库本地扫描任务',
        description: `VideoManager 自动扫描：${this.scanRootPath || '-'}`,
        source: SCAN_SCHEDULER_SOURCE,
        actionType: 'video_scan',
        mode: 'interval',
        intervalMinutes: Math.max(1, Number(this.scanSchedulerMinutes) || 30),
        intervalAnchorAt: Date.now(),
        rule: { year: '*', month: '*', day: '*', hour: '*', minute: '*', second: '0' },
        videoScanConfig: {
          rootPath: String(this.scanRootPath || ''),
          recursive: this.scanRecursive !== false,
          maxFiles: 3000,
          autoImport: this.scanSchedulerAutoImport !== false
        },
        enabled: this.scanSchedulerEnabled,
        runCount: 0,
        lastRunAt: null,
        lastMatchedSecond: null,
        createdAt: Date.now()
      }
    },
    scheduleScanTaskSync() {
      if (this.scanSchedulerSyncTimer) {
        clearTimeout(this.scanSchedulerSyncTimer)
      }
      this.scanSchedulerSyncTimer = setTimeout(() => {
        this.scanSchedulerSyncTimer = null
        this.syncScanSchedulerTask(false)
      }, 300)
    },
    async syncScanSchedulerTask(showError = true) {
      if (!this.scanRootPath) return null
      const payload = this.buildScanSchedulerTaskPayload()
      try {
        let task = null
        if (this.scanSchedulerTaskId) {
          try {
            const updated = await api.schedulerTasks.update(this.scanSchedulerTaskId, payload)
            task = updated?.task || null
          } catch (error) {
            if (!String(error?.message || '').includes('任务不存在')) {
              throw error
            }
          }
        }
        if (!task) {
          const created = await api.schedulerTasks.create(payload)
          task = created?.task || null
        }
        if (task?.id) {
          this.scanSchedulerTaskId = task.id
          this.scanSchedulerLastRunAt = Number(task.lastRunAt) || 0
          this.scanSchedulerEnabled = task.enabled !== false
          this.persistScanSchedulerConfig()
        }
        return task
      } catch (error) {
        if (showError) {
          alert(error.message || '同步全局定时任务失败')
        }
        return null
      }
    },
    async refreshScanSchedulerStatus() {
      try {
        const result = await api.schedulerTasks.getAll()
        const tasks = Array.isArray(result?.tasks) ? result.tasks : []
        let task = null
        if (this.scanSchedulerTaskId) {
          task = tasks.find((item) => item.id === this.scanSchedulerTaskId) || null
        }
        if (!task) {
          task = tasks.find((item) => item.source === SCAN_SCHEDULER_SOURCE) || null
        }
        if (!task) return
        this.scanSchedulerTaskId = String(task.id || '')
        this.scanSchedulerEnabled = task.enabled !== false
        this.scanSchedulerMinutes = Math.max(1, Number(task.intervalMinutes) || this.scanSchedulerMinutes || 30)
        this.scanSchedulerLastRunAt = Number(task.lastRunAt) || 0
        const cfg = task.videoScanConfig || {}
        if (!this.scanRootPath && cfg.rootPath) this.scanRootPath = String(cfg.rootPath)
        if (typeof cfg.recursive === 'boolean') this.scanRecursive = cfg.recursive
        this.scanSchedulerAutoImport = cfg.autoImport !== false
        this.persistScanSchedulerConfig()
      } catch (error) {}
    },
    async toggleScanScheduler() {
      if (this.scanSchedulerEnabled && !this.scanRootPath) {
        alert('请先填写扫描路径后再开启定时扫描')
        this.scanSchedulerEnabled = false
      }
      this.persistScanSchedulerConfig()
      await this.syncScanSchedulerTask(true)
    },
    async runScheduledScanNow() {
      if (!this.scanRootPath) {
        alert('请先填写扫描路径')
        return
      }
      if (!this.scanSchedulerTaskId) {
        const task = await this.syncScanSchedulerTask(true)
        if (!task?.id) return
      }
      try {
        await api.schedulerTasks.run(this.scanSchedulerTaskId)
        this.scanSchedulerLastRunAt = Date.now()
      } catch (error) {
        alert(error.message || '执行全局定时任务失败')
      }
    },
    async runFfmpegForCurrent() {
      if (!this.currentVideo?.localPath) {
        alert('仅本地视频支持 FFmpeg 处理')
        return
      }
      if (this.ffmpegWorking) return
      this.ffmpegWorking = true
      const taskStart = performance.now()
      this.recordLog({
        module: 'video',
        action: 'ffmpeg_manual_start',
        status: 'ok',
        durationMs: 0,
        name: this.currentVideo.title,
        path: this.currentVideo.localPath,
        detail: `mode=${this.ffmpegMode}`
      })
      try {
        const optimized = await api.videos.optimize({
          path: this.currentVideo.localPath,
          mode: this.ffmpegMode
        })
        if (optimized?.streamUrl) {
          this.currentVideo.url = optimized.streamUrl
          this.currentVideo.optimizedPath = optimized.optimizedPath || ''
          this.currentVideo.updatedAt = Date.now()
          await this.persist()
        }
        this.recordLog({
          module: 'video',
          action: 'ffmpeg_manual_done',
          status: 'ok',
          durationMs: performance.now() - taskStart,
          name: this.currentVideo.title,
          path: this.currentVideo.localPath,
          detail: optimized?.cached ? 'used cached optimized file' : 'generated optimized file'
        })
      } catch (error) {
        this.recordLog({
          module: 'video',
          action: 'ffmpeg_manual_error',
          status: 'error',
          durationMs: performance.now() - taskStart,
          name: this.currentVideo.title,
          path: this.currentVideo.localPath,
          detail: error?.message || 'manual ffmpeg failed'
        })
        alert(error.message || 'FFmpeg 处理失败')
      } finally {
        this.ffmpegWorking = false
      }
    },
    setClipStartFromCurrent() {
      this.clipStartSec = Math.max(0, Math.floor(Number(this.currentTime) || 0))
      if (this.clipEndSec <= this.clipStartSec) {
        this.clipEndSec = this.clipStartSec + 1
      }
      this.clipFeedback = ''
    },
    setClipEndFromCurrent() {
      this.clipEndSec = Math.max(0, Math.floor(Number(this.currentTime) || 0))
      if (this.clipEndSec <= this.clipStartSec) {
        this.clipStartSec = Math.max(0, this.clipEndSec - 1)
      }
      this.clipFeedback = ''
    },
    async runClipCurrentVideo() {
      if (!this.currentVideo?.localPath) {
        alert('仅本地视频支持剪切')
        return
      }
      const start = Math.max(0, Number(this.clipStartSec) || 0)
      const end = Math.max(0, Number(this.clipEndSec) || 0)
      if (!(end > start)) {
        alert('结束时间必须大于开始时间')
        return
      }
      if (this.clipWorking) return
      this.clipWorking = true
      this.clipFeedback = '正在剪切并保存到桌面...'
      const taskStart = performance.now()
      try {
        const result = await api.videos.clip({
          path: this.currentVideo.localPath,
          startSec: start,
          endSec: end
        })
        const now = Date.now()
        const newTitle = `${this.currentVideo.title}_片段_${this.formatDuration(start).replace(':', '-')}_${this.formatDuration(end).replace(':', '-')}`
        if (!this.hasVideoByLocalPath(result.outputPath)) {
          this.videos.unshift({
            id: `video_${now}_${Math.random().toString(16).slice(2, 6)}`,
            title: newTitle,
            url: result.streamUrl,
            category: this.currentVideo.category || '本地视频',
            collection: this.currentVideo.collection || '',
            episodeNo: null,
            status: 'watchlist',
            tags: ['local', 'clip'],
            note: `剪切片段 ${this.formatDuration(start)} - ${this.formatDuration(end)}`,
            localPath: result.outputPath,
            mediaDuration: Number(result.durationSec) > 0 ? Number(result.durationSec) : 0,
            createdAt: now,
            updatedAt: now
          })
          await this.persist()
        }
        this.clipFeedback = `剪切完成，已保存到桌面：${result.outputPath}`
        this.recordLog({
          module: 'video',
          action: 'clip_done',
          status: 'ok',
          durationMs: performance.now() - taskStart,
          name: this.currentVideo.title,
          path: result.outputPath || '',
          detail: `${start}-${end}`
        })
      } catch (error) {
        this.clipFeedback = `剪切失败：${error.message || '未知错误'}`
        this.recordLog({
          module: 'video',
          action: 'clip_error',
          status: 'error',
          durationMs: performance.now() - taskStart,
          name: this.currentVideo.title,
          path: this.currentVideo.localPath,
          detail: error?.message || 'clip failed'
        })
      } finally {
        this.clipWorking = false
      }
    },
    triggerVideoUpload() {
      const input = this.$refs.videoUploadInput
      if (!input) return
      input.value = ''
      input.click()
    },
    async onVideoFileChange(event) {
      const file = event?.target?.files?.[0]
      if (!file) return
      if (this.uploadingVideo) return
      this.uploadingVideo = true
      this.uploadProgress = 0
      this.setUploadFeedback('正在上传并生成播放链接，请稍候...', 'info')
      const uploadStart = performance.now()
      try {
        const result = await api.videos.upload(file, (percent) => {
          this.uploadProgress = Number(percent) || 0
        })
        const now = Date.now()
        const title = String(file.name || '上传视频').replace(/\.[^.]+$/, '')
        this.videos.unshift({
          id: `video_${now}_${Math.random().toString(16).slice(2, 6)}`,
          title,
          url: result.streamUrl,
          category: this.form.category || '本地上传',
          collection: this.form.collection || '',
          episodeNo: Number(this.form.episodeNo) > 0 ? Math.floor(Number(this.form.episodeNo)) : null,
          status: this.form.status || 'watchlist',
          tags: ['upload'],
          note: this.form.note || '',
          localPath: result.path,
          mediaDuration: Number(result.duration) > 0 ? Number(result.duration) : 0,
          createdAt: now,
          updatedAt: now
        })
        await this.persist()
        this.form.url = result.streamUrl || ''
        if (!this.form.title) this.form.title = title
        this.setUploadFeedback('上传成功，已自动加入视频库并生成播放链接。', 'success')
        this.recordLog({
          module: 'video',
          action: 'upload_done',
          status: 'ok',
          durationMs: performance.now() - uploadStart,
          name: file.name,
          path: result.path || '',
          detail: `size=${Number(result.size || 0)}`
        })
      } catch (error) {
        this.setUploadFeedback(`上传失败：${error.message || '未知错误'}`, 'error')
        this.recordLog({
          module: 'video',
          action: 'upload_error',
          status: 'error',
          durationMs: performance.now() - uploadStart,
          name: file.name || '',
          path: '',
          detail: error?.message || 'upload failed'
        })
      } finally {
        this.uploadingVideo = false
        this.uploadProgress = 0
      }
    },
    async cacheItemInBackground(item) {
      if (!item || !item.url || typeof window === 'undefined' || !window.caches) return
      const key = this.getItemCacheKey(item)
      if (!key) return
      if (this.cacheStateMap[key] === 'caching' || this.cacheStateMap[key] === 'done') return
      this.cacheStateMap = { ...this.cacheStateMap, [key]: 'caching' }

      const controller = new AbortController()
      this.cacheAborters[key] = controller
      try {
        const cache = await caches.open(MEDIA_CACHE_NAME)
        const request = new Request(item.url, { method: 'GET' })
        const exists = await cache.match(request)
        if (exists) {
          this.cacheStateMap = { ...this.cacheStateMap, [key]: 'done' }
          return
        }
        const response = await fetch(request, { signal: controller.signal })
        if (!response.ok) throw new Error(`cache fetch failed: ${response.status}`)
        await cache.put(request, response.clone())
        this.cacheStateMap = { ...this.cacheStateMap, [key]: 'done' }
      } catch (error) {
        if (error?.name === 'AbortError') {
          this.cacheStateMap = { ...this.cacheStateMap, [key]: 'idle' }
        } else {
          this.cacheStateMap = { ...this.cacheStateMap, [key]: 'error' }
          this.recordLog({
            module: 'video',
            action: 'listen_cache_error',
            status: 'error',
            durationMs: 0,
            name: item.title || '',
            path: item.localPath || item.url || '',
            detail: error?.message || 'listen cache failed'
          })
        }
      } finally {
        delete this.cacheAborters[key]
      }
    },
    queueCacheOnListen() {
      if (!this.listenMode || !this.autoCacheOnListen) return
      if (this.currentVideo) {
        this.cacheItemInBackground(this.currentVideo)
      }
      if (this.nextEpisode) {
        this.cacheItemInBackground(this.nextEpisode)
      }
    },
    abortAllCacheTasks() {
      Object.values(this.cacheAborters).forEach((controller) => {
        try {
          controller.abort()
        } catch (error) {}
      })
      this.cacheAborters = {}
    },
    getActiveMediaEl() {
      return this.listenMode ? this.$refs.audioRef : this.$refs.videoRef
    },
    onPlayerMouseMove() {
      this.showControls()
      this.scheduleHideControls()
    },
    showControls() {
      this.controlsVisible = true
    },
    hideControlsNow() {
      if (!this.isPlaying) return
      this.controlsVisible = false
    },
    scheduleHideControls() {
      if (this.controlsHideTimer) {
        clearTimeout(this.controlsHideTimer)
        this.controlsHideTimer = null
      }
      if (!this.isPlaying || this.listenMode) return
      this.controlsHideTimer = setTimeout(() => {
        this.controlsVisible = false
      }, 2200)
    },
    setVolume(level) {
      const next = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 1
      this.volume = next
      this.isMuted = next <= 0
      localStorage.setItem(VOLUME_KEY, String(next))
      const media = this.getActiveMediaEl()
      if (media) {
        media.volume = next
        media.muted = this.isMuted
      }
      const bg = getBackgroundPlayer()
      if (bg) {
        bg.volume = next
        bg.muted = this.isMuted
      }
    },
    toggleMute() {
      this.isMuted = !this.isMuted
      const media = this.getActiveMediaEl()
      if (media) {
        media.muted = this.isMuted
      }
      const bg = getBackgroundPlayer()
      if (bg) {
        bg.muted = this.isMuted
      }
    },
    onVolumeChange(event) {
      const media = event?.target
      if (!media) return
      this.volume = Number.isFinite(media.volume) ? media.volume : this.volume
      this.isMuted = Boolean(media.muted)
      localStorage.setItem(VOLUME_KEY, String(this.volume))
    },
    onGlobalKeydown(event) {
      if (this.activeTab !== 'player' || !this.currentVideo) return
      const targetTag = String(event?.target?.tagName || '').toLowerCase()
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return

      const key = String(event.key || '').toLowerCase()
      if (key === ' ' || key === 'k') {
        event.preventDefault()
        this.togglePlayPause()
        return
      }
      if (key === 'arrowleft' || key === 'j') {
        event.preventDefault()
        this.seekBy(-10)
        return
      }
      if (key === 'arrowright' || key === 'l') {
        event.preventDefault()
        this.seekBy(10)
        return
      }
      if (key === 'm') {
        event.preventDefault()
        this.toggleMute()
        return
      }
      if (key === 'f' && !this.listenMode) {
        event.preventDefault()
        this.enterFullscreen()
      }
    },
    getProgressRecord(item) {
      if (!item) return null
      if (Number(item.progressTime) > 0) {
        return {
          time: Number(item.progressTime) || 0,
          duration: Number(item.progressDuration) || 0,
          updatedAt: Number(item.progressUpdatedAt) || 0,
          title: item.title || ''
        }
      }
      const key = item.localPath || item.url || item.id
      return this.progressMap[key] || null
    },
    queueProgressSync(force = false) {
      if (this.storageMode !== 'server') return
      if (force) {
        if (this.progressSyncTimer) {
          clearTimeout(this.progressSyncTimer)
          this.progressSyncTimer = null
        }
        this.syncProgressNow()
        return
      }
      if (this.progressSyncTimer) return
      this.progressSyncTimer = setTimeout(() => {
        this.progressSyncTimer = null
        this.syncProgressNow()
      }, 1200)
    },
    async syncProgressNow() {
      if (this.storageMode !== 'server') return
      if (this.progressSyncInFlight) {
        this.progressSyncQueued = true
        return
      }

      this.progressSyncInFlight = true
      try {
        const normalized = this.normalizeVideos(this.videos)
        this.videos = normalized
        await api.videos.saveLibrary(normalized)
      } catch (error) {
        this.recordLog({
          module: 'video',
          action: 'progress_sync_error',
          status: 'error',
          durationMs: 0,
          detail: error?.message || 'sync progress failed'
        })
      } finally {
        this.progressSyncInFlight = false
        if (this.progressSyncQueued) {
          this.progressSyncQueued = false
          this.syncProgressNow()
        }
      }
    },
    rememberProgress(item, time, duration) {
      if (!item) return
      const key = item.localPath || item.url || item.id
      if (!key) return
      const safeTime = Number.isFinite(time) ? Math.max(0, time) : 0
      const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0
      const target = this.videos.find((v) => v.id === item.id) || item

      if (safeDuration > 0 && safeDuration - safeTime <= 3) {
        if (this.progressMap[key]) {
          delete this.progressMap[key]
          this.saveProgressMap()
        }
        target.progressTime = 0
        target.progressDuration = 0
        target.progressUpdatedAt = 0
        this.queueProgressSync(false)
        return
      }

      const updatedAt = Date.now()
      this.progressMap[key] = {
        time: safeTime,
        duration: safeDuration,
        updatedAt,
        title: item.title || ''
      }
      target.progressTime = safeTime
      target.progressDuration = safeDuration
      target.progressUpdatedAt = updatedAt
      this.saveProgressMap()
      this.queueProgressSync(false)
    },
    commitCurrentProgress(force = false) {
      if (!this.currentVideo) return
      const now = Date.now()
      if (!force && now - this.lastProgressCommitAt < 2000) return
      this.lastProgressCommitAt = now
      const media = this.getActiveMediaEl()
      const time = media?.currentTime ?? this.currentTime
      const duration = media?.duration ?? this.duration
      this.rememberProgress(this.currentVideo, time, duration)
      if (force) {
        this.queueProgressSync(true)
      }
    },
    async startBackgroundPlayback() {
      const fg = this.getActiveMediaEl()
      if (!fg || !this.currentVideo || fg.paused) return
      const bg = getBackgroundPlayer()
      if (!bg) return
      const shouldResumeAt = fg.currentTime || this.currentTime || 0
      const srcChanged = bg.src !== fg.currentSrc
      if (srcChanged) {
        bg.src = fg.currentSrc || this.currentVideo.url
      }
      try {
        bg.currentTime = shouldResumeAt
      } catch (error) {
        bg.addEventListener(
          'loadedmetadata',
          () => {
            bg.currentTime = shouldResumeAt
          },
          { once: true }
        )
      }
      bg.playbackRate = this.playbackRate
      bg.volume = this.volume
      bg.muted = this.isMuted
      try {
        await bg.play()
      } catch (error) {}
      fg.pause()
      this.wasPlayingBeforeDeactivate = !bg.paused
    },
    async restoreFromBackgroundPlayback() {
      const fg = this.getActiveMediaEl()
      const bg = getBackgroundPlayer()
      if (!fg || !bg || !this.currentVideo) return
      const currentSrc = fg.currentSrc || this.currentVideo.url
      if (!bg.src || !currentSrc || bg.src !== currentSrc) return
      const bgTime = Number.isFinite(bg.currentTime) ? bg.currentTime : 0
      try {
        fg.currentTime = bgTime
      } catch (error) {}
      this.currentTime = bgTime
      this.duration = fg.duration || this.duration || 0
      const shouldContinue = !bg.paused && this.wasPlayingBeforeDeactivate
      fg.playbackRate = this.playbackRate
      fg.volume = this.volume
      fg.muted = this.isMuted
      bg.pause()
      if (shouldContinue) {
        try {
          await fg.play()
        } catch (error) {}
      }
      this.wasPlayingBeforeDeactivate = false
    },
    recordLog(payload) {
      appendPerfLog(payload)
      this.liveLogs.unshift({
        id: `live_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        timestamp: Date.now(),
        action: payload.action || 'unknown',
        status: payload.status || 'ok',
        durationMs: Number.isFinite(payload.durationMs) ? Math.round(payload.durationMs) : null,
        detail: payload.detail || ''
      })
      if (this.liveLogs.length > 80) {
        this.liveLogs.length = 80
      }
    },
    clearLiveLogs() {
      this.liveLogs = []
    },
    async playVideo(item) {
      if (item.localPath) {
        try {
          await api.get('/health')
        } catch (error) {
          this.recordLog({
            module: 'video',
            action: 'backend_unreachable',
            status: 'error',
            durationMs: 0,
            name: item.title,
            path: item.localPath,
            detail: 'backend not reachable'
          })
          alert('后端服务未启动，无法播放本地视频。请先运行：npm run dev（或至少 npm run server:test）')
          return
        }
      }

      if (item.localPath && this.autoOptimizeOnPlay && !this.optimizing) {
        this.optimizing = true
        const optimizeStart = performance.now()
        this.recordLog({
          module: 'video',
          action: 'optimize_start',
          status: 'ok',
          durationMs: 0,
          name: item.title,
          path: item.localPath,
          detail: 'auto optimize before play'
        })
        try {
          const optimized = await api.videos.optimize({
            path: item.localPath,
            mode: 'faststart'
          })
          if (optimized?.streamUrl) {
            item.url = optimized.streamUrl
            item.optimizedPath = optimized.optimizedPath || ''
            item.updatedAt = Date.now()
            this.persist()
          }
          this.recordLog({
            module: 'video',
            action: 'optimize_done',
            status: 'ok',
            durationMs: performance.now() - optimizeStart,
            name: item.title,
            path: item.localPath,
            detail: optimized?.cached ? 'used cached optimized file' : 'generated optimized file'
          })
        } catch (error) {
          this.recordLog({
            module: 'video',
            action: 'optimize_error',
            status: 'error',
            durationMs: performance.now() - optimizeStart,
            name: item.title,
            path: item.localPath,
            detail: error?.message || 'optimize failed'
          })
        } finally {
          this.optimizing = false
        }
      }

      this.playingId = item.id
      this.activeTab = 'player'
      this.duration = 0
      this.currentTime = 0
      this.clipStartSec = 0
      this.clipEndSec = 0
      this.clipFeedback = ''
      const progress = this.getProgressRecord(item)
      this.resumePendingTime = progress?.time > 0 ? progress.time : 0
      this.isPlaying = false
      this.recordLog({
        module: 'video',
        action: 'play_click',
        status: 'ok',
        durationMs: 0,
        name: item.title,
        path: item.localPath || item.url || '',
        detail: '点击播放按钮'
      })
      this.playMeasure = {
        startPerf: performance.now(),
        startAt: Date.now(),
        name: item.title,
        path: item.localPath || item.url || ''
      }
      await this.$nextTick()
      const media = this.getActiveMediaEl()
      if (!media) return
      media.playbackRate = this.playbackRate
      media.volume = this.volume
      media.muted = this.isMuted
      const bg = getBackgroundPlayer()
      if (bg && !bg.paused) {
        bg.pause()
      }
      try {
        await media.play()
        this.scheduleHideControls()
      } catch (error) {
        this.recordLog({
          module: 'video',
          action: 'play_start',
          status: 'error',
          durationMs: performance.now() - this.playMeasure.startPerf,
          name: item.title,
          path: item.localPath || item.url || '',
          detail: error?.message || 'video.play() failed'
        })
        this.playMeasure = null
        alert('播放失败：请确认链接是可直接播放的视频地址（如 mp4）')
      }
    },
    togglePlayPause() {
      const media = this.getActiveMediaEl()
      if (!media) return
      if (media.paused) {
        media.play().then(() => {
          this.scheduleHideControls()
        }).catch(() => {})
      } else {
        media.pause()
        this.commitCurrentProgress(true)
      }
    },
    seekBy(seconds) {
      const media = this.getActiveMediaEl()
      if (!media) return
      const next = Math.max(0, Math.min(media.currentTime + seconds, media.duration || Infinity))
      media.currentTime = next
    },
    seekTo(seconds) {
      const media = this.getActiveMediaEl()
      if (!media) return
      const next = Math.max(0, Math.min(Number(seconds) || 0, media.duration || this.duration || Infinity))
      media.currentTime = next
      this.currentTime = next
    },
    async toggleListenMode() {
      const current = this.getActiveMediaEl()
      const keepTime = current?.currentTime ?? this.currentTime ?? 0
      const shouldKeepPlaying = Boolean(current && !current.paused)
      this.listenMode = !this.listenMode
      localStorage.setItem(LISTEN_MODE_KEY, this.listenMode ? '1' : '0')
      await this.$nextTick()
      const target = this.getActiveMediaEl()
      if (!target) return
      target.playbackRate = this.playbackRate
      target.volume = this.volume
      target.muted = this.isMuted
      try {
        target.currentTime = keepTime
      } catch (error) {
        target.addEventListener(
          'loadedmetadata',
          () => {
            target.currentTime = keepTime
          },
          { once: true }
        )
      }
      this.currentTime = keepTime
      if (shouldKeepPlaying) {
        try {
          await target.play()
        } catch (error) {}
      }
      this.queueCacheOnListen()
    },
    async playSibling(offset) {
      const target = offset > 0 ? this.nextEpisode : this.prevEpisode
      if (!target) return
      await this.playVideo(target)
    },
    setPlaybackRate(rate) {
      const next = Number.isFinite(rate) ? Math.min(2, Math.max(0.5, rate)) : 1
      this.playbackRate = next
      localStorage.setItem(PLAYBACK_RATE_KEY, String(next))
      const media = this.getActiveMediaEl()
      if (media) {
        media.playbackRate = next
      }
      const bg = getBackgroundPlayer()
      if (bg) {
        bg.playbackRate = next
      }
    },
    enterFullscreen() {
      const el = this.$refs.playerWrapRef
      if (!el) return
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {})
      }
    },
    downloadCurrent() {
      if (!this.currentVideo) return
      const href = this.currentVideo.localPath ? api.videos.downloadUrl(this.currentVideo.localPath) : this.currentVideo.url
      const a = document.createElement('a')
      a.href = href
      a.download = `${this.currentVideo.title || 'video'}.mp4`
      a.target = '_blank'
      a.rel = 'noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    },
    onLoadedMetadata(event) {
      const video = event.target
      video.playbackRate = this.playbackRate
      video.volume = this.volume
      video.muted = this.isMuted
      this.duration = video.duration || 0
      if (this.resumePendingTime > 0) {
        const resumeAt = Math.min(this.resumePendingTime, this.duration || this.resumePendingTime)
        try {
          video.currentTime = resumeAt
        } catch (error) {}
      }
      this.currentTime = video.currentTime || 0
      this.resumePendingTime = 0
      if (this.playMeasure) {
        this.recordLog({
          module: 'video',
          action: 'metadata_loaded',
          status: 'ok',
          durationMs: performance.now() - this.playMeasure.startPerf,
          name: this.playMeasure.name,
          path: this.playMeasure.path,
          detail: 'loadedmetadata'
        })
      }
    },
    onRateChange(event) {
      const rate = Number(event?.target?.playbackRate)
      if (!Number.isFinite(rate)) return
      this.setPlaybackRate(rate)
    },
    onVideoError(event) {
      const mediaError = event?.target?.error
      this.recordLog({
        module: 'video',
        action: 'play_error',
        status: 'error',
        durationMs: this.playMeasure ? performance.now() - this.playMeasure.startPerf : null,
        name: this.playMeasure?.name || this.currentVideo?.title || '',
        path: this.playMeasure?.path || this.currentVideo?.localPath || this.currentVideo?.url || '',
        detail: mediaError ? `code=${mediaError.code}` : 'video element error'
      })
      this.playMeasure = null
    },
    onPlaying() {
      this.isPlaying = true
      this.showControls()
      this.scheduleHideControls()
      this.queueCacheOnListen()
      if (!this.playMeasure) return
      this.recordLog({
        module: 'video',
        action: 'play_start',
        status: 'ok',
        durationMs: performance.now() - this.playMeasure.startPerf,
        name: this.playMeasure.name,
        path: this.playMeasure.path,
        detail: `startedAt=${this.playMeasure.startAt}`
      })
      this.playMeasure = null
    },
    onPause() {
      this.isPlaying = false
      this.showControls()
      if (this.controlsHideTimer) {
        clearTimeout(this.controlsHideTimer)
        this.controlsHideTimer = null
      }
    },
    onTimeUpdate(event) {
      const video = event.target
      this.currentTime = video.currentTime || 0
      this.commitCurrentProgress(false)
    },
    saveVideo() {
      if (!this.form.url) {
        alert('请填写视频链接，或直接使用“选择并上传视频”自动生成链接')
        return
      }
      if (this.looksLikeLocalPath(this.form.url)) {
        alert('检测到你填的是本地路径。请使用“本地扫描”页签导入目录里的视频，再播放。')
        return
      }

      const now = Date.now()
      const title = this.form.title || this.inferTitleFromUrl(this.form.url)
      const payload = {
        title,
        url: this.form.url,
        category: this.form.category,
        collection: this.form.collection,
        episodeNo: Number(this.form.episodeNo) > 0 ? Math.floor(Number(this.form.episodeNo)) : null,
        status: this.form.status,
        tags: this.parseTags(this.form.tagsText),
        note: this.form.note,
        updatedAt: now,
        localPath: null
      }

      if (this.editingId) {
        const idx = this.videos.findIndex((v) => v.id === this.editingId)
        if (idx !== -1) {
          this.videos[idx] = { ...this.videos[idx], ...payload }
        }
      } else {
        this.videos.unshift({
          id: `video_${now}`,
          createdAt: now,
          ...payload
        })
      }

      this.persist()
      this.resetForm()
    },
    editVideo(item) {
      this.editingId = item.id
      this.form = {
        title: item.title,
        url: item.url,
        category: item.category || '',
        collection: item.collection || '',
        episodeNo: Number(item.episodeNo) > 0 ? Number(item.episodeNo) : null,
        status: item.status || 'watchlist',
        tagsText: (item.tags || []).join(', '),
        note: item.note || ''
      }
      this.activeTab = 'library'
    },
    cycleStatus(item) {
      const seq = ['watchlist', 'watching', 'completed']
      const i = seq.indexOf(item.status)
      const next = seq[(i + 1) % seq.length]
      item.status = next
      item.updatedAt = Date.now()
      this.persist()
    },
    deleteVideo(id) {
      if (!confirm('确定删除这个视频记录吗？')) return
      const target = this.videos.find((v) => v.id === id)
      this.videos = this.videos.filter((v) => v.id !== id)
      this.persist()
      if (target) {
        const key = target.localPath || target.url || target.id
        if (key && this.progressMap[key]) {
          delete this.progressMap[key]
          this.saveProgressMap()
        }
        if (key && this.thumbnailMap[key]) {
          delete this.thumbnailMap[key]
          this.saveThumbnailMap()
        }
      }
      if (this.editingId === id) {
        this.resetForm()
      }
      if (this.playingId === id) {
        this.playingId = null
      }
    },
    resetForm() {
      this.editingId = null
      this.form = this.emptyForm()
    },
    hasVideoByLocalPath(localPath) {
      return this.videos.some((v) => v.localPath && v.localPath === localPath)
    },
    importOneScanned(item) {
      if (this.hasVideoByLocalPath(item.path)) {
        const existing = this.videos.find((v) => v.localPath === item.path)
        const scannedDuration = Number(item.duration) > 0 ? Number(item.duration) : 0
        if (existing && scannedDuration > 0 && Number(existing.mediaDuration || 0) <= 0) {
          existing.mediaDuration = scannedDuration
          existing.updatedAt = Date.now()
          this.persist()
        }
        return
      }
      const now = Date.now()
      this.videos.unshift({
        id: `video_${now}_${Math.random().toString(16).slice(2, 6)}`,
        title: item.name,
        url: item.streamUrl,
        category: '本地视频',
        collection: '',
        episodeNo: null,
        status: 'watchlist',
        tags: ['local'],
        note: '',
        localPath: item.path,
        mediaDuration: Number(item.duration) > 0 ? Number(item.duration) : 0,
        createdAt: now,
        updatedAt: now
      })
      this.persist()
    },
    importAllScanned() {
      for (const item of this.scanResults) {
        this.importOneScanned(item)
      }
    },
    async previewScanned(item) {
      if (!this.hasVideoByLocalPath(item.path)) {
        this.importOneScanned(item)
      }
      const match = this.videos.find((v) => v.localPath === item.path)
      if (match) {
        await this.playVideo(match)
      }
    },
    async scanLocalVideos(options = {}) {
      const { silent = false, fromScheduler = false, autoImport = false } = options || {}
      if (!this.scanRootPath) {
        if (!silent) alert('请先输入目录绝对路径')
        return
      }
      this.persistScanSchedulerConfig()
      this.scanError = ''
      this.scanning = true
      this.scanResults = []
      const scanStart = performance.now()

      try {
        const result = await api.videos.scan({
          rootPath: this.scanRootPath,
          recursive: this.scanRecursive,
          maxFiles: 3000,
          includeDuration: true
        })
        this.scanResults = (result.items || []).map((item) => ({
          ...item,
          duration: Number(item.duration) > 0 ? Number(item.duration) : 0,
          streamUrl: item.streamUrl,
          downloadUrl: item.downloadUrl
        }))
        if (autoImport) {
          this.importAllScanned()
        }
        if (fromScheduler) {
          this.scanSchedulerLastRunAt = Date.now()
        }
        this.recordLog({
          module: 'video',
          action: fromScheduler ? 'scan_scheduler' : 'scan',
          status: 'ok',
          durationMs: performance.now() - scanStart,
          name: this.scanRootPath,
          detail: `count=${this.scanResults.length}`
        })
      } catch (error) {
        this.scanError = error.message || '扫描失败'
        if (String(error.message || '').includes('Failed to fetch')) {
          this.scanError = '后端服务不可用，请先启动：npm run dev（或 npm run server:test）'
        }
        this.recordLog({
          module: 'video',
          action: fromScheduler ? 'scan_scheduler' : 'scan',
          status: 'error',
          durationMs: performance.now() - scanStart,
          name: this.scanRootPath,
          detail: this.scanError
        })
      } finally {
        this.scanning = false
      }
    }
  },
  activated() {
    this.$nextTick(() => {
      this.restoreFromBackgroundPlayback()
    })
  },
  deactivated() {
    this.commitCurrentProgress(true)
    this.startBackgroundPlayback()
  },
  beforeUnmount() {
    this.commitCurrentProgress(true)
    this.abortAllCacheTasks()
    window.removeEventListener('keydown', this.onGlobalKeydown)
    if (this.scanSchedulerSyncTimer) {
      clearTimeout(this.scanSchedulerSyncTimer)
      this.scanSchedulerSyncTimer = null
    }
    if (this.thumbnailTimer) {
      clearTimeout(this.thumbnailTimer)
      this.thumbnailTimer = null
    }
    if (this.controlsHideTimer) {
      clearTimeout(this.controlsHideTimer)
      this.controlsHideTimer = null
    }
    if (this.progressSyncTimer) {
      clearTimeout(this.progressSyncTimer)
      this.progressSyncTimer = null
    }
  },
  mounted() {
    this.loadScanPrefs()
    this.listenMode = localStorage.getItem(LISTEN_MODE_KEY) === '1'
    const savedVolume = Number(localStorage.getItem(VOLUME_KEY))
    if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) {
      this.volume = savedVolume
      this.isMuted = savedVolume === 0
    }
    const listenCache = localStorage.getItem(LISTEN_CACHE_KEY)
    if (listenCache === '0') {
      this.autoCacheOnListen = false
    }
    const savedRate = Number(localStorage.getItem(PLAYBACK_RATE_KEY))
    if (Number.isFinite(savedRate) && savedRate >= 0.5 && savedRate <= 2) {
      this.playbackRate = savedRate
    }
    this.loadProgressMap()
    this.loadThumbnailMap()
    this.load()
    this.refreshScanSchedulerStatus()
    this.scheduleThumbnailWarmup()
    window.addEventListener('keydown', this.onGlobalKeydown)
  }
}
</script>

<style scoped>
.video-page { color: var(--app-text); }
.page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.page-head h2 { margin: 0; font-size: 1.16em; }
.page-head p { margin: 4px 0 0; color: var(--app-text-muted); font-size: 0.84em; }
.stats { display: flex; gap: 6px; flex-wrap: wrap; }
.stat { background: var(--app-card-elevated); border: 1px solid var(--app-border); padding: 4px 8px; border-radius: 999px; font-size: 0.74em; color: var(--app-text-secondary); }

.subtabs { display: inline-flex; gap: 6px; margin-bottom: 10px; padding: 5px; background: var(--app-group-bg); border: 1px solid var(--app-border); border-radius: 14px; flex-wrap: wrap; }
.subtab { border: 1px solid transparent; background: transparent; color: var(--app-text-secondary); border-radius: 10px; padding: 7px 11px; cursor: pointer; font-weight: 600; font-size: 0.84em; }
.subtab.active { background: var(--app-primary); color: var(--app-on-primary); border-color: transparent; box-shadow: 0 6px 16px var(--app-shadow); }
.play-opts { margin-bottom: 10px; font-size: 0.84em; color: var(--app-text-secondary); display: flex; gap: 10px; flex-wrap: wrap; }

.layout { display: grid; grid-template-columns: 350px 1fr; gap: 12px; }
.panel { background: var(--app-card); border: 1px solid var(--app-border); border-radius: 16px; padding: 14px; box-shadow: var(--app-soft-shadow); }
.panel h3 { margin: 0 0 10px; font-size: 1em; }
.yt-page-shell {
  background: #f9f9f9;
  border-color: #e5e7eb;
  padding: 10px;
}
.yt-topbar {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr) 220px;
  align-items: center;
  gap: 14px;
  padding: 4px 6px 12px;
}
.yt-brand { display: flex; align-items: center; gap: 8px; color: #0f172a; font-size: 1.05em; }
.yt-logo {
  display: inline-flex;
  width: 26px;
  height: 18px;
  border-radius: 6px;
  align-items: center;
  justify-content: center;
  background: #ff0033;
  color: #fff;
  font-size: 12px;
}
.yt-search-wrap { display: flex; align-items: center; }
.yt-search {
  flex: 1;
  height: 40px;
  border: 1px solid #d1d5db;
  border-right: 0;
  border-radius: 20px 0 0 20px;
  padding: 0 14px;
  background: #fff;
}
.yt-search-btn {
  width: 52px;
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 0 20px 20px 0;
  background: #f3f4f6;
  cursor: pointer;
}
.yt-top-actions { display: flex; justify-content: flex-end; gap: 8px; }
.yt-icon-pill {
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #111827;
  padding: 8px 12px;
  font-size: 0.82em;
  cursor: pointer;
}
.yt-avatar {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #0ea5e9, #4338ca);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.form-group { margin-bottom: 9px; }
.form-group label { display: block; margin-bottom: 4px; font-size: 0.8em; font-weight: 600; color: var(--app-text-secondary); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.input { width: 100%; border: 1px solid var(--app-border); border-radius: 11px; padding: 9px 10px; font: inherit; background: var(--app-card-elevated); color: var(--app-text); font-size: 0.88em; }
.input:focus { outline: none; border-color: var(--app-primary); box-shadow: 0 0 0 3px var(--app-shadow-light); }

.actions { display: flex; gap: 8px; margin-top: 8px; }
.upload-tip { font-size: 0.76em; color: var(--app-text-muted); align-self: center; }
.upload-feedback { margin-top: 6px; border-radius: 10px; padding: 8px 10px; font-size: 0.78em; border: 1px solid transparent; }
.upload-feedback.info { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.upload-feedback.success { background: #ecfdf5; border-color: #bbf7d0; color: #166534; }
.upload-feedback.error { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
.btn { border: 1px solid var(--app-border); background: var(--app-card-elevated); color: var(--app-text-secondary); border-radius: 11px; padding: 8px 10px; cursor: pointer; font-size: 0.84em; font-weight: 600; }
.btn-primary { background: var(--app-primary); border-color: transparent; color: var(--app-on-primary); box-shadow: 0 8px 18px var(--app-shadow); }
.btn-danger { background: #ff3b30; border-color: transparent; color: #fff; box-shadow: 0 8px 18px rgba(255, 59, 48, 0.24); }
.btn-sm { padding: 6px 8px; font-size: 0.75em; }

.player-wrap { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #ffffff; color: #111827; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08); }
.player-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 14px; align-items: start; }
.yt-main-column { min-width: 0; display: grid; gap: 10px; }
.player-title-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; margin-bottom: 8px; }
.player-title-row h3 { margin: 0; font-size: 0.92em; color: #111827; }
.cache-tip { font-size: 0.8em; color: #7dd3fc; }
.yt-shell { position: relative; border-radius: 10px; overflow: hidden; background: #000; }
.player { width: 100%; border-radius: 10px; background: #000; aspect-ratio: 16 / 9; }
.audio-player { width: 100%; }
.listen-tip { margin-top: 8px; color: #c5c5ce; font-size: 0.78em; }
.yt-center-play {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 66px;
  height: 46px;
  border-radius: 12px;
  border: 0;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  z-index: 3;
}
.yt-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 10px 8px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.86), rgba(0, 0, 0, 0));
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}
.yt-overlay.visible { opacity: 1; pointer-events: auto; }
.yt-progress { margin-top: 2px; }
.yt-scrubber { width: 100%; appearance: none; background: transparent; cursor: pointer; }
.yt-scrubber::-webkit-slider-runnable-track { height: 4px; border-radius: 999px; background: linear-gradient(to right, #ff0033 0%, #ff0033 var(--played), rgba(255, 255, 255, 0.26) var(--played), rgba(255, 255, 255, 0.26) 100%); }
.yt-scrubber::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; border-radius: 50%; margin-top: -4px; background: #ff0033; border: 0; }
.yt-scrubber::-moz-range-track { height: 4px; border-radius: 999px; background: rgba(255, 255, 255, 0.26); }
.yt-scrubber::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #ff0033; border: 0; }
.yt-controls { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.yt-left, .yt-right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.yt-group {
  background: rgba(28, 28, 28, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 4px 8px;
  backdrop-filter: blur(8px);
}
.yt-btn { background: transparent; color: #fff; border-color: transparent; border-radius: 8px; padding: 5px 8px; font-size: 0.74em; }
.yt-btn:hover { background: rgba(255, 255, 255, 0.14); }
.yt-icon-btn { width: 30px; height: 30px; padding: 0; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; }
.yt-icon { width: 16px; height: 16px; display: block; }
.yt-icon-lg { width: 28px; height: 28px; }
.yt-volume { width: 80px; accent-color: #fff; }
.rate-select { width: auto; min-width: 70px; padding: 5px 6px; border-radius: 8px; background: rgba(255, 255, 255, 0.12); color: #fff; border-color: transparent; font-size: 0.76em; }
.time-indicator { font-size: 0.76em; color: #fff; }
.yt-audio-controls { margin-top: 8px; }
.yt-video-meta { border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; padding: 12px; }
.yt-meta-title { margin: 0; font-size: 1.02em; color: #0f172a; }
.yt-meta-row { margin-top: 6px; font-size: 0.78em; color: #6b7280; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.yt-ffmpeg-row { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.yt-ffmpeg-label { font-size: 0.74em; color: #6b7280; font-weight: 700; }
.yt-ffmpeg-select { max-width: 220px; }
.yt-clip-row { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.yt-clip-time { min-width: 52px; text-align: center; font-size: 0.76em; color: #111827; background: #f3f4f6; border-radius: 8px; padding: 6px 8px; font-variant-numeric: tabular-nums; }
.yt-clip-feedback { margin-top: 8px; font-size: 0.76em; color: #0369a1; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 6px 8px; word-break: break-all; }
.yt-meta-note { margin: 8px 0 0; color: #374151; font-size: 0.84em; white-space: pre-wrap; }
.yt-live-log { margin-top: 2px; }
.yt-side-column { border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; padding: 10px; position: sticky; top: 10px; max-height: calc(100vh - 140px); overflow: auto; }
.yt-side-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.yt-side-head h4 { margin: 0; font-size: 0.92em; color: #111827; }
.yt-side-head span { font-size: 0.74em; color: #6b7280; }
.yt-next-list { display: grid; gap: 8px; }
.yt-next-item { display: grid; grid-template-columns: 112px 1fr; gap: 8px; border: 1px solid #e5e7eb; background: #ffffff; border-radius: 10px; padding: 6px; text-align: left; color: #111827; cursor: pointer; }
.yt-next-item:hover { border-color: #d1d5db; background: #f9fafb; }
.yt-next-item.active { border-color: #ff0033; box-shadow: 0 0 0 1px rgba(255, 0, 51, 0.3) inset; }
.yt-next-thumb { position: relative; border-radius: 8px; background: linear-gradient(135deg, #dbeafe, #f1f5f9); aspect-ratio: 16 / 9; display: flex; align-items: flex-end; justify-content: flex-end; padding: 6px; }
.yt-next-thumb-img { width: 100%; height: 100%; border-radius: 8px; object-fit: cover; display: block; }
.yt-next-fallback { width: 100%; height: 100%; border-radius: 8px; background: linear-gradient(135deg, #0f172a, #334155); color: #fff; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; padding: 8px; }
.yt-next-fallback strong { font-size: 0.9em; letter-spacing: 0.04em; opacity: 0.92; align-self: flex-start; }
.yt-next-fallback span { background: rgba(255, 255, 255, 0.18); color: #fff; border-radius: 5px; padding: 2px 5px; font-size: 0.68em; }
.yt-next-duration {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  color: #fff;
  background: rgba(0, 0, 0, 0.82);
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.yt-next-info { min-width: 0; }
.yt-next-title { font-size: 0.8em; font-weight: 700; color: #111827; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.yt-next-meta { margin-top: 4px; color: #6b7280; font-size: 0.72em; }
.yt-next-progress { margin-top: 6px; display: flex; align-items: center; gap: 6px; }
.yt-next-progress-bar { flex: 1; height: 4px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
.yt-next-progress-fill { height: 100%; background: #ff0033; }
.yt-next-progress-text { font-size: 0.68em; color: #6b7280; min-width: 28px; text-align: right; }
.yt-next-empty { padding: 18px 10px; font-size: 0.78em; }
.live-log { border: 1px solid var(--app-border); border-radius: 12px; padding: 10px; background: var(--app-card); min-height: 180px; }
.yt-live-log { border-color: #e5e7eb; background: #ffffff; }
.yt-live-log .live-item { border-color: #e5e7eb; background: #f8fafc; }
.yt-live-log .live-time { color: #6b7280; }
.yt-live-log .live-detail,
.yt-live-log .live-ms { color: #4b5563; }
.live-log-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.live-log-head h4 { margin: 0; font-size: 0.84em; }
.live-empty { color: var(--app-text-muted); font-size: 0.8em; padding: 8px 0; }
.live-list { display: grid; gap: 8px; max-height: 360px; overflow: auto; }
.live-item { border: 1px solid var(--app-border); border-radius: 10px; padding: 8px; background: var(--app-card-elevated); }
.live-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: 0.76em; }
.live-time { color: var(--app-text-muted); }
.live-action { font-weight: 700; }
.live-status { color: #30d158; font-weight: 700; }
.live-status.err { color: #ff3b30; }
.live-detail { margin-top: 4px; color: var(--app-text-secondary); font-size: 0.76em; word-break: break-all; }
.live-ms { margin-top: 2px; color: var(--app-text-muted); font-size: 0.72em; }

.toolbar { display: grid; grid-template-columns: 1fr 170px; gap: 8px; margin-bottom: 8px; }
.cards { display: grid; gap: 8px; }
.card { border: 1px solid var(--app-border); background: var(--app-card-elevated); border-radius: 12px; padding: 10px; }
.card.active { border-color: var(--app-primary); box-shadow: 0 0 0 3px var(--app-shadow-light); }
.card-head { display: flex; justify-content: space-between; gap: 10px; }
.card h4 { margin: 0; font-size: 0.95em; }
.meta { color: var(--app-text-muted); font-size: 0.74em; margin-top: 4px; display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
.open-link { color: var(--app-primary); font-size: 0.76em; font-weight: 700; text-decoration: none; }
.note { margin: 7px 0; font-size: 0.82em; color: var(--app-text-secondary); white-space: pre-wrap; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.tag { font-size: 0.72em; padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--app-primary) 14%, transparent); color: var(--app-primary); border: 1px solid color-mix(in srgb, var(--app-primary) 28%, transparent); }
.card-actions { display: flex; gap: 5px; flex-wrap: wrap; }
.empty { text-align: center; color: var(--app-text-muted); padding: 34px 12px; border: 1px dashed var(--app-border); border-radius: 12px; background: var(--app-card-elevated); font-size: 0.84em; }

.scan-tip { margin: 0 0 10px; font-size: 0.82em; color: var(--app-text-muted); }
.scan-toolbar { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; margin-bottom: 10px; }
.scan-scheduler { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 10px; padding: 8px; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-card-elevated); }
.scan-min-input { width: 72px; margin: 0 6px; border: 1px solid var(--app-border); border-radius: 8px; padding: 4px 6px; background: var(--app-card); color: var(--app-text); }
.scan-scheduler-meta { font-size: 0.76em; color: var(--app-text-muted); }
.check { font-size: 0.8em; color: var(--app-text-secondary); }
.scan-error { color: #ff3b30; font-size: 0.82em; margin-bottom: 8px; }
.scan-result-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.84em; color: var(--app-text-secondary); }
.scan-results { display: grid; gap: 8px; max-height: 420px; overflow: auto; }
.scan-item { display: flex; justify-content: space-between; align-items: center; gap: 10px; border: 1px solid var(--app-border); border-radius: 11px; padding: 10px; background: var(--app-card-elevated); }
.scan-name { font-weight: 700; font-size: 0.86em; }
.scan-path { font-size: 0.74em; color: var(--app-text-muted); word-break: break-all; margin-top: 2px; }
.scan-actions { display: flex; gap: 6px; }

@media (max-width: 980px) {
  .layout { grid-template-columns: 1fr; }
  .player-layout { grid-template-columns: 1fr; }
  .yt-side-column { position: static; max-height: none; }
  .yt-topbar { grid-template-columns: 1fr; gap: 8px; }
  .yt-top-actions { justify-content: flex-start; }
}

@media (max-width: 640px) {
  .panel { border-radius: 14px; padding: 10px; }
  .subtabs { width: 100%; }
  .form-row { grid-template-columns: 1fr; }
  .toolbar { grid-template-columns: 1fr; }
  .scan-toolbar { grid-template-columns: 1fr; }
  .yt-left, .yt-right { width: 100%; }
  .scan-result-head,
  .scan-item { flex-direction: column; align-items: flex-start; }
}
</style>
