const API_URL = "http://192.168.56.1:5000"; // Заменить на IP сервера

export const register = async (email, password) => {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
};

export const login = async (email, password) => {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
};

export const checkAuth = async (token) => {
  const res = await fetch(`${API_URL}/auth`, {
    method: "GET",
    headers: { Authorization: token },
  });
  return res.json();
};

export const createTask = async (title, date, time, status) => {
  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, date, time, status }),
  });
  return res.json();
};

export const getTasks = async () => {
  const res = await fetch(`${API_URL}/tasks`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

export const getTaskById = async (id) => {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
};

export const deleteTask = async (id) => {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: "DELETE",
  });
  return res.json();
};

export const updateTaskStatus = async (id, status) => {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.json();
};

export const updateTask = async (task) => {
  const res = await fetch(`${API_URL}/tasks/${task._id}/update`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task), // Отправляем всю задачу на сервер
  });
  return res.json();
};