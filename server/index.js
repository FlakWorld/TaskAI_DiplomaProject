require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Схемы
const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    unique: true,
    required: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  }
});

UserSchema.index({ email: 1 }, { 
  unique: true, 
  collation: { locale: 'en', strength: 2 } 
});

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  date: String,
  time: String,
  status: {
    type: String,
    enum: ["выполнено", "в прогрессе"],
    default: "в прогрессе"
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const User = mongoose.model("User", UserSchema);
const Task = mongoose.model("Task", TaskSchema);

// Middleware для проверки токена
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: "Требуется авторизация" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Неверный токен" });
  }
};

// Регистрация
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email и пароль обязательны" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Пользователь уже существует" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ token });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Ошибка регистрации" });
  }
});

// Логин
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Неверные учетные данные" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Ошибка входа" });
  }
});

// Проверка токена
app.get("/auth", authenticate, (req, res) => {
  res.json({ message: "Authorized", user: req.user });
});

// Задачи
app.post("/tasks", authenticate, async (req, res) => {
  try {
    const { title, date, time, status } = req.body;
    const task = new Task({
      title,
      date,
      time,
      status: status || "в прогрессе",
      userId: req.user.userId
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ error: "Ошибка создания задачи" });
  }
});

app.get("/tasks", authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.userId });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Ошибка получения задач" });
  }
});

app.get("/tasks/:id", authenticate, async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id,
      userId: req.user.userId 
    });
    
    if (!task) return res.status(404).json({ error: "Задача не найдена" });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Ошибка получения задачи" });
  }
});

// Замените текущий PUT endpoint на этот:
app.put("/tasks/:id", authenticate, async (req, res) => {
  try {
    const { title, date, time, status } = req.body;
    
    // Проверяем обязательные поля
    if (!title && !status) {
      return res.status(400).json({ error: "Необходимо указать название или статус задачи" });
    }

    // Создаем объект для обновления только переданных полей
    const updates = {};
    
    if (title) updates.title = title;
    if (date !== undefined) updates.date = date || null;
    if (time !== undefined) updates.time = time || null;
    if (status) {
      if (!["выполнено", "в прогрессе"].includes(status)) {
        return res.status(400).json({ error: "Некорректный статус задачи" });
      }
      updates.status = status;
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      updates,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: "Задача не найдена" });
    }

    res.json(task);
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ error: "Ошибка обновления задачи" });
  }
});

app.delete("/tasks/:id", authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!task) return res.status(404).json({ error: "Задача не найдена" });
    res.json({ message: "Задача удалена" });
  } catch (error) {
    res.status(500).json({ error: "Ошибка удаления" });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});