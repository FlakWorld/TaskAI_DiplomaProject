export const API_URL = "http://192.168.1.11:5000";

// Универсальный обработчик запросов (без изменений в интерфейсе)
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
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    // Проверяем статус ответа перед попыткой парсинга JSON
    if (!response.ok) {
      const errorData = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const jsonError = JSON.parse(errorData);
        errorMessage = jsonError.error || errorMessage;
      } catch {
        errorMessage = errorData || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Ошибка запроса ${endpoint}:`, error);
    
    // Улучшенные сообщения об ошибках
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Нет соединения с сервером');
    }
    
    throw error;
  }
};

// Аутентификация (без изменений)
export const register = async (email, password, name, surname) => {
  return makeRequest("/register", "POST", { email, password, name, surname });
};

export const login = async (email, password) => {
  return makeRequest("/login", "POST", { email, password });
};

export const checkAuth = async (token) => {
  return makeRequest("/auth", "GET", null, token);
};

// Операции с задачами (с сохранением текущего интерфейса)
export const createTask = async (title, date, time, status, token) => {
  return makeRequest(
    "/tasks", 
    "POST", 
    { title, date, time, status }, 
    token
  );
};

export const getTasks = async (token) => {
  const data = await makeRequest("/tasks", "GET", null, token);
  return Array.isArray(data) ? data : [];
};

export const getTaskById = async (id, token) => {
  return makeRequest(`/tasks/${id}`, "GET", null, token);
};

export const deleteTask = async (id, token) => {
  return makeRequest(`/tasks/${id}`, "DELETE", null, token);
};

export const updateTaskStatus = async (id, newStatus, token) => {
  return makeRequest(
    `/tasks/${id}`,
    "PUT",
    { status: newStatus },
    token
  );
};

export const updateTask = async (task, token) => {
  return makeRequest(
    `/tasks/${task._id}`,
    "PUT",
    task,
    token
  );
};

export const microsoftAuth = async (name, email, microsoftId) => {
  return makeRequest("/auth/microsoft", "POST", { name, email, microsoftId });
};