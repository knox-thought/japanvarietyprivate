# 🌐 Cloudflare Pages Deployment Guide

คู่มือการ deploy โปรเจกต์ Japan Private Journeys ไปยัง Cloudflare Pages

## ✅ ข้อดีของ Cloudflare Pages

- 🆓 **ฟรี** - ไม่มีค่าใช้จ่าย (Pages + Workers ฟรี)
- ⚡ **เร็วมาก** - CDN ของ Cloudflare ครอบคลุมทั่วโลก
- 🎯 **เหมาะกับ Landing Page** - เหมาะสมมากสำหรับ static sites
- 🔒 **Security** - มี DDoS protection, SSL อัตโนมัติ
- 🌍 **Custom Domain** - รองรับ custom domain ฟรี

---

## 📋 Prerequisites

1. **Node.js 18+** ติดตั้งแล้ว
2. **Gemini API Key** จาก [Google AI Studio](https://ai.google.dev/)
3. **Git Repository** (GitHub/GitLab/Bitbucket)
4. **Cloudflare Account** (ฟรี - สมัครได้ที่ [cloudflare.com](https://cloudflare.com))

---

## 🚀 Step-by-Step Deployment

### Step 1: เตรียม Code

1. **ตรวจสอบว่าโครงสร้างถูกต้อง:**

```
JVS Private/
├── functions/
│   ├── api/
│   │   └── generate-itinerary.ts  ← Cloudflare Pages Function
│   └── _middleware.ts              ← Middleware สำหรับ CORS
├── dist/                           ← Build output (จะถูกสร้าง)
├── wrangler.toml                   ← Cloudflare config
├── package.json
└── ...
```

2. **Build โปรเจกต์:**

```bash
npm install
npm run build
```

ตรวจสอบว่าโฟลเดอร์ `dist/` ถูกสร้างขึ้น

---

### Step 2: Push ไป Git Repository

```bash
git add .
git commit -m "Add Cloudflare Pages support"
git push origin main
```

**หมายเหตุ:** ต้อง push ไป GitHub/GitLab/Bitbucket ก่อน

---

### Step 3: สร้าง Cloudflare Account

1. ไปที่ [dash.cloudflare.com](https://dash.cloudflare.com)
2. คลิก "Sign Up" (ถ้ายังไม่มี account)
3. ใช้ Email หรือ GitHub/GitLab account

---

### Step 4: Deploy บน Cloudflare Pages

#### วิธีที่ 1: ผ่าน Cloudflare Dashboard (แนะนำ)

1. **ไปที่ Cloudflare Dashboard**
   - คลิก "Workers & Pages" ใน sidebar
   - คลิก "Create application"
   - เลือก "Pages" → "Connect to Git"

2. **เชื่อมต่อ Git Repository:**
   - เลือก Git provider (GitHub, GitLab, หรือ Bitbucket)
   - อนุญาต Cloudflare เข้าถึง repositories
   - เลือก repository ของคุณ

3. **ตั้งค่า Project:**
   - **Project name:** `japan-private-journeys` (หรือชื่อที่คุณต้องการ)
   - **Production branch:** `main` (หรือ `master`)
   - **Framework preset:** None (หรือเลือก "Vite" ถ้ามี)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (default)

4. **ตั้งค่า Environment Variables:**
   - ก่อนคลิก "Save and Deploy" ให้เลื่อนลงหา "Environment variables"
   - คลิก "Add variable"
   - เพิ่ม:
     ```
     Variable name: GEMINI_API_KEY
     Value: your_actual_api_key_here
     ```
   - เลือก Environment: **Production**, **Preview**, และ **Production**
   - คลิก "Save"

5. **Deploy:**
   - คลิก "Save and Deploy"
   - รอ build เสร็จ (ประมาณ 2-3 นาที)

#### วิธีที่ 2: ผ่าน Wrangler CLI

1. **ติดตั้ง Wrangler CLI:**

```bash
npm install -g wrangler
# หรือ
npm install --save-dev wrangler
```

2. **Login Cloudflare:**

```bash
wrangler login
```

3. **Deploy:**

```bash
# Build first
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=japan-private-journeys
```

4. **ตั้งค่า Environment Variables:**

```bash
wrangler pages secret put GEMINI_API_KEY
# จะถาม API key - ใส่แล้วกด Enter
```

---

### Step 5: ตรวจสอบ Deployment

1. **ดู URL:**
   - หลัง deploy เสร็จ คุณจะเห็น URL แบบนี้:
   - `https://japan-private-journeys.pages.dev`
   - หรือ `https://your-project-name.pages.dev`

2. **ทดสอบ API Endpoint:**
   - เปิด Browser ไปที่:
   - `https://your-project.pages.dev/api/generate-itinerary`
   - ควรเห็น error "Method not allowed" (เพราะต้อง POST) ซึ่งแสดงว่า API ทำงาน

3. **ทดสอบแอป:**
   - เปิด URL หลัก
   - ลองสร้างแผนการเดินทาง
   - ตรวจสอบว่าไม่มี error

---

## 🔧 Configuration Files

### `wrangler.toml`

ไฟล์ config สำหรับ Cloudflare (มีอยู่แล้วในโปรเจกต์):

```toml
name = "japan-private-journeys"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"
```

### `functions/api/generate-itinerary.ts`

Cloudflare Pages Function ที่ทำงานเป็น API endpoint:
- อัตโนมัติจะ deploy เป็น `/api/generate-itinerary`
- ใช้ `onRequestPost` สำหรับ POST requests
- Environment variables ผ่าน `env` object

### `functions/_middleware.ts`

Middleware ที่ทำงานทุก request:
- เพิ่ม CORS headers อัตโนมัติ
- ใช้สำหรับ global settings

---

## 🔐 Environment Variables

### ตั้งค่าผ่าน Dashboard:

1. ไปที่ Cloudflare Dashboard
2. Workers & Pages → เลือก Project
3. Settings → Environment Variables
4. เพิ่ม `GEMINI_API_KEY`

### ตั้งค่าผ่าน CLI:

```bash
wrangler pages secret put GEMINI_API_KEY
```

---

## 🆚 เปรียบเทียบ Vercel vs Cloudflare Pages

| Feature | Vercel | Cloudflare Pages |
|---------|--------|------------------|
| **ฟรี** | ✅ (มี limits) | ✅ (ฟรีมากกว่า) |
| **Speed** | เร็ว | เร็วมาก (CDN ดี) |
| **Functions** | ✅ Vercel Functions | ✅ Pages Functions |
| **Custom Domain** | ✅ | ✅ |
| **SSL** | ✅ | ✅ |
| **เหมาะกับ Landing Page** | ✅ | ✅✅ |

**สรุป:** Cloudflare Pages ดีมากสำหรับ landing page และ static sites เพราะ CDN เร็วและฟรี

---

## 🐛 Troubleshooting

### ปัญหา: API 404 Error

**แก้ไข:**
1. ตรวจสอบว่าไฟล์ `functions/api/generate-itinerary.ts` มีอยู่
2. ตรวจสอบว่าไฟล์ export `onRequestPost` function
3. Redeploy

### ปัญหา: API Key Not Configured

**แก้ไข:**
1. ไปที่ Cloudflare Dashboard
2. Workers & Pages → Project → Settings → Environment Variables
3. ตรวจสอบว่า `GEMINI_API_KEY` มีอยู่
4. **Important:** หลังจากเพิ่ม env var ต้อง redeploy!

### ปัญหา: Build Fails

**แก้ไข:**
1. ดู Build Logs ใน Cloudflare Dashboard
2. ทดสอบ build local: `npm run build`
3. ตรวจสอบ dependencies ใน `package.json`

### ปัญหา: CORS Error

**แก้ไข:**
- `functions/_middleware.ts` ควรจัดการ CORS แล้ว
- ตรวจสอบว่า middleware ถูก deploy

---

## 📝 การ Update Code

### Auto Deploy:

Cloudflare Pages จะ auto-deploy เมื่อคุณ push code ไป Git:

```bash
git add .
git commit -m "Update code"
git push origin main
```

### Manual Deploy:

```bash
npm run build
wrangler pages deploy dist --project-name=japan-private-journeys
```

---

## 🌍 Custom Domain

### เพิ่ม Custom Domain:

1. ไปที่ Cloudflare Dashboard
2. Workers & Pages → Project → Custom domains
3. คลิก "Set up a custom domain"
4. ใส่ domain ของคุณ
5. ตั้งค่า DNS records ตามที่ Cloudflare บอก

---

## ✅ Checklist

- [ ] Code พร้อมแล้ว (build ได้)
- [ ] Push ไป Git repository
- [ ] สร้าง Cloudflare account
- [ ] Connect Git repository ใน Cloudflare
- [ ] ตั้งค่า Build settings (command, output dir)
- [ ] ตั้งค่า `GEMINI_API_KEY` environment variable
- [ ] Deploy!
- [ ] ทดสอบ API endpoint
- [ ] ทดสอบแอป

---

## 🎉 เสร็จแล้ว!

โปรเจกต์ของคุณตอนนี้รันบน Cloudflare Pages แล้ว!

**ข้อดี:**
- ⚡ เร็วมาก (CDN ทั่วโลก)
- 🆓 ฟรี
- 🔒 ปลอดภัย
- 🌍 Custom domain ได้

---

## 📚 เอกสารเพิ่มเติม

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Pages Functions](https://developers.cloudflare.com/pages/platform/functions/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

---

**Happy Deploying! 🚀**

