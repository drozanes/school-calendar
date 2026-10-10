# 📅 School Calendar (לוח אירועים ומבחנים)

A dynamic, responsive, and RTL-optimized school calendar application built with [Next.js](https://nextjs.org), Tailwind CSS, and `date-fns`. 

**Live Site:** [https://school-calendar.vercel.app](https://school-calendar.vercel.app)

## 🌟 Features
- **Google Sheets Integration:** Automatically fetches and parses calendar data (exams and events) directly from a Google Sheet.
- **Advanced Filtering:** Students and teachers can filter the calendar by:
  - **Grade (שכבה):** ט׳, י׳, י״א, י״ב
  - **Class (כיתה):** 1-6
  - **Track (מסלול):** אור עציון, פנמ"צ, תורת עציון
- **Dual Views:** Seamlessly toggle between a full Month view and a focused Week view.
- **Responsive Design:** 
  - **Desktop:** Displays a traditional 7-column calendar grid.
  - **Mobile:** Automatically switches to a clean, vertical list-view for easy reading on smartphones.
- **Hebrew Dates:** Displays the corresponding Hebrew dates alongside the Gregorian dates.
- **High Performance:** Uses Next.js caching to store the Google Sheet response for 5 minutes, ensuring instant load times and zero rate-limiting.

## 🚀 Environment Setup
To run this project locally or deploy it, you must provide the Google Sheets CSV export URL via environment variables.

1. Create a `.env.local` file in the root directory (for local development) or add it to your Vercel Environment Variables (for production).
2. Add your Google Sheets URL:
   ```env
   GOOGLE_SHEETS_URL="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:csv&sheet=YOUR_SHEET_NAME"
   ```

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to see the calendar.

## 🏗️ Architecture
- **Frontend:** React, Next.js (App Router), Tailwind CSS, Lucide Icons.
- **Backend/API:** Next.js Route Handlers (`/api/schedule`) parse the CSV using `csv-parse` and apply custom text-recognition heuristics to categorize events by grade, class, and track.
- **Deployment:** Vercel (Serverless Functions + Global Edge CDN).
