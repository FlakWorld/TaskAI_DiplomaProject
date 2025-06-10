export const API_URL = "http://10.201.1.19:5000";

// КОНСТАНТЫ ДЛЯ СТАТУСОВ ЗАДАЧ (синхронизированы с сервером)
const TASK_STATUSES = {
  IN_PROGRESS: "в прогрессе",
  COMPLETED: "выполнено"
};

// Функция конвертации любого статуса в русский
const normalizeStatus = (status) => {
  if (!status) return TASK_STATUSES.IN_PROGRESS;
  
  // Если уже русский статус - возвращаем как есть
  if (status === TASK_STATUSES.IN_PROGRESS || status === TASK_STATUSES.COMPLETED) {
    return status;
  }
  
  // Конвертируем возможные переводы в русские статусы
  const statusLower = status.toLowerCase();
  
  // Английские варианты
  if (statusLower.includes('completed') || statusLower.includes('done') || statusLower.includes('finished')) {
    return TASK_STATUSES.COMPLETED;
  }
  if (statusLower.includes('progress') || statusLower.includes('pending') || statusLower.includes('active')) {
    return TASK_STATUSES.IN_PROGRESS;
  }
  
  // Казахские варианты (приблизительно)
  if (statusLower.includes('аяқталды') || statusLower.includes('орындалды')) {
    return TASK_STATUSES.COMPLETED;
  }
  if (statusLower.includes('орындалуда') || statusLower.includes('жұмыста')) {
    return TASK_STATUSES.IN_PROGRESS;
  }
  
  // По умолчанию возвращаем "в прогрессе"
  console.warn('🟡 Unknown status converted to default:', status, '→', TASK_STATUSES.IN_PROGRESS);
  return TASK_STATUSES.IN_PROGRESS;
};

// Универсальный обработчик запросов
const makeRequest = async (endpoint, method, body = null, token = null) => {
  const headers = {
    "Content-Type": "application/json",
    ...(token && { "Authorization": token })
  };

  const config = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) })
  };

  try {
    console.log(`🔄 API Request: ${method} ${endpoint}`, body ? { body } : '');
    
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const jsonError = JSON.parse(errorData);
        errorMessage = jsonError.error || errorMessage;
        
        console.error('❌ API Error:', {
          endpoint,
          method,
          status: response.status,
          error: errorMessage,
          receivedStatus: jsonError.receivedStatus,
          allowedStatuses: jsonError.allowedStatuses
        });
        
        // Возвращаем объект с дополнительной информацией для email верификации
        if (jsonError.emailNotVerified) {
          return { 
            error: errorMessage, 
            emailNotVerified: true 
          };
        }
        
        throw new Error(errorMessage);
      } catch (parseError) {
        if (parseError.message !== errorMessage) {
          throw new Error(errorData || errorMessage);
        }
        throw parseError;
      }
    }

    const data = await response.json();
    console.log(`✅ API Success: ${method} ${endpoint}`, data);
    return data;
  } catch (error) {
    console.error(`❌ API Request Failed: ${endpoint}:`, error);
    
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Нет соединения с сервером');
    }
    
    throw error;
  }
};

// Аутентификация
export const register = async (email, password, name, surname) => {
  return makeRequest("/register", "POST", { email, password, name, surname });
};

export const login = async (email, password) => {
  return makeRequest("/login", "POST", { email, password });
};

export const checkAuth = async (token) => {
  return makeRequest("/auth", "GET", null, token);
};

// Новые функции для работы с email подтверждением
export const verifyEmail = async (token) => {
  return makeRequest(`/verify-email?token=${token}`, "GET");
};

export const resendVerification = async (email) => {
  return makeRequest("/resend-verification", "POST", { email });
};

// ИСПРАВЛЕННЫЕ ОПЕРАЦИИ С ЗАДАЧАМИ

// Создание задачи с нормализацией статуса
export const createTask = async (title, date, time, status, tags, token) => {
  try {
    // ВАЖНО: Всегда нормализуем статус к русскому
    const normalizedStatus = normalizeStatus(status);
    
    console.log('📝 Creating task with normalized status:', {
      title,
      date,
      time,
      originalStatus: status,
      normalizedStatus,
      tags
    });

    const taskData = {
      title: title ? title.trim() : '',
      date: date || null,
      time: time || null,
      status: normalizedStatus, // Отправляем нормализованный русский статус
      tags: Array.isArray(tags) ? tags : []
    };

    return await makeRequest("/tasks", "POST", taskData, token);
  } catch (error) {
    console.error('❌ Create task error:', error);
    throw error;
  }
};

export const getTasks = async (token) => {
  try {
    const data = await makeRequest("/tasks", "GET", null, token);
    const tasks = Array.isArray(data) ? data : [];
    console.log(`📋 Retrieved ${tasks.length} tasks`);
    return tasks;
  } catch (error) {
    console.error('❌ Get tasks error:', error);
    throw error;
  }
};

export const getTaskById = async (id, token) => {
  return makeRequest(`/tasks/${id}`, "GET", null, token);
};

export const deleteTask = async (id, token) => {
  try {
    console.log('🗑️ Deleting task:', id);
    return await makeRequest(`/tasks/${id}`, "DELETE", null, token);
  } catch (error) {
    console.error('❌ Delete task error:', error);
    throw error;
  }
};

// Обновление статуса задачи с нормализацией
export const updateTaskStatus = async (id, newStatus, token) => {
  try {
    // ВАЖНО: Нормализуем статус перед отправкой
    const normalizedStatus = normalizeStatus(newStatus);
    
    console.log('🔄 Updating task status:', {
      id,
      originalStatus: newStatus,
      normalizedStatus
    });

    return await makeRequest(
      `/tasks/${id}`,
      "PUT",
      { status: normalizedStatus }, // Отправляем нормализованный статус
      token
    );
  } catch (error) {
    console.error('❌ Update task status error:', error);
    throw error;
  }
};

// Обновление задачи с нормализацией статуса
export const updateTask = async (task, token) => {
  try {
    // Создаем копию задачи и нормализуем статус если он есть
    const updatedTask = { ...task };
    if (updatedTask.status) {
      const originalStatus = updatedTask.status;
      updatedTask.status = normalizeStatus(updatedTask.status);
      
      console.log('🔄 Updating task with normalized status:', {
        id: task._id,
        originalStatus,
        normalizedStatus: updatedTask.status
      });
    }

    return await makeRequest(
      `/tasks/${task._id}`,
      "PUT",
      updatedTask,
      token
    );
  } catch (error) {
    console.error('❌ Update task error:', error);
    throw error;
  }
};

// OAuth аутентификация
export const microsoftAuth = async (name, email, microsoftId) => {
  return makeRequest("/auth/microsoft", "POST", { name, email, microsoftId });
};

export const googleAuth = async (idToken) => {
  return makeRequest("/auth/google", "POST", { idToken });
};

// ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ

// Функция для получения русского статуса (экспортируем для использования в компонентах)
export const getRussianStatus = (status) => {
  return normalizeStatus(status);
};

// Функция проверки валидности статуса
export const isValidStatus = (status) => {
  const normalized = normalizeStatus(status);
  return Object.values(TASK_STATUSES).includes(normalized);
};

// Экспорт констант для использования в компонентах
export { TASK_STATUSES };