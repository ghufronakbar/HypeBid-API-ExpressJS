import { configDotenv } from 'dotenv';
configDotenv()
import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import cors from 'cors';
import { APP_NAME, PORT, SERVER_URL } from './constant/index.js';

import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';
import prisma from './db/prisma.js';
import { sendWhatsapp } from './config/whatsapp.js';

const app = express();

//PARSE APPLICATION JSON
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(cors());

// ROUTES
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

app.get('/', (req, res) => {
  return res.status(200).json({ status: 200, message: "Hello World" });
})

app.get('/db-test', async (req, res) => {
  try {
    const data = await prisma.user.findMany();
    return res.status(200).json({ status: 200, message: "Success", data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: 500, message: "Internal Server Error", error: error?.message });
  }
});

app.get('/wa-test', async (req, res) => {
  try {
    const user = {
      name: "John Doe",
      phone: "6285156031385"
    }
    const amount = 100000;
    const bank = "BCA";
    const account = "1234567890";
    const withdrawal = {
      withdraws: [
        { id: "12345" }
      ]
    }
    const hundredCharacters = Array(1000).fill('').map(() => String.fromCharCode(Math.floor(Math.random() * (122 - 97 + 1)) + 97)).join('');
    console.log(hundredCharacters.length)
    const msg = `*${APP_NAME}*\n\nHi ${user.name},\nYour disbursement request of ${amount} is pending.\nPlease wait for the confirmation.\n\n*Ref Disbursement ID:* ${withdrawal?.withdraws?.[0]?.id}\n*Amount:* ${amount}\n*Bank:* ${bank}\n*Account:* ${account}\n\nBest regards,\n${APP_NAME}\nThank you!;`
    console.log(msg.length)
    // const response = await sendWhatsapp(user.phone, `*`);
    const response = await sendWhatsapp(user.phone, msg.toString());
    return res.status(200).json({ status: 200, message: "Success", data: response });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: 500, message: "Internal Server Error", error: error?.message });
  }
});

app.listen(PORT, () => {
  console.log(APP_NAME)
  console.log(`⚡️[server]: Server started on port ${PORT} ⚡`);
  console.log(SERVER_URL);
});