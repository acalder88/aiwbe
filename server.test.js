import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Importa el servidor Express exportando app en server.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { config } from 'dotenv';
import OpenAI from 'openai';

// Mock OpenAI para evitar llamadas reales
jest.mock('openai');
const mockCreate = jest.fn().mockResolvedValue({
  choices: [{ message: { content: 'Respuesta simulada de OpenAI' } }]
});
OpenAI.mockImplementation(() => ({
  chat: { completions: { create: mockCreate } }
}));

// Carga el server después de mockear OpenAI
let app;
beforeAll(() => {
  // Requiere el archivo después de mockear OpenAI
  app = require('./server').app || require('./server').default;
});

describe('API Endpoints', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign({ username: 'admin' }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
  });

  test('POST /api/login - success', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'password' });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/login - invalid credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('POST /api/chat - unauthorized', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Hola' });
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/chat - success', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: '¿Qué productos ofrecen?' });
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toBe('Respuesta simulada de OpenAI');
  });
});