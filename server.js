import express from 'express';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import cors from 'cors';
import { config } from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

config(); // Load .env file

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

// --- Leer el archivo company_data.jsonl y cargarlo en memoria ---
const dataFilePath = path.join(process.cwd(), 'company_data.jsonl');
let companyData = [];

try {
  const lines = fs.readFileSync(dataFilePath, 'utf-8').split('\n').filter(Boolean);
  companyData = lines.map(line => JSON.parse(line));
  console.log('Datos de compañía cargados:', companyData.length, 'registros');
} catch (err) {
  console.error('Error leyendo company_data.jsonl:', err.message);
}

// --- Fin de la simulación de RAG ---

const USERS = [{ username: 'admin', password: 'password' }];

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username && u.password === gordilicious123);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.post('/api/chat', authenticateToken, async (req, res) => {
  const { message } = req.body;
  try {
    // Puedes hacer una búsqueda simple aquí si quieres filtrar la data relevante
    // Por simplicidad, agregamos todo el contenido como contexto
    const context = companyData.map(d => `${d.title}: ${d.content}`).join('\n\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Eres un asistente de una compañía de comida. Usa la siguiente información de contexto para responder preguntas:\n\n${context}` },
        { role: "user", content: message }
      ]
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

export { app };