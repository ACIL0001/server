import { env } from './config/env.js';
import { login } from './modules/auth/auth.service.js';
import mongoose from 'mongoose';
import './modules/wilaya/wilaya.model.js';
import './modules/commune/commune.model.js';

await mongoose.connect('mongodb://127.0.0.1:27017/election');

try {
  const loginRes = await login('adminwilaya1@gmail.com', 'Admin123!', '127.0.0.1');
  const token = loginRes.accessToken;

  const res = await fetch('http://localhost:4005/api/results/desk?page=1&limit=20', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const body = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', body);
} catch (e) {
  console.error(e);
}
process.exit(0);
