import { api } from './api.js'

export const streamingEngineApi = {
  async listProcessors() {
    const result = await api.get('/streaming-engine/processors')
    return Array.isArray(result?.processors) ? result.processors : []
  },

  async listPipelines() {
    const result = await api.get('/streaming-engine/pipelines')
    return Array.isArray(result?.pipelines) ? result.pipelines : []
  },

  async getPipeline(id) {
    return api.get(`/streaming-engine/pipelines/${encodeURIComponent(id)}`)
  },

  async savePipeline(pipeline) {
    const payload = { ...(pipeline || {}) }
    if (payload.id) {
      return api.put(`/streaming-engine/pipelines/${encodeURIComponent(payload.id)}`, payload)
    }
    return api.post('/streaming-engine/pipelines', payload)
  },

  async deletePipeline(id) {
    return api.delete(`/streaming-engine/pipelines/${encodeURIComponent(id)}`)
  },

  async executePipeline(id, input = null) {
    return api.post(`/streaming-engine/pipelines/${encodeURIComponent(id)}/execute`, { input })
  },

  async getExecution(runId) {
    return api.get(`/streaming-engine/executions/${encodeURIComponent(runId)}`, { cache: false })
  },

  async getExecutionHistory(pipelineId) {
    const result = await api.get(`/streaming-engine/pipelines/${encodeURIComponent(pipelineId)}/executions`, { cache: false })
    return Array.isArray(result?.executions) ? result.executions : []
  }
}
