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
    const paragraphs = $('p')
      .map((_, el) => $(el).text())
      .get()
      .filter((t) => t.trim().length > 40);
    return paragraphs.join(' ');
  } catch (error) {
    throw new Error(`Failed to scrape blog: ${error}`);
  }
}

// --- Helper: Summarize using extractive logic ---
function summarizeText(text: string, topN = 3): string {
  try {
    const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
    const allWords = removeStopwords(
      text.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/)
    );
    const freq: Record<string, number> = {};
    allWords.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
    const scored = sentences.map((s) => {
      const words = removeStopwords(
        s.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/)
      );
      const score = words.reduce((sum, w) => sum + (freq[w] || 0), 0);
      return { sentence: s.trim(), score };
    });
    const top = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map((s) => s.sentence);
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
      text = await scrapeBlogContent(url);
      if (!text || text.length < 100) {
        return NextResponse.json({ error: 'Could not extract enough content from the provided URL.' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Please provide sufficient blog/article text (at least 100 characters) or a valid URL.' }, { status: 400 });
    }

    const summary = summarizeText(text);
    if (!summary || summary.trim().length < 50) {
      return NextResponse.json({ error: 'Could not generate summary' }, { status: 500 });
    }

    // ✅ Translation using your Hugging Face Space
    const HF_SPACE_URL = "https://NOOBBoy69-English_Urdu_translation.hf.space/run/predict";

    let urduSummary = '';
    try {
      const response = await fetch(HF_SPACE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: [summary] }),
      });

      const data = await response.json();
      if (!response.ok || !data.data?.[0]) {
        console.error('HF Space error:', data);
        return NextResponse.json({ error: 'Translation failed or returned invalid result.' }, { status: 502 });
      }

      urduSummary = data.data[0];
    } catch (err) {
      console.error('HF translation error:', err);
      return NextResponse.json({ error: 'Failed to translate to Urdu: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
    }

    // Optional: Save summary and translation
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

    return NextResponse.json({
      summary,
      urduSummary,
      originalLength: text.length,
      summaryLength: summary.length,
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
