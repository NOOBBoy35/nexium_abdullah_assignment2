import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { removeStopwords } from 'stopword';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blog-summariser';
const DB_NAME = 'blog-summariser';

// --- Helper: Scrape blog content ---
async function scrapeBlogContent(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    // Extract only main <p> tags (skip header/footer/nav/aside)
    const paragraphs = $('p')
      .map((_, el) => $(el).text())
      .get()
      .filter((t) => t.trim().length > 40); // skip short/empty
    return paragraphs.join(' ');
  } catch (error) {
    throw new Error(`Failed to scrape blog: ${error}`);
  }
}

// --- Helper: Summarize using extractive logic ---
function summarizeText(text: string, topN = 3): string {
  try {
    // 1. Split into sentences
    const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
    // 2. Tokenize words, remove stopwords
    const allWords = removeStopwords(
      text.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/)
    );
    // 3. Count word frequencies
    const freq: Record<string, number> = {};
    allWords.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
    // 4. Score each sentence
    const scored = sentences.map((s) => {
      const words = removeStopwords(
        s.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/)
      );
      const score = words.reduce((sum, w) => sum + (freq[w] || 0), 0);
      return { sentence: s.trim(), score };
    });
    // 5. Sort and select top N
    const top = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map((s) => s.sentence);
    // 6. Clean and format
    return top.join(' ');
  } catch (error) {
    throw new Error(`Failed to summarize text: ${error}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let text = '';
    let url = '';
    if (typeof body.text === 'string' && body.text.trim().length >= 100) {
      text = body.text.trim();
    } else if (typeof body.url === 'string' && body.url.trim().length > 0) {
      url = body.url.trim();
      // Scrape blog content from URL
      text = await scrapeBlogContent(url);
      if (!text || text.length < 100) {
        return NextResponse.json({ error: 'Could not extract enough content from the provided URL.' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Please provide sufficient blog/article text (at least 100 characters) or a valid URL.' }, { status: 400 });
    }

    // 1. Summarize
    const summary = summarizeText(text);
    if (!summary || summary.trim().length < 50) {
      return NextResponse.json({ error: 'Could not generate summary' }, { status: 500 });
    }

    // 2. Translate
    console.log('Summary to translate:', summary);
    let urduSummary = '';
    // To use a local LibreTranslate server with ngrok for Vercel/cloud, set TRANSLATE_API_URL to your ngrok URL (e.g. https://abc12345.ngrok.io/translate)
    const TRANSLATE_API_URL = process.env.TRANSLATE_API_URL || 'https://libretranslate.com/translate';
    try {
      const response = await fetch(TRANSLATE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          q: summary,
          source: 'en',
          target: 'ur',
          format: 'text',
        }),
      });
      const data = await response.text();
      console.log('LibreTranslate response status:', response.status);
      console.log('LibreTranslate response body:', data);
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(data);
      } catch {
        return NextResponse.json({ error: 'Translation service unavailable or returned invalid response. Please try again later.' }, { status: 502 });
      }
      if (
        !response.ok ||
        !parsed ||
        typeof parsed !== 'object' ||
        parsed === null ||
        !('translatedText' in parsed) ||
        typeof (parsed as { translatedText?: unknown }).translatedText !== 'string'
      ) {
        console.error('LibreTranslate returned error or missing translatedText:', parsed);
        return NextResponse.json({ error: 'Translation service unavailable or returned invalid response. Please try again later.' }, { status: 502 });
      }
      urduSummary = (parsed as { translatedText: string }).translatedText || '';
    } catch (err) {
      console.error('LibreTranslate translation error:', err);
      return NextResponse.json({ error: 'Failed to translate to Urdu: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
    }

    // 3. Save (optional: save with url/text)
    try {
      const client = new MongoClient(MONGODB_URI);
      await client.connect();
      const db = client.db(DB_NAME);
      await db.collection('blogs').insertOne({ url, text, createdAt: new Date() });
      await db.collection('summaries').insertOne({ url, summary, urduSummary, createdAt: new Date() });
      await client.close();
    } catch (error) {
      console.error('MongoDB save error:', error);
    }

    // 4. Return
    return NextResponse.json({ 
      summary, 
      urduSummary,
      originalLength: text.length,
      summaryLength: summary.length
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ 
      error: errorMessage
    }, { status: 500 });
  }
} 