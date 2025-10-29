import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

import { supabase } from "../lib/supabase/client";
import { generateEmbedding } from "../lib/embeddings/openai";

/**
 * Add test data with embeddings to test the chatbot
 */
async function addTestData() {
  console.log("Adding test data to Supabase...");

  // Test pages content
  const testPages = [
    {
      page_id: "test-project-setup",
      title: "프로젝트 설정 가이드",
      url: "https://notion.so/test-project-setup",
      content: `
프로젝트 설정 방법을 알아보겠습니다.

## Next.js 프로젝트 설정
Next.js 15를 사용하여 프로젝트를 설정합니다. TypeScript와 App Router를 사용합니다.

## 환경 변수 설정
.env.local 파일에 다음 환경 변수를 설정해야 합니다:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NOTION_API_KEY
- OPENAI_API_KEY

## 설치 및 실행
\`\`\`bash
pnpm install
pnpm dev
\`\`\`

이 명령어를 실행하면 http://localhost:3000에서 애플리케이션이 실행됩니다.
      `,
    },
    {
      page_id: "test-api-docs",
      title: "API 문서",
      url: "https://notion.so/test-api-docs",
      content: `
## API 엔드포인트

### 1. 챗봇 API
\`\`\`bash
POST /api/chat
{
  "query": "질문 내용"
}
\`\`\`

### 2. 동기화 API
\`\`\`bash
POST /api/sync
GET /api/sync
\`\`\`

### 3. 인증 체크
\`\`\`bash
GET /api/auth/check
\`\`\`
      `,
    },
    {
      page_id: "test-getting-started",
      title: "시작하기",
      url: "https://notion.so/test-getting-started",
      content: `
시작하기 가이드입니다.

## 빠른 시작
1. 환경 변수 설정
2. Supabase 연결
3. Notion API 키 발급
4. 개발 서버 실행

\`\`\`bash
git clone <repository>
cd notion-rag
pnpm install
cp .env.example .env.local
# .env.local 편집
pnpm dev
\`\`\`

이제 http://localhost:3000에서 애플리케이션을 확인할 수 있습니다.
      `,
    },
  ];

  // Add pages and blocks
  for (const page of testPages) {
    // First, add/update page
    const { error: pageError } = await supabase.from("notion_pages").upsert({
      page_id: page.page_id,
      title: page.title,
      url: page.url,
      last_edited_time: new Date().toISOString(),
      synced_at: new Date().toISOString(),
    });

    if (pageError) {
      console.error(`Error saving page ${page.page_id}:`, pageError);
      continue;
    }

    // Generate embedding for content
    console.log(`Generating embedding for: ${page.title}...`);
    const embedding = await generateEmbedding(page.content);

    // Save to notion_blocks with embedding (upsert to update existing)
    const { error } = await supabase.from("notion_blocks").upsert(
      {
        page_id: page.page_id,
        block_id: `${page.page_id}-main-block`,
        block_type: "paragraph",
        content: page.content,
        embedding: embedding,
        metadata: {
          title: page.title,
          block_type: "main",
        },
      },
      {
        onConflict: "page_id,block_id",
      }
    );

    if (error) {
      console.error(`Error saving block for ${page.page_id}:`, error);
    } else {
      console.log(`✓ Added/Updated page with embedding: ${page.title}`);
    }
  }

  console.log("Test data added successfully!");
}

addTestData().catch(console.error);
