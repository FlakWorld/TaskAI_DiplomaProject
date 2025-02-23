require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к MongoDB с проверкой
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Успешное подключение к MongoDB"))
.catch(err => console.error("❌ Ошибка подключения к MongoDB:", err));

// Создаём схему пользователя
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true }, // Указываем, что email должен быть уникальным
  password: String,
});

// Создаем индекс для email в нижнем регистре
UserSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const User = mongoose.model("User", UserSchema);

// Схема задачи
const TaskSchema = new mongoose.Schema({
  title: String,
  date: String,
  time: String,
  status: { type: String, enum: ["выполнено", "в прогрессе"], default: "в прогрессе" },
});
const Task = mongoose.model("Task", TaskSchema);

app.post("/register", async (req, res) => {
  console.log("Запрос на регистрацию:", req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email и пароль обязательны" });
  }

  try {
    // Приводим email к нижнему регистру
    const normalizedEmail = email.toLowerCase();

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "Пользователь с таким email уже существует" });
    }

    // Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем нового пользователя
    const newUser = new User({ email: normalizedEmail, password: hashedPassword });
    await newUser.save();

    console.log("Пользователь создан:", normalizedEmail);
    res.json({ message: "User registered" });
  } catch (error) {
    console.error("Ошибка при регистрации:", error);

    // Обработка ошибки уникальности email
    if (error.code === 11000) {
      return res.status(400).json({ error: "Пользователь с таким email уже существует" });
    }

    res.status(500).json({ error: "Registration failed" });
  }
});

// Логин
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Приводим email к нижнему регистру
  const normalizedEmail = email.toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(400).json({ error: "User not found" });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// Проверка токена
app.get("/auth", (req, res) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    res.json({ message: "Authorized", email: decoded.email });
  });
});

// Создание задачи
app.post("/tasks", async (req, res) => {
  const { title, date, time } = req.body;
  try {
    const newTask = new Task({ title, date, time });
    await newTask.save();
    res.json({ message: "Task created", task: newTask });
  } catch (error) {
    res.status(500).json({ error: "Task creation failed" });
  }
});

// Получение всех задач
app.get("/tasks", async (req, res) => {
  const tasks = await Task.find();
  res.json(tasks);
});

app.get("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// Удаление задачи
app.delete("/tasks/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ error: "Task deletion failed" });
  }
});

// Обновление статуса задачи
app.put("/tasks/:id", async (req, res) => {
  const { status } = req.body;
  if (!["выполнено", "в прогрессе"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ message: "Task updated", task: updatedTask });
  } catch (error) {
    res.status(500).json({ error: "Task update failed" });
  }
});

// Обновление задачи (название, дата, время, статус)
app.put("/tasks/:id/update", async (req, res) => {
  const { id } = req.params;
  const { title, date, time, status } = req.body;

  // Проверяем, что статус допустимый
  if (status && !["выполнено", "в прогрессе"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    // Находим задачу по ID и обновляем её поля
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { title, date, time, status },
      { new: true } // Возвращаем обновленный документ
    );

    if (!updatedTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task updated", task: updatedTask });
  } catch (error) {
    console.error("Ошибка при обновлении задачи:", error);
    res.status(500).json({ error: "Task update failed" });
  }
});

// Запуск сервера
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
