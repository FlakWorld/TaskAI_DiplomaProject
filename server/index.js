require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const {OAuth2Client} = require('google-auth-library');
const googleClient = new OAuth2Client('221855869276-a3cm74t08419p5c2mvn2q2o6cm072dkh.apps.googleusercontent.com');

const app = express();
app.use(cors());
app.use(express.json());


const transporter = nodemailer.createTransport({
  host: 'smtp.mail.ru',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
  }
});

// Проверка подключения к email
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server ready');
  }
});

// Подключение к MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Обновленная схема пользователя
const UserSchema = new mongoose.Schema({
  name: String,
  surname: String,
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
  // Новые поля для подтверждения email
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
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
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }], // Новое поле для тегов
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const User = mongoose.model("User", UserSchema);
const Task = mongoose.model("Task", TaskSchema);

// Функция отправки email подтверждения
const sendVerificationEmail = async (email, token, name) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: {
      name: 'Task Manager App',
      address: process.env.EMAIL_USER
    },
    to: email,
    subject: 'Подтверждение email адреса',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8BC34A, #6B6F45); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Добро пожаловать в Task Manager!</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #6B6F45; margin-top: 0;">Привет, ${name}! 👋</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Спасибо за регистрацию в нашем приложении! Для завершения регистрации необходимо подтвердить ваш email адрес.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #8BC34A, #6B6F45); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold; 
                      font-size: 16px;
                      display: inline-block;">
              Подтвердить Email
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 20px;">
            Или скопируйте и вставьте эту ссылку в браузер:<br>
            <span style="word-break: break-all;">${verificationUrl}</span>
          </p>
        </div>
        
        <div style="background: #fff; padding: 20px; border-radius: 10px; border-left: 4px solid #8BC34A;">
          <h3 style="color: #6B6F45; margin-top: 0;">Что вас ждет в приложении:</h3>
          <ul style="color: #666; line-height: 1.6;">
            <li>🤖 ИИ-помощник для создания задач</li>
            <li>📱 Синхронизация между устройствами</li>
            <li>⚡ Умные напоминания</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p>Ссылка действительна в течение 24 часов.</p>
          <p>Если вы не регистрировались в нашем приложении, просто проигнорируйте это письмо.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
};

// Middleware для проверки токена
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: "Требуется авторизация" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    // Проверяем подтвержден ли email (только для local регистрации)
    if (user.provider === 'local' && !user.emailVerified) {
      return res.status(401).json({ 
        error: "Email не подтвержден", 
        emailNotVerified: true 
      });
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

// Обновленная регистрация
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
    
    // Генерируем токен подтверждения
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
    
    const user = new User({ 
      email, 
      password: hashedPassword, 
      name, 
      surname,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });
    await user.save();

    // Отправляем email подтверждения
    const emailSent = await sendVerificationEmail(email, verificationToken, name);
    
    if (!emailSent) {
      return res.status(500).json({ 
        error: "Ошибка отправки email подтверждения. Попробуйте позже." 
      });
    }

    res.status(201).json({ 
      message: "Регистрация почти завершена! Проверьте свою почту для подтверждения email.",
      emailSent: true 
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Ошибка регистрации" });
  }
});

// Подтверждение email
app.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: "Токен подтверждения не предоставлен" });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        error: "Неверный или истекший токен подтверждения" 
      });
    }

    // Подтверждаем email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Создаем JWT токен для авторизации
    const authToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      message: "Email успешно подтвержден!",
      token: authToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        provider: user.provider
      }
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ error: "Ошибка подтверждения email" });
  }
});

// Повторная отправка подтверждения
app.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email обязателен" });
    }

    const user = await User.findOne({ email, emailVerified: false });
    
    if (!user) {
      return res.status(400).json({ 
        error: "Пользователь не найден или email уже подтвержден" 
      });
    }

    // Генерируем новый токен
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Отправляем email
    const emailSent = await sendVerificationEmail(email, verificationToken, user.name);
    
    if (!emailSent) {
      return res.status(500).json({ 
        error: "Ошибка отправки email. Попробуйте позже." 
      });
    }

    res.json({ 
      message: "Письмо с подтверждением отправлено повторно",
      emailSent: true 
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Ошибка повторной отправки" });
  }
});

// Обновленный логин
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Неверные учетные данные" });
    }

    // Проверяем подтвержден ли email
    if (!user.emailVerified) {
      return res.status(401).json({ 
        error: "Email не подтвержден. Проверьте свою почту.",
        emailNotVerified: true
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
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

// Google Auth (OAuth пользователи автоматически верифицированы)
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

    let user = await User.findOne({
      $or: [{ email }, { googleId }]
    });

    if (!user) {
      user = new User({
        name,
        email,
        googleId,
        provider: 'google',
        emailVerified: true // Google аккаунты автоматически верифицированы
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.provider = 'google';
      user.emailVerified = true;
    }

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, provider: user.provider },
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

// Microsoft Auth (OAuth пользователи автоматически верифицированы)
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
      $or: [{ email }, { microsoftId }]
    });

    if (!user) {
      console.log('Creating new Microsoft user');
      user = new User({
        name,
        email,
        microsoftId,
        provider: 'microsoft',
        emailVerified: true // Microsoft аккаунты автоматически верифицированы
      });
    } else if (!user.microsoftId) {
      console.log('Updating existing user with Microsoft ID');
      user.microsoftId = microsoftId;
      user.provider = 'microsoft';
      user.emailVerified = true;
    }

    await user.save();
    console.log('User saved successfully:', user._id);

    const token = jwt.sign(
      { userId: user._id, email: user.email, provider: user.provider },
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

// Все остальные эндпоинты остаются без изменений...
app.post("/tasks", authenticate, async (req, res) => {
  try {
    const { title, date, time, status, tags } = req.body;
    const task = new Task({
      title,
      date,
      time,
      status: status || "в прогрессе",
      tags: tags || [], // Добавляем теги
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

app.put("/tasks/:id", authenticate, async (req, res) => {
  try {
    const { title, date, time, status, tags } = req.body;
    
    if (!title && !status && !tags) {
      return res.status(400).json({ error: "Необходимо указать данные для обновления" });
    }

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
    if (tags !== undefined) updates.tags = tags; // Добавляем обновление тегов

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});