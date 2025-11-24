<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Japan Private Journeys

เว็บแอปพลิเคชันวางแผนท่องเที่ยวญี่ปุ่นแบบพรีเมียมด้วย AI

## ✨ Features

- 🎯 วางแผนทริป 6 ขั้นตอน (ภูมิภาค, วันที่, ผู้เดินทาง, กระเป๋า, ความสนใจ, ความต้องการพิเศษ)
- 🤖 ใช้ Google Gemini AI สร้างแผนการเดินทางส่วนตัว
- 🚗 รองรับบริการรถหลากหลาย (Transfer, Charter 10 ชม., ไม่ใช้รถ)
- 📋 สร้าง Quotation สำหรับส่งให้บริษัทรถ
- 🎨 UI สวยงาม สไตล์พรีเมียม

## 📚 คู่มือเพิ่มเติม

- **🌐 [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md)** - คู่มือ deploy บน Cloudflare Pages แบบละเอียด

---

## 🚀 Run Locally

**Prerequisites:** Node.js 18+ และ npm/yarn

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **ตั้งค่า Environment Variables:**
   
   สร้างไฟล์ `.env.local` ในโฟลเดอร์โปรเจกต์:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   > **หมายเหตุ:** หา API Key ได้ที่ [Google AI Studio](https://ai.google.dev/)

3. **Run development server:**
   ```bash
   npm run dev
   ```
   
   แอปจะรันที่ `http://localhost:3000`

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

## 📦 Deployment

### Deploy บน Vercel (แนะนำ)

1. **Push โค้ดไป GitHub/GitLab/Bitbucket**

2. **Import project ใน Vercel:**
   - ไปที่ [vercel.com](https://vercel.com)
   - คลิก "Add New Project"
   - เลือก repository ของคุณ

3. **ตั้งค่า Environment Variables:**
   - ไปที่ Project Settings → Environment Variables
   - เพิ่ม `GEMINI_API_KEY` = `your_api_key`
   - เลือก Environment: Production, Preview, Development

4. **Deploy:**
   - Vercel จะ deploy อัตโนมัติเมื่อ push code

### Deploy บน Netlify

1. **Push โค้ดไป Git repository**

2. **Import ใน Netlify:**
   - ไปที่ [netlify.com](https://netlify.com)
   - คลิก "Add new site" → "Import an existing project"

3. **ตั้งค่า Build:**
   - Build command: `npm run build`
   - Publish directory: `dist`

4. **ตั้งค่า Environment Variables:**
   - ไปที่ Site settings → Environment variables
   - เพิ่ม `GEMINI_API_KEY`

### Deploy บน Cloudflare Pages (แนะนำสำหรับ Landing Page)

> **📖 ดูคู่มือ Cloudflare แบบละเอียด:** [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md)

1. **Push โค้ดไป Git repository**

2. **ไปที่ Cloudflare Dashboard:**
   - ไปที่ [dash.cloudflare.com](https://dash.cloudflare.com)
   - Workers & Pages → Create application → Pages → Connect to Git

3. **เชื่อมต่อ Git Repository:**
   - เลือก Git provider (GitHub, GitLab, Bitbucket)
   - เลือก repository ของคุณ

4. **ตั้งค่า Build:**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Framework preset: Vite (หรือ None)

5. **ตั้งค่า Environment Variables:**
   - เพิ่ม `GEMINI_API_KEY` ใน Environment Variables
   - เลือก Production, Preview, และ Production

6. **Deploy!**

**ข้อดีของ Cloudflare Pages:**
- ⚡ เร็วมาก (CDN ทั่วโลก)
- 🆓 ฟรี (เหมาะกับ landing page)
- 🔒 Security built-in

### Deploy บนอื่นๆ

- **Railway:** Import Git repo และตั้งค่า env variables
- **Render:** สร้าง Static Site และตั้งค่า build command
- **AWS S3 + CloudFront:** Upload `dist` folder

## 🔒 Security

- ✅ API Key ถูกเก็บไว้ใน backend (serverless function) ไม่ expose ใน frontend
- ✅ ใช้ Vercel/Netlify serverless functions สำหรับ API proxy
- ✅ CORS headers ถูกตั้งค่าอย่างถูกต้อง

## 📁 Project Structure

```
├── api/                          # Serverless functions (Vercel)
│   └── generate-itinerary.ts    # Backend API endpoint (Vercel)
├── functions/                    # Cloudflare Pages Functions
│   ├── api/
│   │   └── generate-itinerary.ts # Backend API endpoint (Cloudflare)
│   └── _middleware.ts           # Middleware สำหรับ CORS
├── components/                   # React components
│   ├── PlanningWizard.tsx       # Multi-step form wizard
│   ├── ItineraryView.tsx        # Display itinerary
│   └── Icons.tsx                # SVG icons
├── services/                     # API services
│   └── geminiService.ts         # Frontend API client
├── types.ts                      # TypeScript type definitions
├── App.tsx                       # Main app component
├── vite.config.ts                # Vite configuration
├── vercel.json                   # Vercel deployment config
└── wrangler.toml                 # Cloudflare Pages config
```

## 🛠️ Tech Stack

- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS
- **AI:** Google Gemini 2.5 Flash API
- **Deployment:** Vercel / Cloudflare Pages (serverless functions)

## 📝 Notes

- API Key ต้องตั้งค่าใน environment variables ของ hosting platform
- Backend API endpoint อยู่ที่ `/api/generate-itinerary`
- Production build จะ optimize และ minify code อัตโนมัติ

## 🤝 Support

มีปัญหาหรือคำถาม? กรุณาติดต่อทีมพัฒนา

---

**© 2024 Japan Private Journeys. All rights reserved.**
