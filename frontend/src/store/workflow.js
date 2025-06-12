import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { workflowApi } from '@/api/workflow'
import { trainingApi } from '@/api/training'
import { ElMessage } from 'element-plus'

export const useWorkflowStore = defineStore('workflow', () => {
  // 状态
  const workflows = ref([])
  const currentWorkflow = ref(null)
  const loading = ref(false)
  const createLoading = ref(false)
  const trainTypes = ref([])
  const trainTypeLoading = ref(false)

  // 计算属性
  const trainingWorkflows = computed(() => 
    workflows.value.filter(w => w.status === 'TRAINING')
  )
  
  const completedWorkflows = computed(() => 
    workflows.value.filter(w => w.status === 'COMPLETED')
  )
  
  const isTrainingRunning = computed(() => 
    trainingWorkflows.value.length > 0
  )
  
  const faceSwapWorkflows = computed(() => 
    workflows.value.filter(w => w.type === 'face_swap')
  )
  
  const faceExtractWorkflows = computed(() => 
    workflows.value.filter(w => w.type === 'face_extract')
  )

  // 动作
  const fetchWorkflows = async () => {
    try {
      loading.value = true
      console.log('开始获取工作流数据...')
      const response = await workflowApi.list()
      console.log('API响应:', response)
      
      if (response && response.workflows) {
        workflows.value = response.workflows
        console.log('工作流数据已更新:', response.workflows)
      } else {
        console.warn('API响应结构异常:', response)
        workflows.value = []
      }
    } catch (error) {
      console.error('获取工作流列表失败:', error)
      workflows.value = []
      ElMessage.error(error.message || '获取工作流列表失败')
    } finally {
      loading.value = false
    }
  }

  const createWorkflow = async (workflowData) => {
    try {
      createLoading.value = true
      const response = await workflowApi.create(workflowData)
      
      if (response.success) {
        workflows.value.unshift(response.workflow)
        ElMessage.success('工作流创建成功')
        return response.workflow
      }
      return null
    } catch (error) {
      ElMessage.error(error.message || '创建工作流失败')
      return null
    } finally {
      createLoading.value = false
    }
  }

  const getWorkflow = async (id) => {
    try {
      const response = await workflowApi.get(id)
      currentWorkflow.value = response.workflow
      return response.workflow
    } catch (error) {
      ElMessage.error(error.message || '获取工作流详情失败')
      return null
    }
  }

  const updateWorkflow = async (id, data) => {
    try {
      const response = await workflowApi.update(id, data)
      
      if (response.success) {
        // 更新列表中的工作流
        const index = workflows.value.findIndex(w => w.id === id)
        if (index !== -1) {
          workflows.value[index] = { ...workflows.value[index], ...data }
        }
        
        // 更新当前工作流
        if (currentWorkflow.value && currentWorkflow.value.id === id) {
          currentWorkflow.value = { ...currentWorkflow.value, ...data }
        }
        
        ElMessage.success('工作流更新成功')
        return true
      }
      return false
    } catch (error) {
      ElMessage.error(error.message || '更新工作流失败')
      return false
    }
  }

  const deleteWorkflow = async (id) => {
    try {
      const response = await workflowApi.delete(id)
      
      if (response.success) {
        workflows.value = workflows.value.filter(w => w.id !== id)
        
        if (currentWorkflow.value && currentWorkflow.value.id === id) {
          currentWorkflow.value = null
        }
        
        ElMessage.success('工作流删除成功')
        return true
      }
      return false
    } catch (error) {
      ElMessage.error(error.message || '删除工作流失败')
      return false
    }
  }

  const updateWorkflowStatus = (workflowId, status, phase = null) => {
    // 更新列表中的工作流状态
    const workflow = workflows.value.find(w => w.id === workflowId)
    if (workflow) {
      workflow.status = status
      if (phase) workflow.phase = phase
    }
    
    // 更新当前工作流状态
    if (currentWorkflow.value && currentWorkflow.value.id === workflowId) {
      currentWorkflow.value.status = status
      if (phase) currentWorkflow.value.phase = phase
    }
  }

  const setCurrentWorkflow = (workflow) => {
    currentWorkflow.value = workflow
  }

  const clearCurrentWorkflow = () => {
    currentWorkflow.value = null
  }
  
  // 获取支持的训练类型
  const fetchTrainTypes = async () => {
    try {
      trainTypeLoading.value = true
      const response = await trainingApi.getTypes()
      
      if (response && response.success) {
        trainTypes.value = response.types
        return response.types
      }
      return []
    } catch (error) {
      console.error('获取训练类型失败:', error)
      ElMessage.error(error.message || '获取训练类型失败')
      return []
    } finally {
      trainTypeLoading.value = false
    }
  }
  
  // 验证工作流素材是否符合训练类型要求
  const validateWorkflowMaterials = async (workflowId, type) => {
    try {
      const response = await trainingApi.validateMaterials(workflowId, type)
      return response.validation
    } catch (error) {
      console.error('验证素材失败:', error)
      ElMessage.error(error.message || '验证素材失败')
      return { valid: false, message: error.message || '验证素材失败' }
    }
  }
  
  // 根据训练类型获取素材要求
  const getTrainingRequirements = async (type) => {
    try {
      const response = await trainingApi.getRequirements(type)
      return response.requirements
    } catch (error) {
      console.error('获取训练要求失败:', error)
      ElMessage.error(error.message || '获取训练要求失败')
      return null
    }
  }

  return {
    // 状态
    workflows,
    currentWorkflow,
    loading,
    createLoading,
    trainTypes,
    trainTypeLoading,
    
    // 计算属性
    trainingWorkflows,
    completedWorkflows,
    isTrainingRunning,
    faceSwapWorkflows,
    faceExtractWorkflows,
    
    // 动作
    fetchWorkflows,
    createWorkflow,
    getWorkflow,
    updateWorkflow,
    deleteWorkflow,
    updateWorkflowStatus,
    setCurrentWorkflow,
    clearCurrentWorkflow,
    fetchTrainTypes,
    validateWorkflowMaterials,
    getTrainingRequirements
  }
}) 