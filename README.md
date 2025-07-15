# Blog Summariser with Urdu Translation

A 3D web application that scrapes blog content, generates summaries using traditional NLP logic, and translates them to Urdu using dictionary-based translation.

## 🚀 Features

- **3D Interactive Interface**: Built with Three.js for an immersive experience
- **Blog Content Scraping**: Extracts readable content from any blog URL
- **AI-Free Summarization**: Uses extractive summarization with word frequency analysis
- **Urdu Translation**: Dictionary-based translation with phrase and word matching
- **MongoDB Storage**: Saves blog content and summaries for future reference
- **Real-time Processing**: Live loading animations and status updates

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, Three.js, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB
- **Scraping**: Cheerio, node-fetch
- **NLP**: stopword library for text processing
- **Package Manager**: pnpm

## 📋 Prerequisites

- Node.js LTS v20 or higher
- pnpm (install with `corepack enable && corepack prepare pnpm@latest --activate`)
- MongoDB (local or Atlas)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd assignment-2
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your MongoDB URI:
   ```
   MONGODB_URI=mongodb://localhost:27017/blog-summariser
   # For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/blog-summariser
   ```

4. **Start the development server**
```bash
pnpm dev
```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 How It Works

### 1. Content Scraping
- Extracts text from `<p>` tags in the blog
- Filters out short/empty paragraphs
- Focuses on main content, avoiding headers/footers

### 2. Summarization Logic
- Tokenizes text into sentences and words
- Removes stop words (the, is, are, etc.)
- Calculates word frequency across the document
- Scores sentences based on word frequency
- Selects top 3 highest-scoring sentences

### 3. Urdu Translation
- **Phrase-level matching**: Translates common phrases first
- **Word-level matching**: Translates individual words
- **Longest-match-first**: Ensures accurate phrase translation
- **Fallback**: Leaves untranslated words as-is

### 4. 3D Interface
- Floating glassmorphic input panel
- Animated particle background
- Rotating loading cube during processing
- 3D summary cards with floating animation

## 📊 Database Schema

### Blogs Collection
```json
{
  "url": "string",
  "text": "string", 
  "createdAt": "Date"
}
```

### Summaries Collection
```json
{
  "url": "string",
  "summary": "string",
  "urduSummary": "string",
  "createdAt": "Date"
}
```

## 🎨 Customization

### Adding Translation Dictionaries

1. **Phrases** (`data/phrases.ts`):
   ```typescript
   const phraseDictionary: Record<string, string> = {
     "your phrase": "آپ کا جملہ",
     // Add more phrases
   };
   ```

2. **Words** (`data/words.ts`):
   ```typescript
   const wordDictionary: Record<string, string> = {
     "word": "لفظ",
     // Add more words
   };
   ```

### Modifying Summarization
- Adjust `topN` parameter in `summarizeText()` function
- Modify sentence scoring algorithm
- Change stop word removal logic

## 🚀 Deployment

### Vercel Deployment
1. Push code to GitHub repository: `Nexium_Abdullah_Assignment2`
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Environment Variables for Production
```
MONGODB_URI=your_mongodb_atlas_uri
NEXT_PUBLIC_APP_NAME=Blog Summariser
NEXT_PUBLIC_APP_DESCRIPTION=AI-Powered Blog Summariser with Urdu Translation
```

## 🧪 Testing

Test the application with various blog URLs:
- Tech blogs
- News articles
- Educational content
- Personal blogs

The system works best with:
- Well-structured HTML with `<p>` tags
- English content (for translation)
- Articles with substantial text content

## 🔧 Development

### Project Structure
```
assignment-2/
├── src/
│   ├── app/
│   │   ├── api/summarise/route.ts  # API endpoint
│   │   ├── page.tsx               # Main page
│   │   └── layout.tsx             # App layout
│   └── components/
│       └── ThreeScene.tsx         # 3D scene component
├── data/
│   ├── phrases.ts                 # Urdu phrase dictionary
│   └── words.ts                   # Urdu word dictionary
└── package.json
```

### Available Scripts
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is created for educational purposes as part of Assignment 2.

## 🙏 Acknowledgments

- Three.js for 3D graphics
- Cheerio for HTML parsing
- MongoDB for data storage
- Next.js for the framework
- Tailwind CSS for styling

---

**Note**: This application simulates AI-powered summarization using traditional NLP techniques. No actual AI models or paid APIs are used.
