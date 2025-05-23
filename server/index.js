require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {OAuth2Client} = require('google-auth-library');
const googleClient = new OAuth2Client('221855869276-a3cm74t08419p5c2mvn2q2o6cm072dkh.apps.googleusercontent.com');

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
  name: String, // Имя пользователя
  surname: String, // Добавляем фамилию
  email: { 
    type: String, 
    unique: true,
    required: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() { return this.provider === 'local'; }
  },
  microsoftId: String,
  googleId: String,
  provider: { type: String, enum: ['local', 'microsoft', 'google'], default: 'local' },
  avatarUrl: String,
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
    
    // Check if user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    req.user = {
      ...decoded,
      provider: user.provider || 'local'
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: "Неверный токен" });
  }
};

// Регистрация
app.post("/register", async (req, res) => {
  try {
    const { email, password, name, surname } = req.body;
    if (!email || !password || !name || !surname) {
      return res.status(400).json({ error: "Email, пароль, имя и фамилия обязательны" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Пользователь уже существует" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name, surname });
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

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name || '',
        surname: user.surname || "",
        avatar: user.avatarUrl || "https://via.placeholder.com/80",
        provider: user.provider
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Ошибка входа" });
  }
});

// Проверка токена
app.get("/auth", authenticate, (req, res) => {
  res.json({ message: "Authorized", user: req.user });
});

app.post('/auth/google', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "ID Token отсутствует" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: '221855869276-6egb238f5i1ivimtrgme6s9nm9bdtad1.apps.googleusercontent.com',
    });

    const payload = ticket.getPayload();

    const { email, name, sub: googleId } = payload;

    if (!email || !googleId) {
      return res.status(400).json({ error: "Некорректные данные пользователя" });
    }

    // Ищем пользователя с googleId или email
    let user = await User.findOne({
      $or: [
        { email },
        { googleId }
      ]
    });

    if (!user) {
      user = new User({
        name,
        email,
        googleId,
        provider: 'google',
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.provider = 'google';
    }

    await user.save();

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        provider: user.provider,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        provider: user.provider,
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: "Ошибка аутентификации Google" });
  }
});

// express route: POST /auth/microsoft
app.post('/auth/microsoft', async (req, res) => {
  console.log('Received Microsoft auth request:', req.body);
  const { name, email, microsoftId } = req.body;

  if (!email || !microsoftId) {
    console.log('Invalid data received:', { email, microsoftId });
    return res.status(400).json({ message: 'Invalid data' });
  }

  try {
    console.log('Searching for user with email:', email);
    let user = await User.findOne({ 
      $or: [
        { email },
        { microsoftId }
      ]
    });

    if (!user) {
      console.log('Creating new Microsoft user');
      user = new User({
        name,
        email,
        microsoftId,
        provider: 'microsoft',
      });
    } else if (!user.microsoftId) {
      console.log('Updating existing user with Microsoft ID');
      user.microsoftId = microsoftId;
      user.provider = 'microsoft';
    }

    await user.save();
    console.log('User saved successfully:', user._id);

    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        provider: user.provider 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Token generated for user:', user._id);
    res.json({ 
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        provider: user.provider
      }
    });
  } catch (err) {
    console.error('Microsoft Auth Error:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message,
      stack: err.stack 
    });
  }
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

// PUT /user/profile
app.put("/user/profile", authenticate, async (req, res) => {
  try {
    const { name, surname, avatarUrl } = req.body;
    const updates = {};

    if (typeof name === "string") updates.name = name.trim();
    if (typeof surname === "string") updates.surname = surname.trim();
    if (typeof avatarUrl === "string" || avatarUrl === null) updates.avatarUrl = avatarUrl;

    const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true });

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json({
      message: "Профиль обновлён",
      user: {
        id: user._id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Ошибка обновления профиля" });
  }
});

// GET /user/profile - вернуть данные пользователя
app.get("/user/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json({
      id: user._id,
      name: user.name || "",
      surname: user.surname || "",
      email: user.email || "",
      avatarUrl: user.avatarUrl || null,
      provider: user.provider,
    });
  } catch (error) {
    console.error("Ошибка получения профиля пользователя:", error);
    res.status(500).json({ error: "Ошибка получения профиля пользователя" });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});